BEGIN;
SELECT plan(22);
\ir ../../test-fixtures/admin-console.sql
\ir ../../test-fixtures/admin-collections.sql

UPDATE private.collection_workspace_settings SET stage='publication';
INSERT INTO private.collection_access_policies(release_id,source_kind,policy,approved_by,approval_reason)
SELECT '93000000-0000-0000-0000-000000000011',k,'additions-v1','92000000-0000-0000-0000-000000000001','Synthetic'
FROM unnest(ARRAY['native_legacy']) k;
SELECT pg_temp.collection_make_ready();
CREATE TEMP TABLE pub AS SELECT pg_temp.collection_cmd(1,'admin_collection_publish',pg_temp.collection_publish_command(true)) r;
CREATE TEMP TABLE op AS SELECT (r->>'operationId')::uuid id FROM pub;
GRANT SELECT ON op TO authenticated;

SELECT is((SELECT count(*)::int FROM private.collection_refresh_jobs WHERE operation_id=(SELECT id FROM op)),1,
  'the publication wrote its refresh job in the same transaction');
SELECT is((SELECT state FROM private.collection_refresh_jobs WHERE operation_id=(SELECT id FROM op)),'pending','the job starts pending');
SELECT ok((SELECT '/collections/synthetic-published-shelf' = ANY(paths) AND '/collections' = ANY(paths)
  FROM private.collection_refresh_jobs WHERE operation_id=(SELECT id FROM op)),'paths come from the stored publication');
SELECT is((SELECT count(*)::int FROM private.collection_refresh_jobs WHERE publication_id='93000000-0000-0000-0000-000000000201'),0,
  'imported baselines have no refresh job');

-- Leases.
CREATE TEMP TABLE c1 AS SELECT private.collection_refresh_claim((SELECT id FROM op)) j;
SELECT ok((SELECT j ? 'leaseToken' FROM c1),'a worker claims the job');
SELECT is(private.collection_refresh_claim((SELECT id FROM op)),NULL,'a leased job cannot be claimed twice');
SELECT throws_ok($$SELECT private.collection_refresh_finish((SELECT id FROM op),gen_random_uuid(),NULL)$$,
  'PT409','ADM_CONFLICT','only the lease holder can finish');
SELECT is(private.collection_refresh_finish((SELECT id FROM op),(SELECT (j->>'leaseToken')::uuid FROM c1),'cache-offline'),'failed',
  'a failed refresh is recorded with a safe reference');
SELECT is((SELECT count(*)::int FROM private.collection_publications WHERE collection_id='93000000-0000-0000-0000-000000000001' AND NOT imported),1,
  'the publication stays committed');

-- Retry, then complete.
CREATE TEMP TABLE c2 AS SELECT private.collection_refresh_claim((SELECT id FROM op)) j;
SELECT is((SELECT attempts FROM private.collection_refresh_jobs WHERE operation_id=(SELECT id FROM op)),2,'a retry claims again');
SELECT is(private.collection_refresh_finish((SELECT id FROM op),(SELECT (j->>'leaseToken')::uuid FROM c2),NULL),'complete',
  'the retry completes');
SELECT is(private.collection_refresh_claim((SELECT id FROM op)),NULL,'a completed job is not claimed again');
SELECT is((SELECT count(*)::int FROM private.collection_publications WHERE collection_id='93000000-0000-0000-0000-000000000001' AND NOT imported),1,
  'retrying never publishes again');

-- Receipts and retry authority.
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002','aal2');
SET LOCAL ROLE authenticated;
SELECT is(public.admin_collection_receipts('93000000-0000-0000-0000-000000000001')#>>'{receipts,0,refreshState}','complete',
  'receipts report the refresh state');
SELECT is(public.admin_collection_receipts('93000000-0000-0000-0000-000000000001')#>>'{receipts,0,operationId}',(SELECT id::text FROM op),
  'and the committed operation');
SELECT is(public.admin_collection_receipts('93000000-0000-0000-0000-000000000001')#>>'{base,publicationId}',
  public.admin_collection_receipts('93000000-0000-0000-0000-000000000001')#>>'{receipts,0,publicationId}',
  'and the active base a history copy must name');
SELECT throws_ok($$SELECT public.admin_collection_refresh_allowed('93000000-0000-0000-0000-000000000001',(SELECT id FROM op))$$,
  '42501','ADM_DENIED','a viewer cannot trigger a refresh');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000005','aal2');
SET LOCAL ROLE authenticated;
SELECT is(public.admin_collection_refresh_allowed('93000000-0000-0000-0000-000000000001',(SELECT id FROM op)),true,'a publisher can');
SELECT is(public.admin_collection_refresh_allowed('93000000-0000-0000-0000-000000000002',(SELECT id FROM op)),false,
  'but only for that collection''s operation');
RESET ROLE;

-- An expired lease can be taken over; the late holder can no longer finish.
UPDATE private.collection_refresh_jobs SET state='claimed', lease_token=gen_random_uuid(), lease_expires_at=now()-interval '1 second',
 completed_at=NULL WHERE operation_id=(SELECT id FROM op);
CREATE TEMP TABLE stale AS SELECT lease_token t FROM private.collection_refresh_jobs WHERE operation_id=(SELECT id FROM op);
SELECT ok(private.collection_refresh_claim((SELECT id FROM op)) ? 'leaseToken','an expired lease is claimed again');
SELECT throws_ok($$SELECT private.collection_refresh_finish((SELECT id FROM op),(SELECT t FROM stale),NULL)$$,
  'PT409','ADM_CONFLICT','the expired holder cannot finish');

-- Bounded retries.
UPDATE private.collection_refresh_jobs SET state='failed', attempts=10 WHERE operation_id=(SELECT id FROM op);
SELECT is(private.collection_refresh_claim((SELECT id FROM op)),NULL,'retries are bounded');

SELECT * FROM finish();
ROLLBACK;
