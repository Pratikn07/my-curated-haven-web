-- Phase 4 audit, 2026-09-25 (docs/audit/AUDIT-BACKLOG.md M4-06).
-- Supabase advisor function_search_path_mutable: these functions resolved
-- names through the caller's search_path. Each body uses only public
-- tables and built-ins, so pinning public keeps behaviour unchanged.

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.update_updated_at()',
    'public.update_updated_at_column()',
    'public.update_recipe_preferences_updated_at()',
    'public.search_recipes_with_ingredients(text)',
    'public.search_shop_products(text, integer)',
    'public.increment_shop_click(uuid)',
    'private.slugify(text)'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn);
    END IF;
  END LOOP;
END $$;
