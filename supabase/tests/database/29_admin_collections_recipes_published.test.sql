BEGIN;
SELECT plan(11);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

UPDATE private.collection_workspace_settings SET stage='publication';
-- Recipe 103 (added by collection 1's draft) has not been published yet.
UPDATE public.recipe_catalog SET publication_state='draft' WHERE id='93000000-0000-0000-0000-000000000103';
SELECT pg_temp.collection_make_ready();

CREATE FUNCTION pg_temp.published_check(p_collection uuid DEFAULT '93000000-0000-0000-0000-000000000001') RETURNS jsonb
LANGUAGE sql AS $$
 SELECT c FROM jsonb_array_elements(private.collection_evaluate(p_collection, pg_temp.collection_candidate_id(p_collection))#>'{value,checks}') c
 WHERE c->>'code'='RECIPE_PUBLISHED'
$$;

-- An open collection with a draft recipe cannot be published.
SELECT is(pg_temp.published_check()->>'severity','blocker','an unpublished recipe blocks an open collection');
SELECT is(pg_temp.published_check()->>'scope','synthetic-collection-recipe-3','and names the recipe');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true))$$,
  '42501','ADM_BLOCKED','publication is refused while a recipe is unpublished');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(3,'admin_collection_submit',pg_temp.collection_submit_command())$$,
  '42501','ADM_BLOCKED','and so is submission for review');

-- Publishing the recipe changes the evidence and clears the check.
CREATE TEMP TABLE token_before AS SELECT private.collection_evaluate('93000000-0000-0000-0000-000000000001',
  pg_temp.collection_candidate_id())#>>'{value,token}' t;
UPDATE public.recipe_catalog SET publication_state='published', published_at=now() WHERE id='93000000-0000-0000-0000-000000000103';
SELECT isnt(private.collection_evaluate('93000000-0000-0000-0000-000000000001',pg_temp.collection_candidate_id())#>>'{value,token}',
  (SELECT t FROM token_before),'publishing the recipe makes earlier evidence stale');
SELECT is(pg_temp.published_check(),NULL,'once every recipe is published the check is gone');
-- Publishing changes the recipe's fingerprint, so the draft refreshes its references first.
SELECT pg_temp.collection_make_ready();
CREATE TEMP TABLE pub AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true,
  '93000000-0000-0000-0000-000000000001','[]'::jsonb)) r;
SELECT is((SELECT r->>'noChange' FROM pub),'false','and the collection publishes');

-- Checkout sells only a release whose recipes buyers can read.
UPDATE private.commercial_offers SET sale_enabled=true WHERE id='93000000-0000-0000-0000-000000000021';
SELECT isnt(private.collection_sellable('93000000-0000-0000-0000-000000000001'),NULL,'a fully published release is for sale');
UPDATE public.recipe_catalog SET publication_state='draft' WHERE id='93000000-0000-0000-0000-000000000102';
SELECT is(private.collection_sellable('93000000-0000-0000-0000-000000000001'),NULL,
  'a recipe withdrawn after the sale opened stops new checkouts');
UPDATE public.recipe_catalog SET publication_state='published' WHERE id='93000000-0000-0000-0000-000000000102';

-- A coming-soon collection is not sold, so an unpublished recipe is only a suggestion there.
UPDATE public.recipe_catalog SET publication_state='draft' WHERE id='93000000-0000-0000-0000-000000000101';
SELECT pg_temp.collection_cmd(3,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000002',
  jsonb_build_object('members',pg_temp.collection_snapshot('93000000-0000-0000-0000-000000000002','synthetic-private-draft',
    'Synthetic private draft','unlisted','coming-soon',ARRAY['93000000-0000-0000-0000-000000000101']::uuid[])->'members')));
SELECT pg_temp.collection_make_ready('93000000-0000-0000-0000-000000000002');
SELECT is(pg_temp.published_check('93000000-0000-0000-0000-000000000002')->>'severity','suggestion',
  'a coming-soon collection only warns about an unpublished recipe');
SELECT is((pg_temp.collection_cmd(1,'admin_collection_publish',
  pg_temp.collection_publish_command(true,'93000000-0000-0000-0000-000000000002'))->>'noChange'),'false',
  'and can still be published');

SELECT * FROM finish();
ROLLBACK;
