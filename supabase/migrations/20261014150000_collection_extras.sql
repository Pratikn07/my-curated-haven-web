-- Paid extras that come with a collection besides its recipes. The first is the Halloween make-ahead plan
-- (/collections/halloween/plan). The plan's text is paid content: it is loaded into this table with
-- my-curated-haven-web/scripts/load-make-ahead-plan.mjs and never committed to the repository.
--
-- Readable exactly like paid recipe bodies: by the collection's owners (a valid entitlement to any of its
-- releases, the same public.owns_collection check the library and checkout use), by recipe admins and by console
-- staff who may read private recipes. Anonymous visitors and everyone else read nothing. Only the database owner
-- and the service role write.

CREATE TABLE public.collection_extras (
  collection_id uuid NOT NULL REFERENCES public.recipe_collections(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('make_ahead_plan')),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, kind)
);

COMMENT ON TABLE public.collection_extras IS
  'Paid extras of a collection (make-ahead plan). Owners, recipe admins and console staff read; nobody else.';

ALTER TABLE public.collection_extras ENABLE ROW LEVEL SECURITY;

-- Supabase's default privileges would let API roles write; they only ever read, and RLS decides which rows.
REVOKE ALL ON public.collection_extras FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.collection_extras TO anon, authenticated;

CREATE POLICY "Owners read their collection's extras" ON public.collection_extras FOR SELECT TO authenticated
  USING ((SELECT public.owns_collection(collection_extras.collection_id)));

CREATE POLICY "Admins can read all collection extras" ON public.collection_extras FOR SELECT TO authenticated
  USING ((SELECT public.is_recipe_admin()));

CREATE POLICY "Console staff can read collection extras" ON public.collection_extras FOR SELECT TO authenticated
  USING ((SELECT public.is_console_recipe_reader()));
