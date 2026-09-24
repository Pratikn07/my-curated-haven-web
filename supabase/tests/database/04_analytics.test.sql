BEGIN;
SELECT plan(6);

-- ============================================================================
-- A01: Row Level Security is enabled on search_analytics
-- ============================================================================
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'search_analytics'),
  'A01: RLS is active on search_analytics'
);

-- ============================================================================
-- A02: Anonymous caller cannot read raw search_analytics
-- ============================================================================
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';
SET LOCAL "request.jwt.claim.sub" = '';

SELECT throws_ok(
  'SELECT count(*) FROM public.search_analytics',
  '42501',
  NULL,
  'A02: Anonymous caller permission denied when reading search_analytics'
);

-- ============================================================================
-- A03: Anonymous caller cannot insert into search_analytics
-- ============================================================================
SELECT throws_ok(
  $$INSERT INTO public.search_analytics (query) VALUES ('toddler breakfast')$$,
  '42501',
  NULL,
  'A03: Anonymous caller permission denied when inserting into search_analytics'
);

-- ============================================================================
-- A04: Authenticated user cannot read raw search_analytics
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001"}';
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000001';

SELECT throws_ok(
  'SELECT count(*) FROM public.search_analytics',
  '42501',
  NULL,
  'A04: Authenticated user permission denied when reading search_analytics'
);

-- ============================================================================
-- A05: Authenticated user cannot insert into search_analytics
-- ============================================================================
SELECT throws_ok(
  $$INSERT INTO public.search_analytics (user_id, query) VALUES ('00000000-0000-0000-0000-000000000001', 'toddler snacks')$$,
  '42501',
  NULL,
  'A05: Authenticated user permission denied when inserting into search_analytics'
);

-- ============================================================================
-- A06: Broad trending select policy is removed
-- ============================================================================
SET LOCAL ROLE postgres;
SELECT is_empty(
  $$SELECT policyname FROM pg_policies WHERE tablename = 'search_analytics' AND policyname = 'Anyone can view searches for trending'$$,
  'A06: Insecure broad trending search policy does not exist'
);

SELECT * FROM finish();
ROLLBACK;
