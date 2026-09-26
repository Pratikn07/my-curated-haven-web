-- Phase 7 audit, 2026-09-26 (docs/audit/AUDIT-BACKLOG.md R7-01, R7-02).

-- R7-02: saved recipes pointed at the legacy iOS table public.recipes, so a
-- web-only recipe (for example a new paid one) could not be saved, and deleting
-- a legacy row deleted people's saves. Point at the web catalog instead.
-- Every existing save has a catalog row: catalog ids were copied from public.recipes.
ALTER TABLE public.saved_recipes
  DROP CONSTRAINT IF EXISTS saved_recipes_recipe_id_fkey;

ALTER TABLE public.saved_recipes
  ADD CONSTRAINT saved_recipes_recipe_id_fkey
  FOREIGN KEY (recipe_id) REFERENCES public.recipe_catalog(id) ON DELETE CASCADE;

-- R7-01: only the app checked "free or purchased" before a save. A signed-in
-- caller could insert any recipe id straight through the Data API.
-- A caller may save a recipe only if they can read its body. The recipe_bodies
-- SELECT policy already encodes "published and (free slot or active entitlement)",
-- so this reuses that single rule instead of copying it.
-- Existing rows are not rechecked; removal stays allowed for any own row.
DROP POLICY IF EXISTS "Users can save recipes" ON public.saved_recipes;
CREATE POLICY "Users can save recipes they can read"
  ON public.saved_recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.recipe_bodies b
      WHERE b.recipe_id = saved_recipes.recipe_id
    )
  );

-- M7-02: deleting a user in Supabase Auth failed for every account, because
-- profiles.id referenced auth.users with NO ACTION (constraint users_id_fkey,
-- left over from the users -> profiles rename). Account closure could not work.
-- Cascade instead: deleting the auth user removes the profile, which already
-- cascades to children, chats, milestones and the other iOS-era tables.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
