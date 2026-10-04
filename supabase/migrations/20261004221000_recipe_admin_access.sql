-- Recipe administrators can inspect every publication state without publishing
-- draft content or changing customer entitlements. Role assignment is an
-- operational action performed only with trusted database credentials.
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role = 'admin'),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Invoker permissions and the caller's verified identity enforce the lookup.
-- User-editable metadata and stale JWT role claims are never consulted.
CREATE FUNCTION public.is_recipe_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_recipe_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_recipe_admin() TO authenticated, service_role;

CREATE POLICY "Admins can read all recipe catalog entries"
  ON public.recipe_catalog FOR SELECT TO authenticated
  USING ((SELECT public.is_recipe_admin()));

CREATE POLICY "Admins can read all recipe bodies"
  ON public.recipe_bodies FOR SELECT TO authenticated
  USING ((SELECT public.is_recipe_admin()));
