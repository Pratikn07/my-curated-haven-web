BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql

-- Publishable recipes with valid bodies and catalog images.
INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path)
SELECT ('91000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'admin-pub-' || n, 'Publish Fixture ' || n, 'Synthetic', 'recipe-previews/pub-' || n || '.webp'
FROM generate_series(60, 70) n;
INSERT INTO public.recipe_bodies(recipe_id, ingredients, instructions, yield, allergen_review_state, allergens)
SELECT ('91000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '[{"item":"Oats"}]', '[{"step":1,"text":"Cook"},{"step":2,"text":"Serve"}]',
  '2 servings', 'reviewed_listed', '{oats}'
FROM generate_series(60, 69) n;
INSERT INTO storage.objects(id, bucket_id, name, version, metadata)
SELECT gen_random_uuid(), 'recipe-previews', 'pub-' || n || '.webp', 'v1', '{}'
FROM generate_series(60, 70) n;

-- Trusted campaign configuration: only the campaign recipe is sensitive.
INSERT INTO private.admin_campaign_snapshots(deployment_revision, configuration, configuration_hash)
VALUES ('test-rev-1', '{"campaigns": [{"slug": "camp-x", "recipeSlugs": ["admin-pub-69"]}]}', 'hash-1');
UPDATE private.admin_console_settings SET campaign_revision = 'test-rev-1' WHERE singleton;

-- Commercial exposure: sealed (62), live offer (63), pending attempt (64),
-- historical payment (65), test-only activity (66).
INSERT INTO public.recipe_collections(id, slug, title, public_summary) VALUES
  ('92000000-0000-0000-0000-000000000061', 'pub-collection', 'Pub Collection', 'Synthetic');
INSERT INTO public.collection_releases(id, collection_id, version, state) VALUES
  ('93000000-0000-0000-0000-000000000062', '92000000-0000-0000-0000-000000000061', 1, 'published'),
  ('93000000-0000-0000-0000-000000000063', '92000000-0000-0000-0000-000000000061', 2, 'published'),
  ('93000000-0000-0000-0000-000000000064', '92000000-0000-0000-0000-000000000061', 3, 'published'),
  ('93000000-0000-0000-0000-000000000065', '92000000-0000-0000-0000-000000000061', 4, 'published'),
  ('93000000-0000-0000-0000-000000000066', '92000000-0000-0000-0000-000000000061', 5, 'published');
INSERT INTO public.collection_recipes(release_id, recipe_id, position) VALUES
  ('93000000-0000-0000-0000-000000000062', '91000000-0000-0000-0000-000000000062', 1),
  ('93000000-0000-0000-0000-000000000063', '91000000-0000-0000-0000-000000000063', 1),
  ('93000000-0000-0000-0000-000000000064', '91000000-0000-0000-0000-000000000064', 1),
  ('93000000-0000-0000-0000-000000000065', '91000000-0000-0000-0000-000000000065', 1),
  ('93000000-0000-0000-0000-000000000066', '91000000-0000-0000-0000-000000000066', 1);
INSERT INTO private.commercial_offers(id, release_id, provider_account_id, provider_mode, provider_product_id, provider_price_id, currency, base_minor_amount, sale_enabled)
VALUES
  ('94000000-0000-0000-0000-000000000063', '93000000-0000-0000-0000-000000000063', 'acct_live', 'live', 'prod_63', 'price_63', 'USD', 500, true),
  ('94000000-0000-0000-0000-000000000064', '93000000-0000-0000-0000-000000000064', 'acct_live', 'live', 'prod_64', 'price_64', 'USD', 500, false),
  ('94000000-0000-0000-0000-000000000065', '93000000-0000-0000-0000-000000000065', 'acct_live', 'live', 'prod_65', 'price_65', 'USD', 500, false),
  ('94000000-0000-0000-0000-000000000066', '93000000-0000-0000-0000-000000000066', 'acct_test', 'test', 'prod_t', 'price_t', 'USD', 500, true);
INSERT INTO private.purchase_orders(id, support_reference, owner_principal, offer_id, release_id, attempt_state, idempotency_key)
VALUES
  ('95000000-0000-0000-0000-000000000064', 'SUP-64', '92000000-0000-0000-0000-000000000001',
    '94000000-0000-0000-0000-000000000064', '93000000-0000-0000-0000-000000000064', 'open', 'idem-64'),
  ('95000000-0000-0000-0000-000000000065', 'SUP-65', '92000000-0000-0000-0000-000000000001',
    '94000000-0000-0000-0000-000000000065', '93000000-0000-0000-0000-000000000065', 'closed', 'idem-65'),
  ('95000000-0000-0000-0000-000000000066', 'SUP-66', '92000000-0000-0000-0000-000000000001',
    '94000000-0000-0000-0000-000000000066', '93000000-0000-0000-0000-000000000066', 'open', 'idem-66');
INSERT INTO private.provider_payments(order_id, provider_account_id, provider_mode, payment_intent_id, status, captured_amount, currency, paid_at)
VALUES ('95000000-0000-0000-0000-000000000065', 'acct_live', 'live', 'pi_65', 'succeeded', 500, 'USD', now());

-- Full approve pipeline plus state readers. All helpers run elevated; the
-- operation calls in tests run as the claimed session.
CREATE OR REPLACE FUNCTION pg_temp.approve_recipe(p_n int) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rid uuid;
  head private.recipe_drafts;
  cur jsonb;
  start_r jsonb;
  save_r jsonb;
  sub_r jsonb;
  rev_r jsonb;
  obj uuid;
BEGIN
  rid := ('91000000-0000-0000-0000-' || lpad(p_n::text, 12, '0'))::uuid;
  SELECT public.admin_draft_start(rid, gen_random_uuid()) INTO start_r;
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = rid AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  cur := private.admin_revision_json(head.current_revision_id);
  IF cur->'snapshot'->'body' = 'null'::jsonb THEN
    SELECT public.admin_draft_save(jsonb_build_object(
      'operation_id', gen_random_uuid(), 'recipe_id', rid, 'reason', 'complete first body',
      'expected_version', head.working_version, 'expected_digest', cur->>'digest',
      'base', jsonb_build_object('content_version', head.base_content_version,
        'active_hash', head.base_active_hash),
      'snapshot', jsonb_set(cur->'snapshot', '{body}',
        '{"ingredients":[{"item":"Oats"}],"instructions":[{"step":1,"text":"Cook"},{"step":2,"text":"Serve"}],"yield":"2 servings","yieldStructured":null,"reviewedNotes":null,"allergenReviewState":"reviewed_listed","allergens":["oats"],"storageNotes":null}'::jsonb),
      'reopen_reviewed', false)) INTO save_r;
    SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id = rid AND workflow_schema = 1
      AND lifecycle = 'draft';
    cur := private.admin_revision_json(head.current_revision_id);
  END IF;
  SELECT public.admin_revision_submit(jsonb_build_object('operation_id', gen_random_uuid(),
    'recipe_id', rid, 'reason', 'synthetic submit', 'revision_id', head.current_revision_id,
    'expected_version', head.working_version, 'expected_digest', cur->>'digest')) INTO sub_r;
  SELECT public.admin_revision_review(jsonb_build_object('operation_id', gen_random_uuid(),
    'recipe_id', rid, 'reason', 'synthetic approve', 'revision_id', head.current_revision_id,
    'expected_version', head.working_version, 'expected_digest', cur->>'digest',
    'submission_id', (SELECT current_submission_id FROM private.recipe_drafts WHERE id = head.id),
    'decision', 'approve', 'resolved_issue_ids', '[]'::jsonb))
    INTO rev_r;
  SELECT o.id INTO obj FROM storage.objects o WHERE o.bucket_id = 'recipe-previews'
    AND o.name = 'pub-' || p_n || '.webp';
  PERFORM private.admin_record_asset_check(head.current_revision_id, cur->>'digest',
    'recipe-previews', 'pub-' || p_n || '.webp', obj, 'v1', true, now());
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.pub_state(p_n int) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE rid uuid;
BEGIN
  rid := ('91000000-0000-0000-0000-' || lpad(p_n::text, 12, '0'))::uuid;
  RETURN jsonb_build_object(
    'publication', (SELECT publication_state FROM public.recipe_catalog WHERE id = rid),
    'title', (SELECT title FROM public.recipe_catalog WHERE id = rid),
    'body_version', (SELECT content_version FROM public.recipe_bodies WHERE recipe_id = rid),
    'lifecycle', (SELECT lifecycle FROM private.recipe_drafts WHERE recipe_id = rid AND workflow_schema = 1
      ORDER BY CASE WHEN lifecycle IN ('draft','submitted','approved','changes_requested','rejected')
        THEN 0 ELSE 1 END LIMIT 1),
    'archives', (SELECT count(*)::int FROM private.recipe_active_archives WHERE recipe_id = rid),
    'legacy_approvals', (SELECT count(*)::int FROM private.recipe_reviews
      WHERE recipe_id = rid AND admin_revision_id IS NOT NULL),
    'publishes', (SELECT count(*)::int FROM private.admin_audit
      WHERE action = 'recipe.publish' AND recipe_id = rid),
    'emergencies', (SELECT count(*)::int FROM private.admin_audit
      WHERE action = 'recipe.emergency_withdraw' AND recipe_id = rid));
END $$;

CREATE OR REPLACE FUNCTION pg_temp.pub_command(p_n int, p_op uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rid uuid;
  head private.recipe_drafts;
  cur jsonb;
  imp jsonb;
BEGIN
  rid := ('91000000-0000-0000-0000-' || lpad(p_n::text, 12, '0'))::uuid;
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = rid AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected','published')
    ORDER BY CASE WHEN lifecycle = 'published' THEN 1 ELSE 0 END;
  IF head.id IS NULL THEN RAISE EXCEPTION 'no head for %', p_n; END IF;
  cur := private.admin_revision_json(head.current_revision_id);
  imp := public.admin_recipe_impact(rid);
  RETURN jsonb_build_object('operation_id', p_op, 'recipe_id', rid, 'reason', 'synthetic publish',
    'revision_id', head.current_revision_id, 'expected_version', head.working_version,
    'expected_digest', cur->>'digest',
    'base', jsonb_build_object('content_version', head.base_content_version,
      'active_hash', head.base_active_hash),
    'impact_token', imp->>'impactToken');
END $$;

CREATE OR REPLACE FUNCTION pg_temp.withdraw_cmd(p_n int, p_op uuid, p_emergency boolean, p_ack boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rid uuid;
  imp jsonb;
BEGIN
  rid := ('91000000-0000-0000-0000-' || lpad(p_n::text, 12, '0'))::uuid;
  imp := public.admin_recipe_impact(rid);
  RETURN jsonb_build_object('operation_id', p_op, 'recipe_id', rid, 'reason', 'synthetic withdraw',
    'base', jsonb_build_object(
      'content_version', (SELECT content_version FROM public.recipe_bodies WHERE recipe_id = rid),
      'active_hash', private.admin_active_hash(rid)),
    'impact_token', imp->>'impactToken',
    'emergency', p_emergency, 'acknowledge_promise_impact', p_ack);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.drop_checks(p_n int) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  DELETE FROM private.recipe_asset_checks WHERE revision_id IN
    (SELECT id FROM private.recipe_revisions
     WHERE recipe_id = ('91000000-0000-0000-0000-' || lpad(p_n::text, 12, '0'))::uuid);
$$;

CREATE OR REPLACE FUNCTION pg_temp.exact_save_cmd(p_n int, p_op uuid, p_title text, p_reopen boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rid uuid;
  head private.recipe_drafts;
  cur jsonb;
  snap jsonb;
BEGIN
  rid := ('91000000-0000-0000-0000-' || lpad(p_n::text, 12, '0'))::uuid;
  SELECT * INTO head FROM private.recipe_drafts
    WHERE recipe_id = rid AND workflow_schema = 1
      AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  cur := private.admin_revision_json(head.current_revision_id);
  snap := (cur->'snapshot') || jsonb_build_object('catalog',
    ((cur->'snapshot'->'catalog') || jsonb_build_object('title', p_title)));
  RETURN jsonb_build_object('operation_id', p_op, 'recipe_id', rid, 'reason', 'synthetic test',
    'expected_version', head.working_version, 'expected_digest', cur->>'digest',
    'base', jsonb_build_object('content_version', head.base_content_version,
      'active_hash', head.base_active_hash),
    'snapshot', snap, 'reopen_reviewed', p_reopen);
END $$;

SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;

-- Exact approved snapshot publishes atomically.
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(61)$q$, 'approved pipeline 61');
CREATE TEMP TABLE pub_cmd AS
  SELECT pg_temp.pub_command(61, '93000000-0000-0000-0000-000000000201') AS cmd;
GRANT SELECT ON pub_cmd TO authenticated;
SELECT is(((public.admin_revision_publish((SELECT cmd FROM pub_cmd)))->>'publication'),
  'published', 'first publish receipt');
SELECT is((pg_temp.pub_state(61)->>'publication'), 'published', 'catalog published');
SELECT is((pg_temp.pub_state(61)->>'body_version')::int, 2, 'body version bumped once');
SELECT is((pg_temp.pub_state(61)->>'archives')::int, 1, 'pre-image archived');
SELECT is((pg_temp.pub_state(61)->>'legacy_approvals')::int, 1, 'legacy approve appended');
SELECT is((pg_temp.pub_state(61)->>'lifecycle'), 'published', 'head published');

-- Retry same operation produces one outcome; reuse with different input fails.
SELECT is(
  (public.admin_revision_publish((SELECT cmd FROM pub_cmd))->>'digest'),
  (public.admin_revision_publish((SELECT cmd FROM pub_cmd))->>'digest'),
  'identical retry returns one outcome');
SELECT is((pg_temp.pub_state(61)->>'body_version')::int, 2, 'retry adds no version');
SELECT throws_ok($q$SELECT public.admin_revision_publish(jsonb_set((SELECT cmd FROM pub_cmd),
  '{reason}', '"other"'))$q$,
  '22023', 'ADM_INVALID', 'different retry payload rejected');

-- Stale identity cannot publish; changed content needs a new review first.
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(67)$q$, 'approved pipeline 67');
SELECT throws_ok($q$SELECT public.admin_revision_publish(jsonb_set(pg_temp.pub_command(67, gen_random_uuid()),
  '{expected_version}', '0'))$q$,
  'PT409', 'ADM_CONFLICT', 'stale version cannot publish');
SELECT lives_ok($q$SELECT public.admin_draft_save(
  pg_temp.exact_save_cmd(67, gen_random_uuid(), 'Changed 67', true))$q$, 'change after approval saves');
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(67, gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'changed content cannot publish without review');

-- Missing asset evidence blocks; vanished objects block with active intact.
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(68)$q$, 'approved pipeline 68');
RESET ROLE;
UPDATE private.recipe_asset_checks SET object_name = 'pub-61.webp',
  object_id = (SELECT id FROM storage.objects WHERE name = 'pub-61.webp')
WHERE revision_id = (SELECT current_revision_id FROM private.recipe_drafts
  WHERE recipe_id = '91000000-0000-0000-0000-000000000068' AND lifecycle = 'approved');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(68, gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'publication rejects a forged checked object name');
RESET ROLE;
SELECT pg_temp.drop_checks(68);
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(68, gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'missing check cannot publish');
RESET ROLE;
UPDATE storage.objects SET version = 'v2'
  WHERE bucket_id = 'recipe-previews' AND name = 'pub-68.webp';
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(68, gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'replaced object cannot publish');
RESET ROLE;
SELECT is((SELECT title FROM public.recipe_catalog
  WHERE id = '91000000-0000-0000-0000-000000000068'), 'Publish Fixture 68', 'active untouched');
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;

-- Injected fault rolls everything back together.
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(60)$q$, 'approved pipeline 60');
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(70)$q$, 'catalog-only recipe approved');
SELECT is((SELECT count(*)::int FROM public.recipe_bodies
  WHERE recipe_id = '91000000-0000-0000-0000-000000000070'), 0, 'first body remains private before publish');
RESET ROLE;
CREATE FUNCTION pg_temp.fail_publication_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.action = 'recipe.publish' THEN RAISE EXCEPTION 'synthetic publication fault'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER synthetic_publication_fault BEFORE INSERT ON private.admin_audit
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_publication_audit();
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(60, gen_random_uuid()))$q$,
  'P0001', 'synthetic publication fault', 'transaction fault reaches caller');
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(70, gen_random_uuid()))$q$,
  'P0001', 'synthetic publication fault', 'first body publication rolls back on fault');
SELECT is((SELECT title FROM public.recipe_catalog
  WHERE id = '91000000-0000-0000-0000-000000000060'), 'Publish Fixture 60', 'catalog rolled back');
SELECT is((SELECT content_version FROM public.recipe_bodies
  WHERE recipe_id = '91000000-0000-0000-0000-000000000060'), 1, 'body version rolled back');
SELECT is((pg_temp.pub_state(60)->>'archives')::int, 0, 'archive rolled back');
SELECT is((SELECT count(*)::int FROM public.recipe_bodies
  WHERE recipe_id = '91000000-0000-0000-0000-000000000070'), 0, 'first body insert rolled back');
SELECT is((pg_temp.pub_state(70)->>'archives')::int, 0, 'first body archive rolled back');
RESET ROLE;
DROP TRIGGER synthetic_publication_fault ON private.admin_audit;
DROP FUNCTION pg_temp.fail_publication_audit();
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE first_body_cmd AS
  SELECT pg_temp.pub_command(70, '93000000-0000-0000-0000-000000000270') AS cmd;
GRANT SELECT ON first_body_cmd TO authenticated;
SELECT lives_ok($q$SELECT public.admin_revision_publish((SELECT cmd FROM first_body_cmd))$q$,
  'first body publishes after fault removed');
SELECT is((pg_temp.pub_state(70)->>'body_version')::int, 1, 'first body starts at version one');
SELECT is((pg_temp.pub_state(70)->>'archives')::int, 1, 'first publish has one archive');
SELECT is((pg_temp.pub_state(70)->>'publishes')::int, 1, 'first publish has one audit');
SELECT is((pg_temp.pub_state(70)->>'legacy_approvals')::int, 1, 'first publish has one review record');
SELECT lives_ok($q$SELECT public.admin_revision_publish((SELECT cmd FROM first_body_cmd))$q$,
  'same operation replays its receipt');
SELECT is((pg_temp.pub_state(70)->>'body_version')::int, 1, 'receipt retry does not advance first body');
RESET ROLE;

-- Commercial and sealed boundaries block ordinary publication.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(62)$q$, 'approved pipeline 62');
SELECT lives_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(62, gen_random_uuid()))$q$,
  'open member publishes');
RESET ROLE;
UPDATE public.collection_releases SET state = 'sealed', sealed_at = now()
  WHERE id = '93000000-0000-0000-0000-000000000062';
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(62)$q$, 're-approved pipeline 62');
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(62, gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'sealed member cannot publish');
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(63)$q$, 'approved pipeline 63');
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(63, gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'live offer cannot publish');
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(64)$q$, 'approved pipeline 64');
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(64, gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'pending attempt cannot publish');
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(65)$q$, 'approved pipeline 65');
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(65, gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'historical payment cannot publish');
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(66)$q$, 'approved pipeline 66');
SELECT lives_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(66, gen_random_uuid()))$q$,
  'test-only activity publishes');
SELECT lives_ok($q$SELECT pg_temp.approve_recipe(69)$q$, 'approved pipeline 69');
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(69, gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'campaign recipe cannot publish without release');
RESET ROLE;

-- Missing trusted campaign configuration blocks publication.
DELETE FROM private.admin_campaign_snapshots WHERE deployment_revision = 'test-rev-1';
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_revision_publish(pg_temp.pub_command(60, gen_random_uuid()))$q$,
  '42501', 'ADM_BLOCKED', 'missing snapshot blocks publication');
RESET ROLE;
INSERT INTO private.admin_campaign_snapshots(deployment_revision, configuration, configuration_hash)
VALUES ('test-rev-1', '{"campaigns": [{"slug": "camp-x", "recipeSlugs": ["admin-pub-69"]}]}', 'hash-1');

-- Ordinary withdrawal of an unprotected published recipe.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT lives_ok($q$SELECT public.admin_recipe_withdraw(
  pg_temp.withdraw_cmd(66, gen_random_uuid(), false, false))$q$, 'ordinary withdraw');
SELECT is((SELECT publication_state FROM public.recipe_catalog
  WHERE id = '91000000-0000-0000-0000-000000000066'), 'withdrawn', 'state withdrawn');
SELECT is((SELECT content_version FROM public.recipe_bodies
  WHERE recipe_id = '91000000-0000-0000-0000-000000000066'), 2, 'withdraw preserves version');
RESET ROLE;

-- A campaign reference alone governs withdrawal, even without a free slot.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT lives_ok($q$SELECT public.admin_staff_assign('92000000-0000-0000-0000-000000000005',
  ARRAY['publisher'], 'synthetic publisher', '93000000-0000-0000-0000-000000000202')$q$, 'publisher assigned');
RESET ROLE;
INSERT INTO private.admin_campaign_snapshots(deployment_revision, configuration, configuration_hash)
VALUES ('test-rev-2', '{"campaigns":[{"slug":"named-promise","status":"published","recipes":[{"slug":"admin-pub-61"}]}]}', 'hash-2'),
  ('test-rev-3', '{"campaigns":[{"slug":"named-promise","status":"published","recipes":[{"slug":"admin-pub-61"}]}]}', 'hash-3');
UPDATE private.admin_console_settings SET campaign_revision = 'test-rev-2' WHERE singleton;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is((public.admin_recipe_usage('91000000-0000-0000-0000-000000000061')->'campaigns'->0->>'slug'),
  'named-promise', 'campaign-only recipe names its published promise');
SELECT is(jsonb_array_length(public.admin_recipe_usage('91000000-0000-0000-0000-000000000061')->'freeSlots'),
  0, 'campaign-only fixture has no free slot');
CREATE TEMP TABLE campaign_withdraw_cmd AS
  SELECT pg_temp.withdraw_cmd(61, '93000000-0000-0000-0000-000000000261', false, false) AS cmd;
GRANT SELECT ON campaign_withdraw_cmd TO authenticated;
SELECT throws_ok($q$SELECT public.admin_recipe_withdraw((SELECT cmd FROM campaign_withdraw_cmd))$q$,
  '42501', 'ADM_BLOCKED', 'owner must acknowledge campaign promise');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000005', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_recipe_withdraw((SELECT cmd FROM campaign_withdraw_cmd))$q$,
  '42501', 'ADM_BLOCKED', 'publisher cannot withdraw a campaign promise');
RESET ROLE;
UPDATE private.admin_console_settings SET campaign_revision = 'test-rev-3' WHERE singleton;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_recipe_withdraw(jsonb_set(
  (SELECT cmd FROM campaign_withdraw_cmd), '{acknowledge_promise_impact}', 'true'))$q$,
  'PT409', 'ADM_CONFLICT', 'changed campaign revision invalidates the impact token');
RESET ROLE;
UPDATE private.admin_console_settings SET campaign_revision = 'missing-revision' WHERE singleton;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(public.admin_recipe_usage('91000000-0000-0000-0000-000000000061')->>'sourceRevision',
  NULL, 'missing snapshot is visibly unavailable');
SELECT throws_ok($q$SELECT public.admin_recipe_impact('91000000-0000-0000-0000-000000000061')$q$,
  '42501', 'ADM_BLOCKED', 'missing snapshot blocks impact');
SELECT throws_ok($q$SELECT public.admin_recipe_withdraw(jsonb_set(
  (SELECT cmd FROM campaign_withdraw_cmd), '{acknowledge_promise_impact}', 'true'))$q$,
  '42501', 'ADM_BLOCKED', 'missing snapshot blocks withdrawal');
SELECT is((pg_temp.pub_state(61)->>'publication'), 'published', 'blocked withdrawal preserves public recipe');
RESET ROLE;
INSERT INTO private.admin_campaign_snapshots(deployment_revision, configuration, configuration_hash)
VALUES ('test-rev-bad', '{"campaigns":[{"slug":"bad","recipeSlugs":"not-an-array"}]}', 'hash-bad');
UPDATE private.admin_console_settings SET campaign_revision = 'test-rev-bad' WHERE singleton;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(public.admin_recipe_usage('91000000-0000-0000-0000-000000000061')->>'sourceRevision',
  NULL, 'malformed campaign snapshot is unavailable, not empty');
SELECT throws_ok($q$SELECT public.admin_recipe_impact('91000000-0000-0000-0000-000000000061')$q$,
  '42501', 'ADM_BLOCKED', 'malformed campaign snapshot blocks impact');
RESET ROLE;
UPDATE private.admin_console_settings SET campaign_revision = 'test-rev-3' WHERE singleton;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT lives_ok($q$SELECT public.admin_recipe_withdraw(jsonb_set(
  pg_temp.withdraw_cmd(61, gen_random_uuid(), false, false),
  '{acknowledge_promise_impact}', 'true'))$q$, 'owner acknowledges named campaign and withdraws');
SELECT is((pg_temp.pub_state(61)->>'publication'), 'withdrawn', 'acknowledged withdrawal commits');
RESET ROLE;

-- Publisher cannot emergency-withdraw sealed content; owner can with full record.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000005', 'aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$SELECT public.admin_recipe_withdraw(
  pg_temp.withdraw_cmd(62, gen_random_uuid(), true, true))$q$,
  '42501', 'ADM_BLOCKED', 'publisher emergency denied');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT lives_ok($q$SELECT public.admin_recipe_withdraw(
  pg_temp.withdraw_cmd(62, gen_random_uuid(), true, true))$q$, 'owner emergency withdraws');
SELECT is((SELECT publication_state FROM public.recipe_catalog
  WHERE id = '91000000-0000-0000-0000-000000000062'), 'withdrawn', 'sealed recipe withdrawn');
SELECT is((pg_temp.pub_state(62)->>'emergencies')::int, 1, 'emergency audit recorded');
RESET ROLE;

-- Anonymous callers cannot publish, withdraw or read impact.
SELECT ok(NOT has_function_privilege('anon', 'public.admin_revision_publish(jsonb)', 'EXECUTE'), 'anon publish denied');
SELECT ok(NOT has_function_privilege('anon', 'public.admin_recipe_withdraw(jsonb)', 'EXECUTE'), 'anon withdraw denied');
SELECT ok(NOT has_function_privilege('anon', 'public.admin_recipe_impact(uuid)', 'EXECUTE'), 'anon impact denied');

SELECT * FROM finish();
ROLLBACK;
