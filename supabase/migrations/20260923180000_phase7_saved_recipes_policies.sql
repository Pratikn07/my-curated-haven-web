-- ============================================================================
-- Migration: Phase 7 Saved Recipes RLS Policies and Performance Indexes
-- Created: 2026-09-23
-- Purpose: Restrict saved_recipes table access explicitly to authenticated users,
--          revoke anon access, reinforce owner-only RLS, and add index for
--          fast bookmark listing ordered by recency.
-- ============================================================================

-- 1. Performance index for listing user's saved recipes ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_created
  ON public.saved_recipes (user_id, created_at DESC);

-- 2. Explicit grants and revokes
REVOKE ALL ON public.saved_recipes FROM anon;
GRANT SELECT, INSERT, DELETE ON public.saved_recipes TO authenticated;
GRANT ALL ON public.saved_recipes TO service_role;

-- 3. Strict owner-only Row Level Security policies
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own saved recipes" ON public.saved_recipes;
DROP POLICY IF EXISTS "Users can save recipes" ON public.saved_recipes;
DROP POLICY IF EXISTS "Users can unsave recipes" ON public.saved_recipes;

CREATE POLICY "Users can view their own saved recipes"
  ON public.saved_recipes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save recipes"
  ON public.saved_recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave recipes"
  ON public.saved_recipes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
