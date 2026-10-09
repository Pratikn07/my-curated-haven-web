-- Test-only synthetic collections, always used inside a rollback transaction after admin-console.sql.
-- IDs use the 93000000-0000-0000-0000- prefix. Collection 1 is published (imported baseline) with a
-- draft that adds a recipe and one buyer; collection 2 is a private draft with no publication.
INSERT INTO public.recipe_catalog(id,slug,title,public_summary,preview_image_path,total_minutes,publication_state)
SELECT ('93000000-0000-0000-0000-0000000001'||lpad(n::text,2,'0'))::uuid, 'synthetic-collection-recipe-'||n,
 'Synthetic collection recipe '||n, 'Synthetic', 'recipe-previews/synthetic-'||n||'.webp', 10*n, 'draft'
FROM generate_series(1,3) n;
-- Release membership requires an editorially reviewed recipe (collection_recipes_require_review).
INSERT INTO public.recipe_bodies(recipe_id,yield,allergen_review_state,allergens)
SELECT ('93000000-0000-0000-0000-0000000001'||lpad(n::text,2,'0'))::uuid,'2 portions','reviewed_no_allergens','{}'
FROM generate_series(1,3) n;

INSERT INTO public.recipe_collections(id,slug,title,public_summary,listing_state) VALUES
 ('93000000-0000-0000-0000-000000000001','synthetic-published-shelf','Synthetic published shelf','Synthetic','listed'),
 ('93000000-0000-0000-0000-000000000002','synthetic-private-draft','Synthetic private draft','Synthetic','unlisted');

INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES
 ('93000000-0000-0000-0000-000000000011','93000000-0000-0000-0000-000000000001',1,'published');
INSERT INTO public.collection_recipes(release_id,recipe_id,position) VALUES
 ('93000000-0000-0000-0000-000000000011','93000000-0000-0000-0000-000000000101',1),
 ('93000000-0000-0000-0000-000000000011','93000000-0000-0000-0000-000000000102',2);

-- One test-mode offer with sales disabled, and one active buyer (synthetic customer 6).
INSERT INTO private.commercial_offers(id,release_id,provider_account_id,provider_mode,provider_product_id,
 provider_price_id,currency,base_minor_amount,sale_enabled) VALUES
 ('93000000-0000-0000-0000-000000000021','93000000-0000-0000-0000-000000000011','acct_synthetic_collections',
  'test','prod_synthetic_collections','price_synthetic_collections','usd',1500,false);
INSERT INTO public.access_entitlements(user_id,release_id,state) VALUES
 ('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000011','active');

CREATE FUNCTION pg_temp.collection_snapshot(p_id uuid,p_slug text,p_title text,p_listing text,p_availability text,
 p_members uuid[],p_series jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('collectionId',p_id,'slug',p_slug,'title',p_title,'tagline','Synthetic tagline',
  'story','Synthetic story.','forWhen','Synthetic tests','refresh','Synthetic refresh','shelf','mornings',
  'sortOrder',1,'stage',jsonb_build_object('min',6,'max',12),'series',p_series,'listingState',p_listing,
  'availability',p_availability,'cloth','sage','cover',null,
  'members',coalesce((SELECT jsonb_agg(jsonb_build_object('recipeId',m,'recipeSlug',c.slug,'contentVersion',1,
    'reviewDigest',repeat('a',64),'tagsDigest',repeat('b',64),'placementNote','','fit','accepted') ORDER BY o)
   FROM unnest(p_members) WITH ORDINALITY u(m,o) JOIN public.recipe_catalog c ON c.id=m),'[]'::jsonb))
$$;

DO $$
DECLARE
 owner uuid := '92000000-0000-0000-0000-000000000001';
 c1 uuid := '93000000-0000-0000-0000-000000000001';
 c2 uuid := '93000000-0000-0000-0000-000000000002';
 r1 uuid := '93000000-0000-0000-0000-000000000101';
 r2 uuid := '93000000-0000-0000-0000-000000000102';
 r3 uuid := '93000000-0000-0000-0000-000000000103';
 published jsonb := pg_temp.collection_snapshot(c1,'synthetic-published-shelf','Synthetic published shelf','listed','open',
   ARRAY[r1,r2],'{"key":"breakfast","volume":7}'::jsonb);
 draft1 jsonb := pg_temp.collection_snapshot(c1,'synthetic-published-shelf','Synthetic published shelf','listed','open',
   ARRAY[r1,r2,r3],'{"key":"breakfast","volume":7}'::jsonb);
 draft2 jsonb := pg_temp.collection_snapshot(c2,'synthetic-private-draft','Synthetic private draft','unlisted','coming-soon',ARRAY[]::uuid[]);
BEGIN
 IF to_regclass('private.collection_publications') IS NULL THEN RETURN; END IF;
 INSERT INTO private.collection_sources(collection_id,source_mode) VALUES(c1,'database'),(c2,'database');
 INSERT INTO private.collection_publications(id,collection_id,release_id,snapshot,digest,imported,operation_id,executor_id)
 VALUES('93000000-0000-0000-0000-000000000201',c1,'93000000-0000-0000-0000-000000000011',published,
  private.collection_digest(published),true,'93000000-0000-0000-0000-000000000401','synthetic-import');
 INSERT INTO private.collection_active_publications(collection_id,publication_id,series_key,series_volume)
 VALUES(c1,'93000000-0000-0000-0000-000000000201','breakfast',7);
 INSERT INTO public.collection_publication_projection(collection_id,publication_id,release_id,slug,title,tagline,story,
  for_when,refresh,shelf,sort_order,stage_min,stage_max,series_key,series_volume,listing_state,availability,cloth,cover,
  members,published_count,published_at)
 VALUES(c1,'93000000-0000-0000-0000-000000000201','93000000-0000-0000-0000-000000000011','synthetic-published-shelf',
  'Synthetic published shelf','Synthetic tagline','Synthetic story.','Synthetic tests','Synthetic refresh','mornings',1,
  6,12,'breakfast',7,'listed','open','sage',null,
  jsonb_build_array(jsonb_build_object('recipeId',r1,'position',1),jsonb_build_object('recipeId',r2,'position',2)),2,now());
 INSERT INTO private.collection_revisions(id,collection_id,version,snapshot,digest,base_publication_id,base_digest,
  saved_by,executor_id,executor_type,operation_id,reason)
 VALUES('93000000-0000-0000-0000-000000000301',c1,1,draft1,private.collection_digest(draft1),
   '93000000-0000-0000-0000-000000000201',private.collection_digest(published),owner,owner::text,'human',
   '93000000-0000-0000-0000-000000000402','Synthetic addition'),
  ('93000000-0000-0000-0000-000000000302',c2,1,draft2,private.collection_digest(draft2),null,
   private.collection_digest('{}'::jsonb),owner,owner::text,'human','93000000-0000-0000-0000-000000000403','Synthetic new collection');
 INSERT INTO private.collection_draft_heads(collection_id,revision_id,version,state) VALUES
  (c1,'93000000-0000-0000-0000-000000000301',1,'draft'),(c2,'93000000-0000-0000-0000-000000000302',1,'draft');
 INSERT INTO private.collection_audit(collection_id,action,revision_id,digest,after_ref,operation_id,human_authoriser,
  executor_id,executor_type,reason,result)
 SELECT c1,'collection.save','93000000-0000-0000-0000-000000000301',private.collection_digest(draft1),
  '93000000-0000-0000-0000-000000000301','93000000-0000-0000-0000-000000000402',owner,owner::text,'human',
  'Synthetic event '||n,'success' FROM generate_series(1,27) n;
END $$;

-- Command helpers (Task 6+). Synthetic staff n maps to 92000000-0000-0000-0000-00000000000n.
CREATE FUNCTION pg_temp.collection_head_snapshot(p_collection uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT r.snapshot FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id
 WHERE h.collection_id=p_collection
$$;

-- A save command for the collection's current head with p_patch merged into its snapshot.
CREATE FUNCTION pg_temp.collection_save_command(
  p_collection uuid DEFAULT '93000000-0000-0000-0000-000000000001', p_patch jsonb DEFAULT '{"title":"Private title"}')
RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('collection_id',p_collection,'operation_id',gen_random_uuid(),'reason','Synthetic save',
  'expected_version',h.version,'expected_digest',r.digest,
  'base',jsonb_build_object('publication_id',r.base_publication_id,'digest',r.base_digest),
  'snapshot',r.snapshot || p_patch,'reopen_reviewed',false)
 FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id
 WHERE h.collection_id=p_collection
$$;

-- Run a collection command as synthetic staff member p_user with aal2.
CREATE FUNCTION pg_temp.collection_cmd(p_user int, p_function text, p_command jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pg_temp.admin_claims(('92000000-0000-0000-0000-'||lpad(p_user::text,12,'0'))::uuid,'aal2');
 SET LOCAL ROLE authenticated;
 EXECUTE format('SELECT public.%I($1)', p_function) USING p_command INTO result;
 RESET ROLE;
 RETURN result;
END $$;

-- Task 8+: the current draft revision of a collection, and its impact as synthetic staff p_user.
CREATE FUNCTION pg_temp.collection_candidate_id(p_collection uuid DEFAULT '93000000-0000-0000-0000-000000000001') RETURNS uuid
LANGUAGE sql AS $$ SELECT revision_id FROM private.collection_draft_heads WHERE collection_id=p_collection $$;

CREATE FUNCTION pg_temp.collection_impact_as(p_user int, p_collection uuid, p_revision uuid) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pg_temp.admin_claims(('92000000-0000-0000-0000-'||lpad(p_user::text,12,'0'))::uuid,'aal2');
 SET LOCAL ROLE authenticated;
 result := public.admin_collection_impact(p_collection, p_revision);
 RESET ROLE;
 RETURN result;
END $$;

-- Members of the collection's head, with references refreshed to each recipe's current version and fit p_fit.
CREATE FUNCTION pg_temp.collection_current_members(p_collection uuid, p_fit text DEFAULT 'accepted') RETURNS jsonb LANGUAGE sql AS $$
 SELECT coalesce(jsonb_agg(m || jsonb_build_object('contentVersion',b.content_version,
   'reviewDigest',private.admin_active_hash(c.id),'fit',p_fit) ORDER BY o),'[]'::jsonb)
 FROM jsonb_array_elements(pg_temp.collection_head_snapshot(p_collection)->'members') WITH ORDINALITY x(m,o)
 JOIN public.recipe_catalog c ON c.id=(m->>'recipeId')::uuid JOIN public.recipe_bodies b ON b.recipe_id=c.id
$$;

-- Task 9: submit and review commands for the collection's current head, with a freshly evaluated token.
CREATE FUNCTION pg_temp.collection_submit_command(p_collection uuid DEFAULT '93000000-0000-0000-0000-000000000001') RETURNS jsonb
LANGUAGE sql AS $$
 SELECT jsonb_build_object('collection_id',p_collection,'operation_id',gen_random_uuid(),'reason','Synthetic submit',
  'revision_id',h.revision_id,'expected_version',h.version,'expected_digest',r.digest,
  'impact_token',private.collection_evaluate(p_collection,h.revision_id)#>>'{value,token}')
 FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id WHERE h.collection_id=p_collection
$$;
CREATE FUNCTION pg_temp.collection_review_command(p_decision text DEFAULT 'approve',
  p_collection uuid DEFAULT '93000000-0000-0000-0000-000000000001') RETURNS jsonb LANGUAGE sql AS $$
 SELECT pg_temp.collection_submit_command(p_collection) || jsonb_build_object('reason','Synthetic review',
  'submission_id',(SELECT submission_id FROM private.collection_draft_heads WHERE collection_id=p_collection),
  'decision',p_decision,'resolved_issue_ids','[]'::jsonb)
$$;
