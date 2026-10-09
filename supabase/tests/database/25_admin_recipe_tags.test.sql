BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql

-- tag-1 is published, then its tags are imported and corrected through review; tag-2 has no body.
INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path)
SELECT ('98000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid, 'tag-'||n, 'Tag fixture '||n, 'Synthetic',
  'recipe-previews/tag-'||n||'.webp'
FROM generate_series(1,2) n;
INSERT INTO public.recipe_bodies(recipe_id, ingredients, instructions, yield, allergen_review_state, allergens)
VALUES ('98000000-0000-0000-0000-000000000001', '[{"item":"Oats"}]', '[{"step":1,"text":"Cook"}]', '2 servings',
  'reviewed_listed', '{oats}');
INSERT INTO storage.objects(id, bucket_id, name, version, metadata)
SELECT gen_random_uuid(), 'recipe-previews', 'tag-'||n||'.webp', 'v1', '{}' FROM generate_series(1,2) n;
INSERT INTO private.admin_campaign_snapshots(deployment_revision, configuration, configuration_hash)
VALUES ('tag-rev','{"campaigns":[]}','t');
UPDATE private.admin_console_settings SET campaign_revision='tag-rev' WHERE singleton;

CREATE FUNCTION pg_temp.tags(p_texture text) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('stage',jsonb_build_array('6-8m','9-12m'),'meal',jsonb_build_array('breakfast'),
  'goal','[]'::jsonb,'practical',jsonb_build_array('freezes'),'free_from',jsonb_build_array('nut-free'),'occasion','[]'::jsonb,
  'texture',p_texture)
$$;

-- Start (or continue) the draft, set one snapshot path, submit, approve and record a fresh asset check.
CREATE FUNCTION pg_temp.approve_set(p_path text[], p_value jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid := '98000000-0000-0000-0000-000000000001'; head private.recipe_drafts; cur jsonb; obj uuid; saved jsonb;
BEGIN
 PERFORM public.admin_draft_start(rid, gen_random_uuid());
 SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id=rid AND workflow_schema=1
   AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
 cur := private.admin_revision_json(head.current_revision_id);
 saved := public.admin_draft_save(jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,'reason','synthetic change',
   'expected_version',head.working_version,'expected_digest',cur->>'digest',
   'base',jsonb_build_object('content_version',head.base_content_version,'active_hash',head.base_active_hash),
   'snapshot',jsonb_set(cur->'snapshot',p_path,p_value),'reopen_reviewed',true));
 SELECT * INTO head FROM private.recipe_drafts WHERE id=head.id;
 cur := private.admin_revision_json(head.current_revision_id);
 PERFORM public.admin_revision_submit(jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,
   'reason','synthetic submit','revision_id',head.current_revision_id,'expected_version',head.working_version,
   'expected_digest',cur->>'digest'));
 PERFORM public.admin_revision_review(jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,
   'reason','synthetic approve','revision_id',head.current_revision_id,'expected_version',head.working_version,
   'expected_digest',cur->>'digest','submission_id',(SELECT current_submission_id FROM private.recipe_drafts WHERE id=head.id),
   'decision','approve','resolved_issue_ids','[]'::jsonb));
 SELECT o.id INTO obj FROM storage.objects o WHERE o.bucket_id='recipe-previews' AND o.name='tag-1.webp';
 PERFORM private.admin_record_asset_check(head.current_revision_id, cur->>'digest', 'recipe-previews', 'tag-1.webp',
   obj, 'v1', true, now());
 RETURN saved;
END $$;

CREATE FUNCTION pg_temp.publish_cmd(p_correction boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid := '98000000-0000-0000-0000-000000000001'; head private.recipe_drafts; cur jsonb;
BEGIN
 SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id=rid AND workflow_schema=1
   AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
 cur := private.admin_revision_json(head.current_revision_id);
 RETURN jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,'reason','Tag change',
   'revision_id',head.current_revision_id,'expected_version',head.working_version,'expected_digest',cur->>'digest',
   'base',jsonb_build_object('content_version',head.base_content_version,'active_hash',head.base_active_hash),
   'impact_token',public.admin_recipe_impact(rid)->>'impactToken')
  || CASE WHEN p_correction THEN '{"correction_kind":"same_recipe","acknowledge_global_impact":true}'::jsonb ELSE '{}'::jsonb END;
END $$;

-- A draft save command that changes nothing but the snapshot's tags.
CREATE FUNCTION pg_temp.save_tags(p_tags jsonb, p_drop boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid := '98000000-0000-0000-0000-000000000001'; head private.recipe_drafts; cur jsonb;
BEGIN
 PERFORM public.admin_draft_start(rid, gen_random_uuid());
 SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id=rid AND workflow_schema=1
   AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
 cur := private.admin_revision_json(head.current_revision_id);
 RETURN jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,'reason','tag edit',
   'expected_version',head.working_version,'expected_digest',cur->>'digest',
   'base',jsonb_build_object('content_version',head.base_content_version,'active_hash',head.base_active_hash),
   'snapshot',CASE WHEN p_drop THEN (cur->'snapshot') - 'tags' ELSE (cur->'snapshot') || jsonb_build_object('tags',p_tags) END,
   'reopen_reviewed',true);
END $$;

-- Publish tag-1 normally, before any tags exist.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM pg_temp.approve_set('{body,yield}','"3 servings"');
 PERFORM public.admin_revision_publish(pg_temp.publish_cmd());
END $$;
RESET ROLE;
SELECT ok(NOT (private.admin_snapshot('98000000-0000-0000-0000-000000000001') ? 'tags'),
  'before the import a recipe snapshot has no tags, so its hashes are unchanged');

-- Vocabulary and validation.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002','aal2');
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE vocab AS SELECT public.admin_recipe_tag_vocabulary() v;
RESET ROLE;
SELECT is((SELECT array_agg(e->>'category' ORDER BY ord) FROM vocab, jsonb_array_elements(v) WITH ORDINALITY x(e,ord)),
  ARRAY['stage','meal','goal','practical','free_from','occasion','texture'],'all seven reviewed categories are offered');
SELECT is((SELECT (e->>'multiple')::boolean FROM vocab, jsonb_array_elements(v) e WHERE e->>'category'='texture'),false,
  'texture holds one value');
SELECT ok(private.recipe_tags_valid(pg_temp.tags('puree')),'known values in every category are valid');
SELECT ok(private.recipe_tags_valid(pg_temp.tags(NULL)),'a single-value category may be empty');
SELECT ok(NOT private.recipe_tags_valid(pg_temp.tags('puree') - 'occasion'),'a missing category is invalid');
SELECT ok(NOT private.recipe_tags_valid(pg_temp.tags('puree') || '{"meal":["brunch"]}'),'an unknown value is invalid');
SELECT ok(NOT private.recipe_tags_valid(pg_temp.tags('puree') || '{"meal":["lunch","lunch"]}'),'a repeated value is invalid');
SELECT ok(NOT private.recipe_tags_valid(pg_temp.tags('puree') || '{"texture":["puree"]}'),'texture is not a list');
SELECT ok(NOT private.recipe_tags_valid(pg_temp.tags('puree') || '{"colour":[]}'),'an unknown category is invalid');

-- Reviewed import.
CREATE TEMP TABLE before_import AS SELECT private.admin_active_hash('98000000-0000-0000-0000-000000000001') h;
SELECT throws_ok($$SELECT private.recipe_tags_import(jsonb_build_object('authoriser','92000000-0000-0000-0000-000000000003',
  'operationId',gen_random_uuid(),'reason','Import tags','recipes','[]'::jsonb))$$,'42501','ADM_DENIED','only the owner authorises an import');
CREATE TEMP TABLE imported AS SELECT private.recipe_tags_import(jsonb_build_object('authoriser','92000000-0000-0000-0000-000000000001',
  'operationId','98000000-0000-0000-0000-0000000000f1','reason','Import reviewed tags','recipes',jsonb_build_array(
   jsonb_build_object('slug','tag-1','tags',pg_temp.tags('puree'),'sourceDigest',repeat('c',64)),
   jsonb_build_object('slug','tag-2','tags',pg_temp.tags('puree'),'sourceDigest',repeat('c',64)),
   jsonb_build_object('slug','missing-recipe','tags',pg_temp.tags('puree'),'sourceDigest',repeat('c',64))))) r;
SELECT is((SELECT r->'imported' FROM imported),'["tag-1"]'::jsonb,'tags are recorded for a recipe with a body');
SELECT is((SELECT jsonb_array_length(r->'skipped') FROM imported),2,'a recipe without a body or a missing slug is skipped');
SELECT is((SELECT provenance||'/'||content_version FROM private.recipe_tag_versions
  WHERE recipe_id='98000000-0000-0000-0000-000000000001'),'import/2','for its current version, as an import');
SELECT is((SELECT count(*)::int FROM private.admin_audit WHERE action='recipe.tags_import'
  AND recipe_id='98000000-0000-0000-0000-000000000001'),1,'with an audit entry');
SELECT isnt(private.admin_active_hash('98000000-0000-0000-0000-000000000001'),(SELECT h FROM before_import),
  'the import changes the active hash, so open drafts must rebase');
SELECT is(private.recipe_tags_import(jsonb_build_object('authoriser','92000000-0000-0000-0000-000000000001',
  'operationId',gen_random_uuid(),'reason','Again','recipes',jsonb_build_array(
   jsonb_build_object('slug','tag-1','tags',pg_temp.tags('puree'),'sourceDigest',repeat('c',64)))))->'unchanged',
  '["tag-1"]'::jsonb,'importing the same tags again changes nothing');
SELECT is(private.recipe_tags_import(jsonb_build_object('authoriser','92000000-0000-0000-0000-000000000001',
  'operationId',gen_random_uuid(),'reason','Different','recipes',jsonb_build_array(
   jsonb_build_object('slug','tag-1','tags',pg_temp.tags('mash'),'sourceDigest',repeat('c',64)))))#>>'{skipped,0,reason}',
  'different-reviewed-tags','different tags are not imported over reviewed ones');
SELECT ok(NOT has_function_privilege('authenticated','private.recipe_tags_import(jsonb)','EXECUTE'),
  'the import is not callable from the browser');
SELECT throws_ok($$UPDATE private.recipe_tag_versions SET tags='{}' WHERE recipe_id='98000000-0000-0000-0000-000000000001'$$,
  '42501','ADM_IMMUTABLE','a version''s tags never change');

-- Tags are part of the reviewed snapshot.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_draft_save(pg_temp.save_tags(NULL,true))$$,'22023','ADM_INVALID',
  'a draft cannot drop the recipe''s tags');
SELECT throws_ok($$SELECT public.admin_draft_save(pg_temp.save_tags(pg_temp.tags('puree') || '{"meal":["brunch"]}'))$$,'22023',
  'ADM_INVALID','a draft cannot add a value outside the vocabulary');
-- An undisplayed category (texture) changes through the ordinary review and publication.
DO $$ BEGIN
 PERFORM pg_temp.approve_set('{tags,texture}','"mash"');
 PERFORM public.admin_revision_publish(pg_temp.publish_cmd());
END $$;
RESET ROLE;
SELECT is((SELECT tags->>'texture'||'/'||provenance FROM private.recipe_tag_versions
  WHERE recipe_id='98000000-0000-0000-0000-000000000001' AND content_version=3),'mash/review',
  'the published version records its reviewed tags');
SELECT is((SELECT tags->>'texture' FROM private.recipe_tag_versions
  WHERE recipe_id='98000000-0000-0000-0000-000000000001' AND content_version=2),'puree',
  'and the earlier version keeps its tags for reproduction');
SELECT is(private.admin_snapshot('98000000-0000-0000-0000-000000000001')#>>'{tags,texture}','mash','the active snapshot carries them');
SELECT is((SELECT recorded_by FROM private.recipe_tag_versions
  WHERE recipe_id='98000000-0000-0000-0000-000000000001' AND content_version=3),'92000000-0000-0000-0000-000000000001'::uuid,
  'with the human who published them');

-- A correction to a purchased recipe carries its reviewed tags and archives the previous ones.
INSERT INTO public.recipe_collections(id,slug,title,public_summary)
VALUES ('98000000-0000-0000-0000-0000000000a1','tag-collection','Tag collection','Synthetic');
INSERT INTO public.collection_releases(id,collection_id,version,state)
VALUES ('98000000-0000-0000-0000-0000000000a2','98000000-0000-0000-0000-0000000000a1',1,'published');
INSERT INTO public.collection_recipes(release_id,recipe_id,position)
VALUES ('98000000-0000-0000-0000-0000000000a2','98000000-0000-0000-0000-000000000001',1);
UPDATE public.collection_releases SET state='sealed', sealed_at=now() WHERE id='98000000-0000-0000-0000-0000000000a2';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM pg_temp.approve_set('{tags,meal}','["breakfast","snack"]');
 PERFORM public.admin_recipe_correct(pg_temp.publish_cmd(true));
END $$;
RESET ROLE;
SELECT is((SELECT tags->'meal' FROM private.recipe_tag_versions
  WHERE recipe_id='98000000-0000-0000-0000-000000000001' AND content_version=4),'["breakfast","snack"]'::jsonb,
  'the corrected version records its tags');
SELECT is((SELECT snapshot#>'{tags,meal}' FROM private.recipe_active_archives
  WHERE recipe_id='98000000-0000-0000-0000-000000000001' AND kind='correction'),'["breakfast"]'::jsonb,
  'the correction archive keeps the previous tags');

SELECT * FROM finish();
ROLLBACK;
