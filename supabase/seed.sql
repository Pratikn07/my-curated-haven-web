-- Phase 4 synthetic seed data
-- Fictional identities and clear synthetic recipe payloads with unique sentinels.

-- ============================================================================
-- 1. Synthetic Auth Users
-- ============================================================================
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'buyer-a@synthetic.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Synthetic Buyer A"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'nonbuyer-b@synthetic.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Synthetic Nonbuyer B"}',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'revoked-c@synthetic.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}',
  '{"name":"Synthetic Revoked C"}',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at
) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'buyer-a@synthetic.test',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"buyer-a@synthetic.test"}'::jsonb,
  'email',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000002',
  'nonbuyer-b@synthetic.test',
  '00000000-0000-0000-0000-000000000002',
  '{"sub":"00000000-0000-0000-0000-000000000002","email":"nonbuyer-b@synthetic.test"}'::jsonb,
  'email',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000003',
  'revoked-c@synthetic.test',
  '00000000-0000-0000-0000-000000000003',
  '{"sub":"00000000-0000-0000-0000-000000000003","email":"revoked-c@synthetic.test"}'::jsonb,
  'email',
  now(),
  now()
)
ON CONFLICT (provider_id, provider) DO NOTHING;

-- ============================================================================
-- 2. Synthetic Legacy Recipes (for foreign key compatibility with saved_recipes)
-- ============================================================================
INSERT INTO public.recipes (
  id,
  title,
  description,
  image_url,
  time_minutes
) VALUES
('10000000-0000-0000-0000-000000000001', 'Synthetic Free Oat Bake', 'A nourishing warm oat bake designed for simple mornings.', 'recipe-previews/synth-free-oat-bake.webp', 35),
('10000000-0000-0000-0000-000000000002', 'Synthetic Free Veggie Frittata', 'Baked farm eggs with tender spinach and sweet peppers.', 'recipe-previews/synth-free-veggie-frittata.webp', 25),
('10000000-0000-0000-0000-000000000003', 'Synthetic Free Berry Smoothie Bowl', 'Refreshing nutrient-dense smoothie bowl for self-feeding.', 'recipe-previews/synth-free-berry-smoothie.webp', 10),
('20000000-0000-0000-0000-000000000001', 'Synthetic Paid Golden Toddler Soup', 'Rich squash and carrot soup for busy evening meals.', 'recipe-previews/synth-paid-golden-soup.webp', 40),
('20000000-0000-0000-0000-000000000002', 'Synthetic Paid Herb Butter Salmon', 'Flaky wild salmon cakes with fresh baby herbs.', 'recipe-previews/synth-paid-herb-salmon.webp', 30),
('30000000-0000-0000-0000-000000000001', 'Synthetic Draft Warm Quinoa Salad', 'Nutty quinoa tossed with steamed garden peas.', 'recipe-previews/synth-draft-warm-salad.webp', 20),
('30000000-0000-0000-0000-000000000002', 'Synthetic Withdrawn Spiced Lentils', 'Spiced creamy red lentils for growing toddlers.', 'recipe-previews/synth-withdrawn-spiced-lentils.webp', 25),
('40000000-0000-0000-0000-000000000001', 'Synthetic Withdrawn Seed Bread', 'Withdrawn loaf formula removed from publication.', 'recipe-previews/synth-withdrawn-bread.webp', 60)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. Synthetic Catalog Entries
-- ============================================================================
INSERT INTO public.recipe_catalog (
  id,
  slug,
  title,
  public_summary,
  preview_image_path,
  total_minutes,
  meal_labels,
  diet_labels,
  publication_state,
  published_at
) VALUES
-- Free Recipe 1
(
  '10000000-0000-0000-0000-000000000001',
  'synth-free-oat-bake',
  'Synthetic Free Oat Bake',
  'A nourishing warm oat bake designed for simple mornings.',
  'recipe-previews/synth-free-oat-bake.webp',
  35,
  ARRAY['Breakfast', 'Snack'],
  ARRAY['Vegetarian'],
  'published',
  now() - interval '7 days'
),
-- Free Recipe 2
(
  '10000000-0000-0000-0000-000000000002',
  'synth-free-veggie-frittata',
  'Synthetic Free Veggie Frittata',
  'Baked farm eggs with tender spinach and sweet peppers.',
  'recipe-previews/synth-free-veggie-frittata.webp',
  25,
  ARRAY['Breakfast', 'Lunch'],
  ARRAY['Gluten-Free', 'Vegetarian'],
  'published',
  now() - interval '6 days'
),
-- Free Recipe 3
(
  '10000000-0000-0000-0000-000000000003',
  'synth-free-berry-smoothie',
  'Synthetic Free Berry Smoothie Bowl',
  'Thick berry blend topped with toasted seeds and coconut.',
  'recipe-previews/synth-free-berry-smoothie.webp',
  10,
  ARRAY['Breakfast'],
  ARRAY['Vegan', 'Dairy-Free'],
  'published',
  now() - interval '5 days'
),
-- Paid Recipe 1 (In Release 1)
(
  '20000000-0000-0000-0000-000000000001',
  'synth-paid-golden-soup',
  'Synthetic Paid Golden Lentil Soup',
  'Rich spiced red lentil and ginger soup.',
  'recipe-previews/synth-paid-golden-soup.webp',
  40,
  ARRAY['Dinner'],
  ARRAY['Vegan'],
  'published',
  now() - interval '4 days'
),
-- Paid Recipe 2 (In Release 2 - Retired Collection)
(
  '20000000-0000-0000-0000-000000000002',
  'synth-paid-herb-salmon',
  'Synthetic Paid Slow Herb Salmon',
  'Delicate wild salmon baked with dill and lemon butter.',
  'recipe-previews/synth-paid-herb-salmon.webp',
  30,
  ARRAY['Dinner'],
  ARRAY['Pescatarian'],
  'published',
  now() - interval '3 days'
),
-- Draft Recipe
(
  '30000000-0000-0000-0000-000000000001',
  'synth-draft-warm-salad',
  'Synthetic Draft Warm Potato Salad',
  'Draft entry undergoing editorial inspection.',
  'recipe-previews/synth-draft-warm-salad.webp',
  20,
  ARRAY['Lunch'],
  ARRAY['Vegetarian'],
  'draft',
  NULL
),
-- Withdrawn Recipe
(
  '40000000-0000-0000-0000-000000000001',
  'synth-withdrawn-bread',
  'Synthetic Withdrawn Seed Bread',
  'Withdrawn loaf formula removed from publication.',
  'recipe-previews/synth-withdrawn-bread.webp',
  60,
  ARRAY['Snack'],
  ARRAY['Gluten-Free'],
  'withdrawn',
  now() - interval '30 days'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  publication_state = EXCLUDED.publication_state;

-- ============================================================================
-- 3. Synthetic Recipe Bodies (Protected Content with Sentinels)
-- ============================================================================
INSERT INTO public.recipe_bodies (
  recipe_id,
  content_version,
  ingredients,
  instructions,
  yield,
  reviewed_notes,
  allergen_review_state,
  allergens
) VALUES
-- Free 1 Body
(
  '10000000-0000-0000-0000-000000000001',
  1,
  '[{"amount":"2","unit":"cups","item":"rolled oats"},{"amount":"1","unit":"cup","item":"almond milk"},{"amount":"1/4","unit":"cup","item":"pure maple syrup"}]'::jsonb,
  '[{"step":1,"text":"Preheat oven to 375F."},{"step":2,"text":"SENTINEL_FREE_OAT_BODY_SECRET_METHOD: Combine and bake for 25 minutes until golden."}]'::jsonb,
  '4 portions',
  'Keep refrigerated for up to 4 days.',
  'reviewed_listed',
  ARRAY['Tree Nuts']
),
-- Free 2 Body
(
  '10000000-0000-0000-0000-000000000002',
  1,
  '[{"amount":"6","unit":"large","item":"pasture-raised eggs"},{"amount":"2","unit":"cups","item":"baby spinach"}]'::jsonb,
  '[{"step":1,"text":"SENTINEL_FREE_FRITTATA_BODY: Whisk eggs and pour over sautéed vegetables in an ovenproof skillet."}]'::jsonb,
  '4 servings',
  'Great served chilled or warm.',
  'reviewed_listed',
  ARRAY['Eggs']
),
-- Free 3 Body
(
  '10000000-0000-0000-0000-000000000003',
  1,
  '[{"amount":"2","unit":"cups","item":"frozen wild blueberries"},{"amount":"1","unit":"whole","item":"ripe banana"}]'::jsonb,
  '[{"step":1,"text":"SENTINEL_FREE_SMOOTHIE_BODY: Blend on high speed until creamy and thick."}]'::jsonb,
  '2 bowls',
  'Serve immediately.',
  'reviewed_no_allergens',
  ARRAY[]::text[]
),
-- Paid 1 Body (Protected Sentinel)
(
  '20000000-0000-0000-0000-000000000001',
  1,
  '[{"amount":"1.5","unit":"cups","item":"split red lentils"},{"amount":"1","unit":"tbsp","item":"fresh grated ginger"},{"amount":"1","unit":"can","item":"coconut milk"}]'::jsonb,
  '[{"step":1,"text":"SENTINEL_PAID_GOLDEN_SOUP_PROTECTED_SECRET: Simmer red lentils with tempered turmeric oil for 25 minutes."}]'::jsonb,
  '6 servings',
  'Freezes exceptionally well for up to 3 months.',
  'reviewed_no_allergens',
  ARRAY[]::text[]
),
-- Paid 2 Body (Protected Sentinel)
(
  '20000000-0000-0000-0000-000000000002',
  1,
  '[{"amount":"1.5","unit":"lbs","item":"wild coho salmon fillet"},{"amount":"3","unit":"tbsp","item":"fresh minced dill"}]'::jsonb,
  '[{"step":1,"text":"SENTINEL_PAID_SALMON_PROTECTED_SECRET: Slow roast at 275F with clarified herb butter until tender."}]'::jsonb,
  '4 servings',
  'Do not overcook; center should be translucent.',
  'reviewed_listed',
  ARRAY['Fish']
),
-- Draft Recipe Body
(
  '30000000-0000-0000-0000-000000000001',
  1,
  '[{"amount":"1","unit":"lb","item":"fingerling potatoes"}]'::jsonb,
  '[{"step":1,"text":"SENTINEL_DRAFT_SECRET_BODY: Boil and toss with mustard vinaigrette."}]'::jsonb,
  '4 servings',
  'Draft version.',
  'unknown',
  NULL
),
-- Withdrawn Recipe Body
(
  '40000000-0000-0000-0000-000000000001',
  1,
  '[{"amount":"2","unit":"cups","item":"millet flour"}]'::jsonb,
  '[{"step":1,"text":"SENTINEL_WITHDRAWN_SECRET_BODY: Mix and bake."}]'::jsonb,
  '1 loaf',
  'Withdrawn.',
  'unknown',
  NULL
)
ON CONFLICT (recipe_id) DO UPDATE SET
  ingredients = EXCLUDED.ingredients,
  instructions = EXCLUDED.instructions;

-- ============================================================================
-- 4. Assign Exactly 3 Free Recipe Slots
-- ============================================================================
INSERT INTO public.free_recipe_slots (slot, recipe_id, assigned_at)
VALUES
  (1, '10000000-0000-0000-0000-000000000001', now()),
  (2, '10000000-0000-0000-0000-000000000002', now()),
  (3, '10000000-0000-0000-0000-000000000003', now())
ON CONFLICT (slot) DO UPDATE SET recipe_id = EXCLUDED.recipe_id;

-- ============================================================================
-- 5. Collections & Releases
-- ============================================================================
INSERT INTO public.recipe_collections (id, slug, title, public_summary, listing_state)
VALUES
(
  'c0000000-0000-0000-0000-000000000001',
  'comfort-haven-collection',
  'The Comfort Haven Collection',
  'A curated collection of nourishing weeknight comforts.',
  'listed'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.collection_releases (id, collection_id, version, state, sealed_at)
VALUES
-- Release 1: Published & active for sale
(
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  1,
  'published',
  now() - interval '10 days'
),
-- Release 2: Will be sealed/retired after membership is populated
(
  'a0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  2,
  'published',
  now() - interval '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- Release memberships:
-- Release 1 includes Paid Recipe 1
INSERT INTO public.collection_recipes (release_id, recipe_id, position)
VALUES ('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1)
ON CONFLICT (release_id, recipe_id) DO NOTHING;

-- Release 2 includes Paid Recipe 2
INSERT INTO public.collection_recipes (release_id, recipe_id, position)
VALUES ('a0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1)
ON CONFLICT (release_id, recipe_id) DO NOTHING;

-- Now retire Release 2 (sealing its membership via the trigger)
UPDATE public.collection_releases
SET state = 'retired', sealed_at = now() - interval '2 days'
WHERE id = 'a0000000-0000-0000-0000-000000000002';

-- ============================================================================
-- 6. Synthetic Entitlements
-- ============================================================================
-- User A (Buyer A) holds active entitlement to Release 1
INSERT INTO public.access_entitlements (id, user_id, release_id, state, valid_from, expires_at, revoked_at)
VALUES
(
  'e0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'active',
  now() - interval '5 days',
  NULL,
  NULL
),
-- User C holds revoked entitlement to Release 1
(
  'e0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'revoked',
  now() - interval '10 days',
  NULL,
  now() - interval '2 days'
),
-- User C holds expired entitlement to Release 2
(
  'e0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000002',
  'expired',
  now() - interval '30 days',
  now() - interval '5 days',
  NULL
)
ON CONFLICT (user_id, release_id) DO UPDATE SET
  state = EXCLUDED.state,
  expires_at = EXCLUDED.expires_at,
  revoked_at = EXCLUDED.revoked_at;

-- ============================================================================
-- 7. Synthetic Saved Recipes
-- ============================================================================
-- Buyer A has bookmarked Free Recipe 1 and a Withdrawn Recipe
INSERT INTO public.saved_recipes (
  user_id,
  recipe_id,
  created_at
) VALUES
(
  '00000000-0000-0000-0000-000000000001', -- Buyer A
  '10000000-0000-0000-0000-000000000001', -- Free Recipe 1 (available)
  now() - interval '2 days'
),
(
  '00000000-0000-0000-0000-000000000001', -- Buyer A
  '40000000-0000-0000-0000-000000000001', -- Withdrawn Recipe (unavailable)
  now() - interval '3 days'
)
ON CONFLICT (user_id, recipe_id) DO NOTHING;

-- ============================================================================
-- 8. Phase 8: Commercial Offers, Manifests, and Access Sources
-- ============================================================================
INSERT INTO private.commercial_offers (
  id,
  release_id,
  provider_account_id,
  provider_mode,
  provider_product_id,
  provider_price_id,
  currency,
  base_minor_amount,
  tax_mode,
  quantity,
  terms_version,
  refund_policy_version,
  access_policy_version,
  sale_enabled,
  manifest_hash
) VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'acct_test_synthetic',
  'test',
  'prod_synth_comfort_haven',
  'price_synth_comfort_1500',
  'usd',
  1500,
  'inclusive',
  1,
  '2026-09-v1',
  '2026-09-v1',
  '2026-09-v1',
  true,
  'sha256_synth_manifest_v1'
)
ON CONFLICT (provider_account_id, provider_mode, provider_price_id) DO UPDATE SET
  base_minor_amount = EXCLUDED.base_minor_amount,
  sale_enabled = EXCLUDED.sale_enabled;

INSERT INTO private.release_manifests (
  id,
  release_id,
  member_recipe_ids,
  manifest_checksum,
  approved_by,
  approved_at
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  ARRAY['20000000-0000-0000-0000-000000000001'::uuid],
  'sha256_synth_manifest_v1',
  'editorial-lead@tinysoho.test',
  now() - interval '10 days'
)
ON CONFLICT (release_id) DO NOTHING;

INSERT INTO private.access_sources (
  user_id,
  release_id,
  source_kind,
  source_id,
  is_eligible,
  valid_from
) VALUES
(
  '00000000-0000-0000-0000-000000000001', -- Buyer A
  'a0000000-0000-0000-0000-000000000001',
  'stripe_purchase',
  'order-seed-001',
  true,
  now() - interval '5 days'
),
(
  '00000000-0000-0000-0000-000000000003', -- Revoked C
  'a0000000-0000-0000-0000-000000000001',
  'stripe_purchase',
  'order-seed-002',
  false,
  now() - interval '10 days'
)
ON CONFLICT (source_kind, source_id, release_id) DO UPDATE SET
  is_eligible = EXCLUDED.is_eligible;


