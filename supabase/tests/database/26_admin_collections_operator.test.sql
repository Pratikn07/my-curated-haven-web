BEGIN;
SELECT no_plan();
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

-- The test session's own login acts as the operator once it is registered (switching the session user
-- needs superuser rights the test role does not have; tests/e2e/admin-collections-operator.spec.ts uses
-- real separate logins). Another registered principal stands in for a different operator.
SELECT throws_ok($$SELECT private.collection_operator_register('other_operator','Agent B','92000000-0000-0000-0000-000000000003')$$,
  '42501','ADM_DENIED','only the owner can approve a registration');
SELECT private.collection_operator_register('other_operator','Agent B','92000000-0000-0000-0000-000000000001');

UPDATE private.collection_workspace_settings SET stage='publication';
INSERT INTO private.admin_campaign_snapshots(deployment_revision,configuration,configuration_hash)
VALUES('synthetic-deploy','{"campaigns":[]}','h') ON CONFLICT (deployment_revision) DO NOTHING;
UPDATE private.admin_console_settings SET campaign_revision='synthetic-deploy';

-- A save command the operator prepares for the editor: current recipe references, fit confirmed.
CREATE TEMP TABLE prep AS SELECT pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  jsonb_build_object('members',pg_temp.collection_current_members('93000000-0000-0000-0000-000000000001','accepted')))
  || '{"reopen_reviewed":true,"action":"save","human_id":"92000000-0000-0000-0000-000000000003"}'::jsonb c;
GRANT SELECT ON prep TO PUBLIC;

-- Browser roles cannot reach the operator channel.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT private.collection_operator_attest('{}'::jsonb)$$,'42501',NULL,'browser cannot attest human authorisation');
SELECT throws_ok($$SELECT private.collection_operator_publish(gen_random_uuid(),gen_random_uuid())$$,'42501',NULL,
  'browser cannot execute an attestation');
RESET ROLE;
-- Operator calls run with no browser identity at all.
SELECT pg_temp.admin_claims(NULL,'aal2');

-- An unregistered login is refused even with the operator role.
SELECT throws_ok($$SELECT private.collection_operator_prepare((SELECT c FROM prep))$$,'42501','ADM_DENIED',
  'an unregistered login is refused');
CREATE TEMP TABLE role_probe(message text);
GRANT ALL ON role_probe TO PUBLIC;
GRANT mch_collection_operator TO postgres;
SET LOCAL ROLE mch_collection_operator;
DO $$ BEGIN
 PERFORM private.collection_operator_prepare((SELECT c FROM prep));
 INSERT INTO role_probe VALUES ('allowed');
EXCEPTION WHEN OTHERS THEN INSERT INTO role_probe VALUES (SQLERRM);
END $$;
RESET ROLE;
SELECT is((SELECT message FROM role_probe),'ADM_DENIED','and SET ROLE does not change who the operator is');
SELECT private.collection_operator_register(session_user::text,'Agent A','92000000-0000-0000-0000-000000000001');

-- Agent A prepares the draft for the editor through the same save core as the editor.
SELECT throws_ok($$SELECT private.collection_operator_prepare((SELECT c FROM prep) || '{"human_id":"92000000-0000-0000-0000-000000000002"}')$$,
  '42501','ADM_DENIED','the named human must be allowed to edit');
SELECT lives_ok($$SELECT private.collection_operator_prepare((SELECT c FROM prep))$$,'a registered operator prepares the draft');
SELECT throws_ok($$SELECT private.collection_operator_prepare((SELECT c FROM prep) || jsonb_build_object('operation_id',gen_random_uuid()))$$,
  'PT409','ADM_CONFLICT','a stale prepare conflicts like an editor save');
CREATE TEMP TABLE pv AS SELECT private.collection_operator_preview('93000000-0000-0000-0000-000000000001',
  (SELECT revision_id FROM private.collection_draft_heads WHERE collection_id='93000000-0000-0000-0000-000000000001')) p;
SELECT ok((SELECT executor_type='operator' AND executor_id='operator:'||session_user AND saved_by='92000000-0000-0000-0000-000000000003'
  FROM private.collection_revisions r JOIN private.collection_draft_heads h ON h.revision_id=r.id
  WHERE h.collection_id='93000000-0000-0000-0000-000000000001'),'the revision names the editor and the operator separately');
SELECT ok((SELECT p#>>'{evaluation,value,token}' IS NOT NULL FROM pv),'the preview carries the evidence token');

-- An attestation of exactly the previewed proposal.
CREATE FUNCTION pg_temp.attestation(p_human text, p_patch jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('target_kind','collection.publish','target_id',p->>'collectionId','revision_id',p->>'revisionId',
  'expected_version',(p->>'version')::int,'expected_digest',p->>'digest','base',p->'base',
  'impact_token',p#>>'{evaluation,value,token}','approve_now',true,
  'access_decisions',coalesce((SELECT jsonb_agg(jsonb_build_object('release_id',u->>'releaseId','source_kind',u->>'sourceKind',
    'policy','additions-v1')) FROM jsonb_array_elements(p->'undecidedAccess') u),'[]'::jsonb),
  'human_id',p_human,'reason','Owner approved in chat','evidence_ref','chat:message-1042',
  'evidence_excerpt','Yes, publish it','proposed_at',now()) || p_patch
 FROM pv
$$;
SELECT throws_ok($$SELECT private.collection_operator_attest(pg_temp.attestation('92000000-0000-0000-0000-000000000002'))$$,
  '42501','ADM_DENIED','a viewer cannot be named as the approving human');
SELECT throws_ok($$SELECT private.collection_operator_attest(pg_temp.attestation('92000000-0000-0000-0000-000000000001',
  jsonb_build_object('revision_id',gen_random_uuid())))$$,'PT409','ADM_CONFLICT','an attestation must name the current proposal');
SELECT throws_ok($$SELECT private.collection_operator_attest(pg_temp.attestation('92000000-0000-0000-0000-000000000001',
  jsonb_build_object('proposed_at',now()-interval '2 hours')))$$,'22023','ADM_INVALID','an old proposal is refused');
CREATE TEMP TABLE auth1 AS SELECT private.collection_operator_attest(pg_temp.attestation('92000000-0000-0000-0000-000000000001')) id;
SELECT ok((SELECT attested_by=session_user::text AND expires_at BETWEEN now()+interval '29 minutes' AND now()+interval '31 minutes'
  FROM private.collection_operator_authorisations WHERE id=(SELECT id FROM auth1)),'the attestation records the operator and a 30-minute expiry');
SELECT throws_ok($$UPDATE private.collection_operator_authorisations SET reason='edited' WHERE id=(SELECT id FROM auth1)$$,
  '42501','ADM_IMMUTABLE','an attested proposal cannot be edited');

-- Another operator's attestation cannot be executed; a changed candidate is a conflict.
INSERT INTO private.collection_operator_authorisations(id,target_kind,target_id,revision_id,expected_version,expected_digest,base,
  impact_token,human_id,reason,evidence_ref,proposed_at,attested_by,expires_at)
SELECT '93000000-0000-0000-0000-0000000005c1',target_kind,target_id,revision_id,expected_version,expected_digest,base,impact_token,
  human_id,reason,evidence_ref,proposed_at,'other_operator',expires_at
FROM private.collection_operator_authorisations WHERE id=(SELECT id FROM auth1);
SELECT throws_ok($$SELECT private.collection_operator_publish('93000000-0000-0000-0000-0000000005c1',gen_random_uuid())$$,
  '42501','ADM_DENIED','only the operator that recorded the attestation executes it');
SELECT pg_temp.collection_cmd(1,'admin_collection_draft_save',pg_temp.collection_save_command('93000000-0000-0000-0000-000000000001',
  '{"tagline":"Changed after attestation"}'::jsonb) || '{"reopen_reviewed":true}'::jsonb);
SELECT pg_temp.admin_claims(NULL,'aal2');
SELECT throws_ok($$SELECT private.collection_operator_publish((SELECT id FROM auth1),gen_random_uuid())$$,'PT409','ADM_CONFLICT',
  'a candidate changed after attestation is not published');
SELECT is((SELECT consumed_at FROM private.collection_operator_authorisations WHERE id=(SELECT id FROM auth1)),NULL,
  'and the attestation stays unused');

-- A fresh preview and attestation of the current proposal publishes, with separate identities in history.
DELETE FROM pv;
INSERT INTO pv SELECT private.collection_operator_preview('93000000-0000-0000-0000-000000000001',
  (SELECT revision_id FROM private.collection_draft_heads WHERE collection_id='93000000-0000-0000-0000-000000000001'));
CREATE TEMP TABLE auth2 AS SELECT private.collection_operator_attest(pg_temp.attestation('92000000-0000-0000-0000-000000000001')) id;
CREATE TEMP TABLE pub AS SELECT private.collection_operator_publish((SELECT id FROM auth2),'93000000-0000-0000-0000-0000000005a1') r;
SELECT is((SELECT r->>'operationId' FROM pub),'93000000-0000-0000-0000-0000000005a1','the attested proposal publishes');
SELECT is(private.collection_operator_publish((SELECT id FROM auth2),'93000000-0000-0000-0000-0000000005a1'),(SELECT r FROM pub),
  'the same operation returns the same receipt');
SELECT throws_ok($$SELECT private.collection_operator_publish((SELECT id FROM auth2),gen_random_uuid())$$,'PT409','ADM_CONFLICT',
  'a used attestation cannot publish again');
SELECT ok((SELECT human_authoriser='92000000-0000-0000-0000-000000000001' AND executor_id='operator:'||session_user
  AND executor_type='operator' FROM private.collection_audit WHERE action='collection.publish'
  AND operation_id='93000000-0000-0000-0000-0000000005a1'),'history names the human authoriser and the operator executor');
SELECT is((SELECT attestation_id FROM private.collection_review_decisions WHERE operation_id='93000000-0000-0000-0000-0000000005a1'),
  (SELECT id FROM auth2),'the approval links to the attestation');
SELECT ok((SELECT consumed_operation='93000000-0000-0000-0000-0000000005a1' AND receipt IS NOT NULL
  FROM private.collection_operator_authorisations WHERE id=(SELECT id FROM auth2)),'the attestation is consumed with its receipt');

-- Expired attestations and revoked humans or operators are refused at execution.
INSERT INTO private.collection_operator_authorisations(id,target_kind,target_id,revision_id,expected_version,expected_digest,base,
  impact_token,human_id,reason,evidence_ref,proposed_at,attested_by,expires_at)
VALUES ('93000000-0000-0000-0000-0000000005b1','collection.publish','93000000-0000-0000-0000-000000000002',gen_random_uuid(),1,
  repeat('a',64),'{}','t','92000000-0000-0000-0000-000000000005','Old','chat:old',now()-interval '1 hour',session_user::text,
  now()-interval '1 minute'),
 ('93000000-0000-0000-0000-0000000005b2','collection.publish','93000000-0000-0000-0000-000000000002',gen_random_uuid(),1,
  repeat('a',64),'{}','t','92000000-0000-0000-0000-000000000005','Fresh','chat:fresh',now(),session_user::text,
  now()+interval '20 minutes');
SELECT throws_ok($$SELECT private.collection_operator_publish('93000000-0000-0000-0000-0000000005b1',gen_random_uuid())$$,
  '42501','ADM_BLOCKED','an expired attestation is refused');
UPDATE private.admin_memberships SET active=false, revoked_by='92000000-0000-0000-0000-000000000001', revoked_at=now()
WHERE user_id='92000000-0000-0000-0000-000000000005';
SELECT throws_ok($$SELECT private.collection_operator_publish('93000000-0000-0000-0000-0000000005b2',gen_random_uuid())$$,
  '42501','ADM_DENIED','a human who lost authority cannot be acted for');

-- Recipe correction parity: Agent B corrects a purchased recipe for the owner through the shared core.
INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path)
VALUES ('93000000-0000-0000-0000-0000000006a1','operator-recipe','Operator recipe','Synthetic','recipe-previews/operator-recipe.webp');
INSERT INTO public.recipe_bodies(recipe_id, ingredients, instructions, yield, allergen_review_state, allergens)
VALUES ('93000000-0000-0000-0000-0000000006a1','[{"item":"Oats","quantity":"1 cup"}]','[{"step":1,"text":"Cook"}]','2 servings',
  'reviewed_listed','{oats}');
INSERT INTO storage.objects(id, bucket_id, name, version, metadata)
VALUES (gen_random_uuid(),'recipe-previews','operator-recipe.webp','v1','{}');
CREATE FUNCTION pg_temp.approve_recipe(p_quantity text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid := '93000000-0000-0000-0000-0000000006a1'; head private.recipe_drafts; cur jsonb; obj uuid;
BEGIN
 PERFORM public.admin_draft_start(rid, gen_random_uuid());
 SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id=rid AND workflow_schema=1
   AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
 cur := private.admin_revision_json(head.current_revision_id);
 PERFORM public.admin_draft_save(jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,'reason','change',
   'expected_version',head.working_version,'expected_digest',cur->>'digest',
   'base',jsonb_build_object('content_version',head.base_content_version,'active_hash',head.base_active_hash),
   'snapshot',jsonb_set(cur->'snapshot','{body,ingredients,0,quantity}',to_jsonb(p_quantity)),'reopen_reviewed',true));
 SELECT * INTO head FROM private.recipe_drafts WHERE id=head.id;
 cur := private.admin_revision_json(head.current_revision_id);
 PERFORM public.admin_revision_submit(jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,'reason','submit',
   'revision_id',head.current_revision_id,'expected_version',head.working_version,'expected_digest',cur->>'digest'));
 PERFORM public.admin_revision_review(jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,'reason','approve',
   'revision_id',head.current_revision_id,'expected_version',head.working_version,'expected_digest',cur->>'digest',
   'submission_id',(SELECT current_submission_id FROM private.recipe_drafts WHERE id=head.id),'decision','approve',
   'resolved_issue_ids','[]'::jsonb));
 SELECT o.id INTO obj FROM storage.objects o WHERE o.bucket_id='recipe-previews' AND o.name='operator-recipe.webp';
 PERFORM private.admin_record_asset_check(head.current_revision_id, cur->>'digest', 'recipe-previews', 'operator-recipe.webp',
   obj, 'v1', true, now());
 RETURN jsonb_build_object('target_kind','recipe.correct','target_id',rid,'revision_id',head.current_revision_id,
  'expected_version',head.working_version,'expected_digest',cur->>'digest',
  'base',jsonb_build_object('content_version',head.base_content_version,'active_hash',head.base_active_hash),
  'impact_token',public.admin_recipe_impact(rid)->>'impactToken','human_id','92000000-0000-0000-0000-000000000001',
  'reason','Fix the oat quantity','evidence_ref','chat:message-2001','proposed_at',now());
END $$;
CREATE FUNCTION pg_temp.recipe_publish_cmd() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid := '93000000-0000-0000-0000-0000000006a1'; head private.recipe_drafts; cur jsonb;
BEGIN
 SELECT * INTO head FROM private.recipe_drafts WHERE recipe_id=rid AND workflow_schema=1 AND lifecycle='approved';
 cur := private.admin_revision_json(head.current_revision_id);
 RETURN jsonb_build_object('operation_id',gen_random_uuid(),'recipe_id',rid,'reason','First publish',
  'revision_id',head.current_revision_id,'expected_version',head.working_version,'expected_digest',cur->>'digest',
  'base',jsonb_build_object('content_version',head.base_content_version,'active_hash',head.base_active_hash),
  'impact_token',public.admin_recipe_impact(rid)->>'impactToken');
END $$;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM pg_temp.approve_recipe('1 cup');
 PERFORM public.admin_revision_publish(pg_temp.recipe_publish_cmd());
END $$;
RESET ROLE;
INSERT INTO public.collection_releases(id,collection_id,version,state)
VALUES ('93000000-0000-0000-0000-0000000006a2','93000000-0000-0000-0000-000000000002',1,'published');
INSERT INTO public.collection_recipes(release_id,recipe_id,position)
VALUES ('93000000-0000-0000-0000-0000000006a2','93000000-0000-0000-0000-0000000006a1',1);
UPDATE public.collection_releases SET state='sealed', sealed_at=now() WHERE id='93000000-0000-0000-0000-0000000006a2';
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE recipe_attestation AS SELECT pg_temp.approve_recipe('3/4 cup') a;
RESET ROLE;
SELECT pg_temp.admin_claims(NULL,'aal2');
CREATE TEMP TABLE rpv AS SELECT private.recipe_operator_preview('93000000-0000-0000-0000-0000000006a1') p;
SELECT is((SELECT p->>'impactToken' FROM rpv),(SELECT a->>'impact_token' FROM recipe_attestation),
  'the operator preview computes the same impact token as the recipe publish page');
SELECT is((SELECT p#>>'{collections,0,title}' FROM rpv),'Synthetic private draft','and names the collections it reaches');
CREATE TEMP TABLE auth3 AS SELECT private.collection_operator_attest((SELECT a FROM recipe_attestation)) id;
SELECT throws_ok($$SELECT private.collection_operator_publish((SELECT id FROM auth3),gen_random_uuid())$$,'22023','ADM_INVALID',
  'a recipe attestation cannot publish a collection');
SELECT lives_ok($$SELECT private.recipe_operator_correct((SELECT id FROM auth3),gen_random_uuid())$$,
  'the attested correction runs through the shared correction core');
SELECT is((SELECT ingredients->0->>'quantity' FROM public.recipe_bodies WHERE recipe_id='93000000-0000-0000-0000-0000000006a1'),
  '3/4 cup','the purchased recipe is corrected');
SELECT ok((SELECT human_authoriser='92000000-0000-0000-0000-000000000001' AND executor_id='operator:'||session_user
  FROM private.recipe_active_archives WHERE recipe_id='93000000-0000-0000-0000-0000000006a1' AND kind='correction'),
  'the archive names the human authoriser and the operator executor');

SELECT private.collection_operator_revoke(session_user::text);
SELECT throws_ok($$SELECT private.collection_operator_preview('93000000-0000-0000-0000-000000000001',gen_random_uuid())$$,
  '42501','ADM_DENIED','a revoked operator is refused');

SELECT * FROM finish();
ROLLBACK;
