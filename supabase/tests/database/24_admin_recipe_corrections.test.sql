BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

-- Recipes: corr-1 is corrected after people buy it; corr-2 was never published; corr-3 is promised by a campaign.
INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path)
SELECT ('97000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid, 'corr-'||n, 'Correction fixture '||n, 'Synthetic',
  'recipe-previews/corr-'||n||'.webp'
FROM generate_series(1,3) n;
INSERT INTO public.recipe_bodies(recipe_id, ingredients, instructions, yield, allergen_review_state, allergens)
SELECT ('97000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid, '[{"item":"Oats","quantity":"1 cup"}]',
  '[{"step":1,"text":"Cook"},{"step":2,"text":"Serve"}]', '2 servings', 'reviewed_listed', '{oats}'
FROM generate_series(1,3) n;
INSERT INTO storage.objects(id, bucket_id, name, version, metadata)
SELECT gen_random_uuid(), 'recipe-previews', 'corr-'||n||'.webp', 'v1', '{}' FROM generate_series(1,3) n;
INSERT INTO private.admin_campaign_snapshots(deployment_revision, configuration, configuration_hash) VALUES
 ('corr-rev-a','{"campaigns":[]}','a'),
 ('corr-rev-b','{"campaigns":[{"slug":"camp-corr","recipeSlugs":["corr-3"]}]}','b');
UPDATE private.admin_console_settings SET campaign_revision='corr-rev-a' WHERE singleton;
UPDATE private.collection_workspace_settings SET stage='publication';

-- Start (or continue) a recipe draft, save new ingredients, submit, approve and record a fresh asset check.
CREATE FUNCTION pg_temp.approve_change(p_n int, p_ingredients jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid := ('97000000-0000-0000-0000-'||lpad(p_n::text,12,'0'))::uuid; head private.recipe_drafts; cur jsonb; obj uuid;
BEGIN
 PERFORM public.admin_draft_start(rid, gen_random_uuid());
 SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id=rid AND workflow_schema=1
   AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
 cur := private.admin_revision_json(head.current_revision_id);
 PERFORM public.admin_draft_save(jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,'reason','synthetic change',
   'expected_version',head.working_version,'expected_digest',cur->>'digest',
   'base',jsonb_build_object('content_version',head.base_content_version,'active_hash',head.base_active_hash),
   'snapshot',jsonb_set(cur->'snapshot','{body,ingredients}',p_ingredients),'reopen_reviewed',true));
 SELECT * INTO head FROM private.recipe_drafts WHERE id=head.id;
 cur := private.admin_revision_json(head.current_revision_id);
 PERFORM public.admin_revision_submit(jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,
   'reason','synthetic submit','revision_id',head.current_revision_id,'expected_version',head.working_version,
   'expected_digest',cur->>'digest'));
 PERFORM public.admin_revision_review(jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,
   'reason','synthetic approve','revision_id',head.current_revision_id,'expected_version',head.working_version,
   'expected_digest',cur->>'digest','submission_id',(SELECT current_submission_id FROM private.recipe_drafts WHERE id=head.id),
   'decision','approve','resolved_issue_ids','[]'::jsonb));
 SELECT o.id INTO obj FROM storage.objects o WHERE o.bucket_id='recipe-previews' AND o.name='corr-'||p_n||'.webp';
 PERFORM private.admin_record_asset_check(head.current_revision_id, cur->>'digest', 'recipe-previews', 'corr-'||p_n||'.webp',
   obj, 'v1', true, now());
 RETURN head.current_revision_id;
END $$;

-- A publish command for the recipe's current head with fresh impact, optionally as a correction.
CREATE FUNCTION pg_temp.recipe_cmd(p_n int, p_op uuid, p_kind text DEFAULT NULL, p_ack boolean DEFAULT true) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid := ('97000000-0000-0000-0000-'||lpad(p_n::text,12,'0'))::uuid; head private.recipe_drafts; cur jsonb; imp jsonb;
BEGIN
 SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id=rid AND workflow_schema=1
   AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected','published')
   ORDER BY CASE WHEN lifecycle='published' THEN 1 ELSE 0 END LIMIT 1;
 cur := private.admin_revision_json(head.current_revision_id);
 imp := public.admin_recipe_impact(rid);
 RETURN jsonb_build_object('operation_id',p_op,'recipe_id',rid,'reason','Fix the oat quantity',
   'revision_id',head.current_revision_id,'expected_version',head.working_version,'expected_digest',cur->>'digest',
   'base',jsonb_build_object('content_version',head.base_content_version,'active_hash',head.base_active_hash),
   'impact_token',imp->>'impactToken')
  || CASE WHEN p_kind IS NULL THEN '{}'::jsonb
     ELSE jsonb_build_object('correction_kind',p_kind,'acknowledge_global_impact',p_ack) END;
END $$;

CREATE FUNCTION pg_temp.withdraw_cmd(p_n int) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid := ('97000000-0000-0000-0000-'||lpad(p_n::text,12,'0'))::uuid;
BEGIN
 RETURN jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,'reason','Unsafe step',
  'base',jsonb_build_object('content_version',(SELECT content_version FROM public.recipe_bodies WHERE recipe_id=rid),
    'active_hash',private.admin_active_hash(rid)),
  'impact_token',public.admin_recipe_impact(rid)->>'impactToken','emergency',true,'acknowledge_promise_impact',false);
END $$;

CREATE FUNCTION pg_temp.quantity(p_n int) RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT ingredients->0->>'quantity' FROM public.recipe_bodies
 WHERE recipe_id=('97000000-0000-0000-0000-'||lpad(p_n::text,12,'0'))::uuid
$$;

-- Buyer claims without the fixture's owner metadata, so recipe-admin read policies do not apply.
CREATE FUNCTION pg_temp.buyer_claims() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM set_config('request.jwt.claim.sub','92000000-0000-0000-0000-000000000006',true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub','92000000-0000-0000-0000-000000000006','aal','aal1',
  'role','authenticated')::text,true);
END $$;

CREATE FUNCTION pg_temp.member_stale() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(private.collection_evaluate('93000000-0000-0000-0000-000000000001',
   pg_temp.collection_candidate_id())#>'{value,checks}') c
  WHERE c->>'code'='RECIPE_CURRENT' AND c->>'scope'='corr-1' AND c->>'state'='fail')
$$;

-- Publish corr-1 and corr-3 normally while nothing uses them.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM pg_temp.approve_change(1,'[{"item":"Oats","quantity":"1 cup"}]');
 PERFORM public.admin_revision_publish(pg_temp.recipe_cmd(1,gen_random_uuid()));
 PERFORM pg_temp.approve_change(3,'[{"item":"Oats","quantity":"1 cup"}]');
 PERFORM public.admin_revision_publish(pg_temp.recipe_cmd(3,gen_random_uuid()));
END $$;
RESET ROLE;
SELECT is((SELECT array_agg(publication_state ORDER BY slug) FROM public.recipe_catalog WHERE slug IN ('corr-1','corr-3')),
  ARRAY['published','published'],'both recipes start published');

-- People buy them: a sealed release in collection A (corr-1, corr-3) and a live offer in collection B (corr-1).
INSERT INTO public.recipe_collections(id,slug,title,public_summary) VALUES
 ('97000000-0000-0000-0000-0000000000a1','corr-collection-a','Correction collection A','Synthetic'),
 ('97000000-0000-0000-0000-0000000000b1','corr-collection-b','Correction collection B','Synthetic');
INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES
 ('97000000-0000-0000-0000-0000000000a2','97000000-0000-0000-0000-0000000000a1',1,'published'),
 ('97000000-0000-0000-0000-0000000000b2','97000000-0000-0000-0000-0000000000b1',1,'published');
INSERT INTO public.collection_recipes(release_id,recipe_id,position) VALUES
 ('97000000-0000-0000-0000-0000000000a2','97000000-0000-0000-0000-000000000001',1),
 ('97000000-0000-0000-0000-0000000000a2','97000000-0000-0000-0000-000000000003',2),
 ('97000000-0000-0000-0000-0000000000b2','97000000-0000-0000-0000-000000000001',1);
UPDATE public.collection_releases SET state='sealed', sealed_at=now() WHERE id='97000000-0000-0000-0000-0000000000a2';
INSERT INTO private.commercial_offers(id,release_id,provider_account_id,provider_mode,provider_product_id,provider_price_id,
  currency,base_minor_amount,sale_enabled)
VALUES ('97000000-0000-0000-0000-0000000000b3','97000000-0000-0000-0000-0000000000b2','acct_live','live','prod_corr',
  'price_corr','USD',900,true);
INSERT INTO public.access_entitlements(user_id,release_id,state)
VALUES ('92000000-0000-0000-0000-000000000006','97000000-0000-0000-0000-0000000000a2','active');
-- A private collection draft adds corr-1 at its current version.
SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  jsonb_build_object('members',pg_temp.collection_current_members('93000000-0000-0000-0000-000000000001')
   || jsonb_build_array(jsonb_build_object('recipeId','97000000-0000-0000-0000-000000000001','recipeSlug','corr-1',
     'contentVersion',(SELECT content_version FROM public.recipe_bodies WHERE recipe_id='97000000-0000-0000-0000-000000000001'),
     'reviewDigest',private.admin_active_hash('97000000-0000-0000-0000-000000000001'),'tagsDigest',repeat('b',64),
     'placementNote','','fit','accepted')))));
SELECT ok(NOT pg_temp.member_stale(),'the collection draft holds the current corr-1 reference');
UPDATE private.admin_console_settings SET campaign_revision='corr-rev-b' WHERE singleton;
CREATE TEMP TABLE before AS SELECT
 (SELECT content_version FROM public.recipe_bodies WHERE recipe_id='97000000-0000-0000-0000-000000000001') v,
 private.admin_active_hash('97000000-0000-0000-0000-000000000001') h,
 (SELECT count(*) FROM public.collection_recipes WHERE recipe_id='97000000-0000-0000-0000-000000000001') members,
 (SELECT count(*) FROM private.release_manifests) manifests;

-- The reviewed correction: three quarters of a cup, not one cup.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM pg_temp.approve_change(1,'[{"item":"Oats","quantity":"3/4 cup"}]'); END $$;
SELECT throws_ok($$SELECT public.admin_revision_publish(pg_temp.recipe_cmd(1,gen_random_uuid()))$$,'42501','ADM_BLOCKED',
  'ordinary publication still refuses a purchased recipe');
SELECT throws_ok($$SELECT public.admin_recipe_correct(pg_temp.recipe_cmd(1,gen_random_uuid(),'replacement'))$$,'22023','ADM_INVALID',
  'only same-recipe corrections');
SELECT throws_ok($$SELECT public.admin_recipe_correct(pg_temp.recipe_cmd(1,gen_random_uuid(),'same_recipe',false))$$,'22023',
  'ADM_INVALID','the global effect must be acknowledged');
SELECT is((SELECT array_agg(e->>'slug' ORDER BY e->>'slug') FROM jsonb_array_elements(
  public.admin_recipe_correction_impact('97000000-0000-0000-0000-000000000001')->'collections') e),
  ARRAY['corr-collection-a','corr-collection-b','synthetic-published-shelf'],'the impact names every collection using the recipe');
SELECT is((SELECT e#>>'{draft,state}' FROM jsonb_array_elements(
  public.admin_recipe_correction_impact('97000000-0000-0000-0000-000000000001')->'collections') e
  WHERE e->>'slug'='synthetic-published-shelf'),'draft','and the private draft that will need a new review');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002','aal2');
SELECT throws_ok($$SELECT public.admin_recipe_correct(pg_temp.recipe_cmd(1,gen_random_uuid(),'same_recipe'))$$,'42501','ADM_DENIED',
  'viewers cannot correct');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
RESET ROLE;
UPDATE private.admin_console_settings SET campaign_revision='missing-rev' WHERE singleton;
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_recipe_correct(pg_temp.recipe_cmd(1,gen_random_uuid(),'same_recipe'))$$,'42501','ADM_BLOCKED',
  'unknown campaign evidence blocks the correction');
RESET ROLE;
UPDATE private.admin_console_settings SET campaign_revision='corr-rev-b' WHERE singleton;
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE corr AS SELECT pg_temp.recipe_cmd(1,'97000000-0000-0000-0000-0000000000c1','same_recipe') cmd;
SELECT lives_ok($$SELECT public.admin_recipe_correct((SELECT cmd FROM corr))$$,'the exact approved correction updates a purchased recipe');
SELECT is(public.admin_recipe_correct((SELECT cmd FROM corr))->>'operationId','97000000-0000-0000-0000-0000000000c1',
  'a replay returns the committed receipt');
SELECT is((SELECT e->>'action' FROM jsonb_array_elements(public.admin_recipe_operations('97000000-0000-0000-0000-000000000001')) e
  WHERE e->>'operationId'='97000000-0000-0000-0000-0000000000c1'),'recipe.correct',
  'the receipt is listed with the recipe''s publication results');
RESET ROLE;

SELECT is(pg_temp.quantity(1),'3/4 cup','the corrected content is active');
SELECT is((SELECT content_version FROM public.recipe_bodies WHERE recipe_id='97000000-0000-0000-0000-000000000001'),
  (SELECT v+1 FROM before),'as one new version, even after the replay');
SELECT is((SELECT count(*)::int FROM private.recipe_active_archives
  WHERE recipe_id='97000000-0000-0000-0000-000000000001' AND kind='correction'),1,'the previous version is archived once');
SELECT is((SELECT snapshot#>>'{body,ingredients,0,quantity}' FROM private.recipe_active_archives
  WHERE recipe_id='97000000-0000-0000-0000-000000000001' AND kind='correction'),'1 cup','with its complete previous content');
SELECT ok((SELECT reason='Fix the oat quantity' AND human_authoriser='92000000-0000-0000-0000-000000000001'
  AND executor_id='92000000-0000-0000-0000-000000000001' AND jsonb_array_length(affected_releases)=2
  FROM private.recipe_active_archives WHERE recipe_id='97000000-0000-0000-0000-000000000001' AND kind='correction'),
  'and the reason, authoriser, executor and affected releases');
SELECT ok((SELECT before_ref=(SELECT v::text FROM before) AND after_ref=(SELECT (v+1)::text FROM before)
  FROM private.admin_audit WHERE action='recipe.correct' AND recipe_id='97000000-0000-0000-0000-000000000001'),
  'history records the versions before and after');
SELECT is((SELECT count(*) FROM public.collection_recipes WHERE recipe_id='97000000-0000-0000-0000-000000000001'),
  (SELECT members FROM before),'collection membership is unchanged');
SELECT is((SELECT count(*) FROM private.release_manifests),(SELECT manifests FROM before),'no manifest is written');
SELECT ok((SELECT state='sealed' FROM public.collection_releases WHERE id='97000000-0000-0000-0000-0000000000a2')
  AND (SELECT sale_enabled AND base_minor_amount=900 FROM private.commercial_offers WHERE id='97000000-0000-0000-0000-0000000000b3'),
  'releases, sales switches and prices are unchanged');
SELECT ok(pg_temp.member_stale(),'the private collection draft now needs its recipe reference updated');

-- The existing buyer reads the corrected recipe.
SELECT pg_temp.buyer_claims();
SET LOCAL ROLE authenticated;
SELECT is((SELECT ingredients->0->>'quantity' FROM public.recipe_bodies WHERE recipe_id='97000000-0000-0000-0000-000000000001'),
  '3/4 cup','an existing buyer sees the correction');
RESET ROLE;

-- Campaign promises keep their protection; never-published recipes use ordinary publication.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM pg_temp.approve_change(3,'[{"item":"Oats","quantity":"2 cups"}]'); END $$;
SELECT throws_ok($$SELECT public.admin_recipe_correct(pg_temp.recipe_cmd(3,gen_random_uuid(),'same_recipe'))$$,'42501','ADM_BLOCKED',
  'a campaign-promised recipe cannot be corrected past its campaign check');
DO $$ BEGIN PERFORM pg_temp.approve_change(2,'[{"item":"Oats","quantity":"2 cups"}]'); END $$;
SELECT throws_ok($$SELECT public.admin_recipe_correct(pg_temp.recipe_cmd(2,gen_random_uuid(),'same_recipe'))$$,'22023','ADM_INVALID',
  'a never-published recipe is not corrected');

-- A candidate changed after approval is not the approved one.
RESET ROLE;
DO $$
DECLARE head private.recipe_drafts; cur jsonb;
BEGIN
 PERFORM pg_temp.approve_change(1,'[{"item":"Oats","quantity":"2/3 cup"}]');
 SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id='97000000-0000-0000-0000-000000000001' AND workflow_schema=1
   AND lifecycle='approved';
 cur := private.admin_revision_json(head.current_revision_id);
 PERFORM public.admin_draft_save(jsonb_build_object('operation_id',gen_random_uuid(),
   'recipe_id','97000000-0000-0000-0000-000000000001','reason','late edit','expected_version',head.working_version,
   'expected_digest',cur->>'digest','base',jsonb_build_object('content_version',head.base_content_version,
   'active_hash',head.base_active_hash),'snapshot',jsonb_set(cur->'snapshot','{body,ingredients,0,quantity}','"1/2 cup"'),
   'reopen_reviewed',true));
END $$;
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_recipe_correct(pg_temp.recipe_cmd(1,gen_random_uuid(),'same_recipe'))$$,'42501','ADM_BLOCKED',
  'a candidate edited after approval cannot be published as a correction');
RESET ROLE;

-- Emergency withdrawal makes the recipe unavailable; a reviewed correction restores it.
UPDATE private.recipe_drafts SET lifecycle='superseded' WHERE recipe_id='97000000-0000-0000-0000-000000000001' AND lifecycle='draft';
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT is(public.admin_recipe_withdraw(pg_temp.withdraw_cmd(1))->>'publication','withdrawn',
  'the owner can still withdraw it in an emergency');
RESET ROLE;
SELECT is((SELECT publication_state FROM public.recipe_catalog WHERE id='97000000-0000-0000-0000-000000000001'),'withdrawn',
  'the recipe is withdrawn');
SET LOCAL ROLE authenticated;
SELECT pg_temp.buyer_claims();
SELECT is((SELECT count(*)::int FROM public.recipe_bodies WHERE recipe_id='97000000-0000-0000-0000-000000000001'),0,
  'the withdrawn recipe is unavailable to its buyer');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
DO $$ BEGIN PERFORM pg_temp.approve_change(1,'[{"item":"Oats","quantity":"3/4 cup"},{"item":"Water"}]'); END $$;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000005','aal2');
SELECT lives_ok($$SELECT public.admin_recipe_correct(pg_temp.recipe_cmd(1,gen_random_uuid(),'same_recipe'))$$,
  'a publisher restores it through a reviewed correction');
SELECT pg_temp.buyer_claims();
SELECT is((SELECT jsonb_array_length(ingredients) FROM public.recipe_bodies WHERE recipe_id='97000000-0000-0000-0000-000000000001'),2,
  'and the buyer reads the restored, corrected recipe');
RESET ROLE;

SELECT ok(NOT has_function_privilege('authenticated','private.recipe_correct_core(jsonb,jsonb)','EXECUTE'),
  'the shared core is not callable from the browser');

SELECT * FROM finish();
ROLLBACK;
