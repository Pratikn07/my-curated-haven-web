BEGIN;
SELECT plan(47);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

UPDATE private.collection_workspace_settings SET stage='editing';
UPDATE private.admin_console_settings SET campaign_revision=NULL;

CREATE FUNCTION pg_temp.check_state(p_impact jsonb, p_code text) RETURNS text LANGUAGE sql AS $$
 SELECT string_agg(DISTINCT c->>'state', ',') FROM jsonb_array_elements(p_impact#>'{value,checks}') c WHERE c->>'code'=p_code
$$;

-- Unknown evidence stays unknown and blocks. (The candidate id is read before switching role.)
CREATE TEMP TABLE cand AS SELECT pg_temp.collection_candidate_id() id;
GRANT SELECT ON cand TO authenticated;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT ok(EXISTS(SELECT 1 FROM jsonb_array_elements(public.admin_collection_impact(
  '93000000-0000-0000-0000-000000000001',(SELECT id FROM cand))#>'{value,checks}') AS c
  WHERE c->>'code'='SOURCE_UNAVAILABLE' AND c->>'state'='unknown'),
  'missing source evidence stays unknown');
CREATE TEMP TABLE d0 AS SELECT public.admin_collection_detail('93000000-0000-0000-0000-000000000001') d;
RESET ROLE;
SELECT is((SELECT d#>>'{readiness,readyForApproval}' FROM d0),'false','unknown evidence blocks approval');
SELECT is((SELECT d#>>'{readiness,needsVerification}' FROM d0),'true','unknown evidence needs verification');
SELECT is((SELECT d#>>'{readiness,readyToPublish}' FROM d0),'false','a draft is never ready to publish');

-- Authority.
SELECT ok(pg_temp.collection_impact_as(2,'93000000-0000-0000-0000-000000000001',pg_temp.collection_candidate_id()) ? 'value',
  'a viewer can read impact');
SELECT throws_ok($$SELECT pg_temp.collection_impact_as(6,'93000000-0000-0000-0000-000000000001',pg_temp.collection_candidate_id())$$,
  '42501','ADM_DENIED','a customer cannot read impact');

-- Fixture member references are not current and fit is not confirmed.
CREATE TEMP TABLE i1 AS SELECT pg_temp.collection_impact_as(1,'93000000-0000-0000-0000-000000000001',pg_temp.collection_candidate_id()) i;
SELECT is((SELECT pg_temp.check_state(i,'RECIPE_CURRENT') FROM i1),'fail','recipes changed after they were added are flagged');
SELECT is((SELECT pg_temp.check_state(i,'MEMBER_FIT') FROM i1),'pass','fixture members are confirmed');
SELECT is((SELECT pg_temp.check_state(i,'PROTECTED_KEPT') FROM i1),'pass','the draft keeps purchased recipes');
SELECT is((SELECT pg_temp.check_state(i,'CANDIDATE_CURRENT') FROM i1),'pass','the head revision is current');

-- Record campaign promises and refresh member references; the draft becomes ready for approval.
INSERT INTO private.admin_campaign_snapshots(deployment_revision,configuration,configuration_hash)
VALUES('synthetic-deploy',jsonb_build_object('campaigns',jsonb_build_array(
  jsonb_build_object('slug','synthetic-camp','status','published','recipeSlugs',jsonb_build_array('synthetic-collection-recipe-1')))),'h');
UPDATE private.admin_console_settings SET campaign_revision='synthetic-deploy';
SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  jsonb_build_object('members',pg_temp.collection_current_members('93000000-0000-0000-0000-000000000001','unverified'))));
CREATE TEMP TABLE i2 AS SELECT pg_temp.collection_impact_as(1,'93000000-0000-0000-0000-000000000001',pg_temp.collection_candidate_id()) i;
SELECT is((SELECT pg_temp.check_state(i,'SOURCE_UNAVAILABLE') FROM i2),NULL,'recorded campaigns remove the unknown');
SELECT is((SELECT i#>'{value,affectedCampaignSlugs}' FROM i2),'["synthetic-camp"]'::jsonb,'campaigns promising member recipes are named');
SELECT is((SELECT pg_temp.check_state(i,'RECIPE_CURRENT') FROM i2),NULL,'current references clear the stale check');
SELECT is((SELECT pg_temp.check_state(i,'MEMBER_FIT') FROM i2),'fail','unconfirmed fit blocks');
SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  jsonb_build_object('members',pg_temp.collection_current_members('93000000-0000-0000-0000-000000000001','accepted'))));
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE d1 AS SELECT public.admin_collection_detail('93000000-0000-0000-0000-000000000001') d;
RESET ROLE;
SELECT is((SELECT d#>>'{readiness,readyForApproval}' FROM d1),'true','a fully checked draft is ready for approval');
SELECT is((SELECT d#>>'{readiness,readyToPublish}' FROM d1),'false','approval is still required before publication');

-- The token binds material evidence, not buyer counts.
CREATE TEMP TABLE t1 AS SELECT pg_temp.collection_impact_as(1,'93000000-0000-0000-0000-000000000001',pg_temp.collection_candidate_id())#>>'{value,token}' t;
INSERT INTO public.access_entitlements(user_id,release_id,state) VALUES('92000000-0000-0000-0000-000000000007','93000000-0000-0000-0000-000000000011','active');
SELECT is(pg_temp.collection_impact_as(1,'93000000-0000-0000-0000-000000000001',pg_temp.collection_candidate_id())#>>'{value,token}',
  (SELECT t FROM t1),'another buyer does not change the token');
UPDATE public.recipe_bodies SET content_version=content_version+1 WHERE recipe_id='93000000-0000-0000-0000-000000000101';
SELECT isnt(pg_temp.collection_impact_as(1,'93000000-0000-0000-0000-000000000001',pg_temp.collection_candidate_id())#>>'{value,token}',
  (SELECT t FROM t1),'a recipe correction after preview changes the token');
SELECT is(pg_temp.check_state(pg_temp.collection_impact_as(1,'93000000-0000-0000-0000-000000000001',pg_temp.collection_candidate_id()),
  'RECIPE_CURRENT'),'fail','and asks for a fresh reference');

-- An older revision is not the candidate.
SELECT is(pg_temp.check_state(pg_temp.collection_impact_as(1,'93000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000301'),'CANDIDATE_CURRENT'),'fail','an older revision cannot be reviewed');

-- Series volume clash with another current publication.
SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000002',
  '{"series":{"key":"breakfast","volume":7}}'::jsonb));
SELECT is(pg_temp.check_state(pg_temp.collection_impact_as(1,'93000000-0000-0000-0000-000000000002',
  pg_temp.collection_candidate_id('93000000-0000-0000-0000-000000000002')),'SERIES_VOLUME'),'fail','a used series volume blocks');

-- Test-mode purchases never protect; live payments and open live checkouts do.
INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES
 ('93000000-0000-0000-0000-000000000012','93000000-0000-0000-0000-000000000002',1,'published');
INSERT INTO public.collection_recipes(release_id,recipe_id,position) VALUES
 ('93000000-0000-0000-0000-000000000012','93000000-0000-0000-0000-000000000103',1);
INSERT INTO private.commercial_offers(id,release_id,provider_account_id,provider_mode,provider_product_id,provider_price_id,
 currency,base_minor_amount,sale_enabled) VALUES
 ('93000000-0000-0000-0000-000000000022','93000000-0000-0000-0000-000000000012','acct_synthetic','test','prod_t','price_t','usd',900,false),
 ('93000000-0000-0000-0000-000000000023','93000000-0000-0000-0000-000000000012','acct_synthetic','live','prod_l','price_l','usd',900,false);
INSERT INTO private.purchase_orders(id,support_reference,owner_principal,user_id,offer_id,release_id,snapshot,attempt_state,idempotency_key)
VALUES('93000000-0000-0000-0000-000000000031','SYN-T1','92000000-0000-0000-0000-000000000006','92000000-0000-0000-0000-000000000006',
 '93000000-0000-0000-0000-000000000022','93000000-0000-0000-0000-000000000012','{}','closed','syn-test-order');
INSERT INTO private.provider_payments(order_id,provider_account_id,provider_mode,payment_intent_id,status,captured_amount,currency,paid_at)
VALUES('93000000-0000-0000-0000-000000000031','acct_synthetic','test','pi_syn_test','succeeded',900,'usd',now());
INSERT INTO private.access_sources(user_id,release_id,source_kind,source_id)
VALUES('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000012','stripe_purchase','93000000-0000-0000-0000-000000000031');
INSERT INTO public.access_entitlements(user_id,release_id,state)
VALUES('92000000-0000-0000-0000-000000000006','93000000-0000-0000-0000-000000000012','active');
SELECT is((SELECT count(*)::int FROM private.collection_protected_members('93000000-0000-0000-0000-000000000002')),0,
  'a test-mode purchase does not protect any recipe');
SELECT is(pg_temp.check_state(pg_temp.collection_impact_as(1,'93000000-0000-0000-0000-000000000002',
  pg_temp.collection_candidate_id('93000000-0000-0000-0000-000000000002')),'TEST_ACTIVITY'),'pass','test activity is labelled');
INSERT INTO private.purchase_orders(id,support_reference,owner_principal,user_id,offer_id,release_id,snapshot,attempt_state,idempotency_key)
VALUES('93000000-0000-0000-0000-000000000032','SYN-L1','92000000-0000-0000-0000-000000000007','92000000-0000-0000-0000-000000000007',
 '93000000-0000-0000-0000-000000000023','93000000-0000-0000-0000-000000000012','{}','open','syn-live-order');
SELECT is((SELECT array_agg(recipe_id)::text FROM private.collection_protected_members('93000000-0000-0000-0000-000000000002')),
  '{93000000-0000-0000-0000-000000000103}','an open live checkout protects its recipes');
UPDATE private.purchase_orders SET attempt_state='closed' WHERE id='93000000-0000-0000-0000-000000000032';
SELECT is((SELECT count(*)::int FROM private.collection_protected_members('93000000-0000-0000-0000-000000000002')),0,
  'a closed live checkout without payment does not');
INSERT INTO private.provider_payments(order_id,provider_account_id,provider_mode,payment_intent_id,status,captured_amount,currency,paid_at)
VALUES('93000000-0000-0000-0000-000000000032','acct_synthetic','live','pi_syn_live','refunded',900,'usd',now());
SELECT is((SELECT count(*)::int FROM private.collection_protected_members('93000000-0000-0000-0000-000000000002')),1,
  'a live payment protects its recipes, even after a refund');

-- Review (Task 9). Bring collection 1 back to a ready draft.
UPDATE private.admin_console_settings SET campaign_revision='synthetic-deploy';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(3,'admin_collection_submit',pg_temp.collection_submit_command())$$,
  '42501','ADM_BLOCKED','a draft with stale recipe references cannot be submitted');
SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  jsonb_build_object('members',pg_temp.collection_current_members('93000000-0000-0000-0000-000000000001','accepted'))));
SELECT is(pg_temp.collection_cmd(3,'admin_collection_submit',pg_temp.collection_submit_command())#>>'{revision,state}','submitted',
  'an editor submits the exact ready revision');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(4,'admin_collection_review',
  pg_temp.collection_review_command() || jsonb_build_object('expected_digest',repeat('0',64)))$$,
  'PT409','ADM_CONFLICT','approval cannot target altered content');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(5,'admin_collection_review',pg_temp.collection_review_command())$$,
  '42501','ADM_DENIED','a publisher cannot make a review decision');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(3,'admin_collection_review',pg_temp.collection_review_command())$$,
  '42501','ADM_DENIED','an editor cannot approve their own submission');

-- A human blocker must be resolved by the decision; tampered references are refused.
CREATE TEMP TABLE issue1 AS SELECT (pg_temp.collection_cmd(4,'admin_collection_issue',pg_temp.collection_submit_command()
  - 'impact_token' || '{"code":"COPY_TONE","field":"story","severity":"blocker","explanation":"Story repeats the tagline."}'::jsonb)
  ->>'issueId')::uuid id;
SELECT throws_ok($$SELECT pg_temp.collection_cmd(4,'admin_collection_review',pg_temp.collection_review_command())$$,
  '42501','ADM_BLOCKED','an open blocker stops approval');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(4,'admin_collection_review',pg_temp.collection_review_command()
  || jsonb_build_object('resolved_issue_ids',jsonb_build_array(gen_random_uuid())))$$,
  '22023','ADM_INVALID','a resolved issue must belong to this revision');

-- Authority and stage are rechecked at decision time.
UPDATE private.collection_workspace_settings SET stage='inspection';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(4,'admin_collection_review',pg_temp.collection_review_command())$$,
  '42501','ADM_DISABLED','an inspection stage refuses decisions');
UPDATE private.collection_workspace_settings SET stage='editing';
UPDATE private.admin_memberships SET active=false, revoked_by='92000000-0000-0000-0000-000000000001', revoked_at=now()
 WHERE user_id='92000000-0000-0000-0000-000000000004';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(4,'admin_collection_review',pg_temp.collection_review_command())$$,
  '42501','ADM_DENIED','a revoked reviewer cannot decide');

-- Evidence that changed after submission makes the reviewed token stale.
CREATE TEMP TABLE stale AS SELECT pg_temp.collection_review_command() || jsonb_build_object('resolved_issue_ids',
  jsonb_build_array((SELECT id FROM issue1))) c;
UPDATE public.recipe_bodies SET content_version=content_version+1 WHERE recipe_id='93000000-0000-0000-0000-000000000102';
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_review',(SELECT c FROM stale))$$,
  'PT409','ADM_CONFLICT','a dependency change after submission invalidates the reviewed evidence');
UPDATE public.recipe_bodies SET content_version=content_version-1 WHERE recipe_id='93000000-0000-0000-0000-000000000102';

-- The owner approves their own submission, resolving the issue.
CREATE TEMP TABLE approved AS SELECT pg_temp.collection_cmd(1,'admin_collection_review',pg_temp.collection_review_command()
  || jsonb_build_object('resolved_issue_ids',jsonb_build_array((SELECT id FROM issue1)))) r;
SELECT is((SELECT r#>>'{revision,state}' FROM approved),'approved','owner self-review approves the exact revision');
SELECT is((SELECT count(*)::int FROM private.collection_issue_resolutions WHERE issue_id=(SELECT id FROM issue1)),1,
  'the resolution is recorded against the decision');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_review',pg_temp.collection_review_command('reject'))$$,
  'PT409','ADM_CONFLICT','a submission gets one decision');

-- After approval: identical content keeps the approval; a change needs reopen and leaves the old decision in history.
SELECT is(pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001','{}'))
  ->>'noChange','true','a no-change save after approval changes nothing');
SELECT is((SELECT state FROM private.collection_draft_heads WHERE collection_id='93000000-0000-0000-0000-000000000001'),'approved',
  'and the draft stays approved');
SELECT throws_ok($$SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',
  pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001','{"tagline":"After approval"}'))$$,
  '42501','ADM_BLOCKED','approved content is not edited without reopening');
SELECT is(pg_temp.collection_cmd(1,'admin_collection_draft_save',
  pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001','{"tagline":"After approval"}')
  || '{"reopen_reviewed":true}'::jsonb)#>>'{revision,state}','draft','reopening returns the draft for another review');
SELECT is((SELECT count(*)::int FROM private.collection_review_decisions WHERE collection_id='93000000-0000-0000-0000-000000000001'),1,
  'the earlier decision stays in history');

-- Unknown evidence cannot be submitted or approved.
UPDATE private.admin_console_settings SET campaign_revision=NULL;
SELECT throws_ok($$SELECT pg_temp.collection_cmd(3,'admin_collection_submit',pg_temp.collection_submit_command())$$,
  '42501','ADM_BLOCKED','unknown campaign evidence blocks submission');
UPDATE private.admin_console_settings SET campaign_revision='synthetic-deploy';

-- The workspace sees review state.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002','aal2');
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE d2 AS SELECT public.admin_collection_detail('93000000-0000-0000-0000-000000000001') d;
RESET ROLE;
SELECT is((SELECT d#>>'{review,decisions,0,decidedBy}' FROM d2),'owner@synthetic.test','decisions name the human');
SELECT is((SELECT d#>>'{review,decisions,0,decision}' FROM d2),'approve','and the verdict');

SELECT * FROM finish();
ROLLBACK;
