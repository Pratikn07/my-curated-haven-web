-- Local only. Points the seeded offer at the Nibble & Nurture Stripe sandbox so a
-- local checkout opens a real Stripe test page. seed.sql keeps the synthetic IDs
-- because the e2e and database tests expect acct_test_synthetic.
-- Re-run after every `supabase db reset`:
--   docker exec -i supabase_db_my-curated-haven-impl psql -U postgres < supabase/snippets/local-stripe-sandbox-offer.sql
UPDATE private.commercial_offers
SET
  provider_account_id = 'acct_1UMLpeAi3z8Gw7xf',
  provider_product_id = 'prod_VQEnr4x0gOkeXf',
  provider_price_id = 'price_1UPOKEAi3z8Gw7xfc0PmZkuJ'
WHERE id = 'f0000000-0000-0000-0000-000000000001'
  AND provider_mode = 'test';
