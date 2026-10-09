-- Phase 2: private collection workflow schema.
-- Stable identity stays in public.recipe_collections. Drafts, approvals and audit are private;
-- public readers see only public.collection_publication_projection. Nothing here registers a
-- real user or operator, enables sales or grants customer access.

-- Collection authority extends the console roles; recipe and team authority are unchanged.
CREATE OR REPLACE FUNCTION private.admin_permissions(p_role text) RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE p_role
 WHEN 'owner' THEN ARRAY['recipe.read','recipe.edit','recipe.review','recipe.publish','recipe.withdraw','recipe.emergency_withdraw','team.manage',
   'collection.read','collection.edit','collection.review','collection.publish']
 WHEN 'viewer' THEN ARRAY['recipe.read','collection.read']
 WHEN 'editor' THEN ARRAY['recipe.read','recipe.edit','collection.read','collection.edit']
 WHEN 'reviewer' THEN ARRAY['recipe.read','recipe.review','collection.read','collection.review']
 WHEN 'publisher' THEN ARRAY['recipe.read','recipe.publish','recipe.withdraw','collection.read','collection.publish']
 ELSE ARRAY[]::text[] END
$$;

-- Collections have their own stage; an action needs both this and the console stage.
CREATE TABLE private.collection_workspace_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 stage text NOT NULL DEFAULT 'disabled' CHECK(stage IN ('disabled','inspection','editing','publication')),
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES auth.users(id), reason text
);
INSERT INTO private.collection_workspace_settings(singleton) VALUES(true);

-- Where a collection's public content comes from: the legacy config file or a database publication.
CREATE TABLE private.collection_sources (
 collection_id uuid PRIMARY KEY REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 source_mode text NOT NULL DEFAULT 'legacy' CHECK(source_mode IN ('legacy','database')),
 source_sha text, import_digest text CHECK(import_digest IS NULL OR import_digest ~ '^[0-9a-f]{64}$'),
 imported_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);

-- Who performed a write. Browser actors come from auth.uid(); operators get their own
-- principal in a later migration. Both name the human who authorised the change.
CREATE TABLE private.collection_operations (
 executor_id text NOT NULL, operation_id uuid NOT NULL,
 action text NOT NULL, collection_id uuid REFERENCES public.recipe_collections(id),
 request_hash text NOT NULL, result jsonb, committed_at timestamptz,
 PRIMARY KEY(executor_id,operation_id)
);

-- Every saved draft state. Append-only: the draft head points at the latest one.
CREATE TABLE private.collection_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 collection_id uuid NOT NULL REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 version integer NOT NULL CHECK(version > 0),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'),
 base_publication_id uuid, base_digest text NOT NULL CHECK(base_digest ~ '^[0-9a-f]{64}$'),
 saved_at timestamptz NOT NULL DEFAULT now(),
 saved_by uuid NOT NULL REFERENCES auth.users(id),
 executor_id text NOT NULL, executor_type text NOT NULL CHECK(executor_type IN ('human','operator')),
 operation_id uuid NOT NULL, reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000),
 UNIQUE(collection_id,version),
 CHECK(snapshot->>'collectionId' = collection_id::text)
);

-- One open draft per collection; collaborators detect conflicts through `version`.
CREATE TABLE private.collection_draft_heads (
 collection_id uuid PRIMARY KEY REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 revision_id uuid NOT NULL UNIQUE REFERENCES private.collection_revisions(id),
 version integer NOT NULL CHECK(version > 0),
 state text NOT NULL CHECK(state IN ('draft','submitted','approved','changes_requested','rejected')),
 submission_id uuid, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE private.collection_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 collection_id uuid NOT NULL REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 revision_id uuid NOT NULL REFERENCES private.collection_revisions(id),
 digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'), impact_token text NOT NULL,
 submitted_by uuid NOT NULL REFERENCES auth.users(id), submitted_at timestamptz NOT NULL DEFAULT now(),
 operation_id uuid NOT NULL, reason text NOT NULL
);
ALTER TABLE private.collection_draft_heads
 ADD CONSTRAINT collection_draft_heads_submission_fk FOREIGN KEY(submission_id) REFERENCES private.collection_submissions(id);

-- A human verdict on one exact revision digest. Imported annotations never live here.
CREATE TABLE private.collection_review_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 collection_id uuid NOT NULL REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 revision_id uuid NOT NULL REFERENCES private.collection_revisions(id),
 submission_id uuid REFERENCES private.collection_submissions(id),
 digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'), impact_token text NOT NULL,
 decision text NOT NULL CHECK(decision IN ('approve','changes_requested','reject')),
 policy_version text NOT NULL DEFAULT 'collections-v1',
 human_authoriser uuid NOT NULL REFERENCES auth.users(id),
 executor_id text NOT NULL, executor_type text NOT NULL CHECK(executor_type IN ('human','operator')),
 attestation_id uuid, operation_id uuid NOT NULL,
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000),
 decided_at timestamptz NOT NULL DEFAULT now()
);

-- Immutable publication history. Imported rows are the legacy baseline, never a new approval.
CREATE TABLE private.collection_publications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 collection_id uuid NOT NULL REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 revision_id uuid REFERENCES private.collection_revisions(id),
 decision_id uuid REFERENCES private.collection_review_decisions(id),
 release_id uuid REFERENCES public.collection_releases(id) ON DELETE RESTRICT,
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'),
 imported boolean NOT NULL DEFAULT false,
 operation_id uuid NOT NULL, executor_id text NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now(),
 CHECK(snapshot->>'collectionId' = collection_id::text),
 CHECK(imported OR (revision_id IS NOT NULL AND decision_id IS NOT NULL))
);

-- The one current publication per collection. Series volumes are unique among current
-- publications only, so two drafts may propose the same volume; the second to publish fails.
CREATE TABLE private.collection_active_publications (
 collection_id uuid PRIMARY KEY REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 publication_id uuid NOT NULL UNIQUE REFERENCES private.collection_publications(id),
 series_key text, series_volume integer CHECK(series_volume IS NULL OR series_volume > 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((series_key IS NULL) = (series_volume IS NULL))
);
CREATE UNIQUE INDEX collection_active_series_volume ON private.collection_active_publications(series_key,series_volume)
 WHERE series_key IS NOT NULL;

-- Which buyers of an origin release receive later additions. Unknown mappings fail
-- reconciliation; nothing defaults legacy entitlements to the broader policy.
CREATE TABLE private.collection_access_policies (
 release_id uuid NOT NULL REFERENCES public.collection_releases(id) ON DELETE RESTRICT,
 source_kind text NOT NULL CHECK(source_kind IN ('stripe_purchase','native_legacy','support_grant','promotional')),
 policy text NOT NULL CHECK(policy IN ('additions-v1','original-only')),
 approved_by uuid NOT NULL REFERENCES auth.users(id), approval_reason text NOT NULL,
 approved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(release_id,source_kind)
);

CREATE TABLE private.collection_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 collection_id uuid NOT NULL REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 action text NOT NULL, revision_id uuid, publication_id uuid, digest text,
 before_ref text, after_ref text, operation_id uuid NOT NULL,
 human_authoriser uuid REFERENCES auth.users(id),
 executor_id text NOT NULL, executor_type text NOT NULL CHECK(executor_type IN ('human','operator')),
 reason text NOT NULL, result text NOT NULL, at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collection_audit_page ON private.collection_audit(collection_id, at DESC, id DESC);

-- Published fields only. Written by publication commands; readers never see draft data here.
CREATE TABLE public.collection_publication_projection (
 collection_id uuid PRIMARY KEY REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 publication_id uuid NOT NULL UNIQUE, release_id uuid REFERENCES public.collection_releases(id),
 slug text NOT NULL UNIQUE, title text NOT NULL, tagline text NOT NULL, story text NOT NULL,
 for_when text NOT NULL, refresh text NOT NULL, shelf text NOT NULL, sort_order double precision NOT NULL,
 stage_min integer, stage_max integer, series_key text, series_volume integer,
 listing_state text NOT NULL CHECK(listing_state IN ('listed','unlisted','retired')),
 availability text NOT NULL CHECK(availability IN ('open','coming-soon')),
 cloth text NOT NULL, cover jsonb,
 members jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(members)='array'),
 published_count integer NOT NULL CHECK(published_count >= 0),
 published_at timestamptz NOT NULL
);

-- Append-only history.
CREATE TRIGGER collection_revisions_immutable BEFORE UPDATE OR DELETE ON private.collection_revisions
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
CREATE TRIGGER collection_submissions_immutable BEFORE UPDATE OR DELETE ON private.collection_submissions
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
CREATE TRIGGER collection_review_decisions_immutable BEFORE UPDATE OR DELETE ON private.collection_review_decisions
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
CREATE TRIGGER collection_publications_immutable BEFORE UPDATE OR DELETE ON private.collection_publications
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
CREATE TRIGGER collection_audit_immutable BEFORE UPDATE OR DELETE ON private.collection_audit
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();

DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['collection_workspace_settings','collection_sources','collection_operations',
   'collection_revisions','collection_draft_heads','collection_submissions','collection_review_decisions',
   'collection_publications','collection_active_publications','collection_access_policies','collection_audit']
 LOOP
  EXECUTE format('REVOKE ALL ON private.%I FROM PUBLIC, anon, authenticated', t);
  EXECUTE format('GRANT ALL ON private.%I TO service_role', t);
  EXECUTE format('ALTER TABLE private.%I ENABLE ROW LEVEL SECURITY', t);
 END LOOP;
END $$;

-- Task 10 adds buyer reads of unlisted/retired collections they own, once effective access exists.
REVOKE ALL ON public.collection_publication_projection FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.collection_publication_projection TO anon, authenticated;
GRANT ALL ON public.collection_publication_projection TO service_role;
ALTER TABLE public.collection_publication_projection ENABLE ROW LEVEL SECURITY;
CREATE POLICY collection_projection_listed ON public.collection_publication_projection
 FOR SELECT TO anon, authenticated USING (listing_state = 'listed');

-- Console membership, MFA and console stage (admin_assert), then the collection stage.
CREATE FUNCTION private.collection_assert(p_permission text, p_stage text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; current_stage text;
BEGIN
 IF p_permission NOT IN ('collection.read','collection.edit','collection.review','collection.publish') THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 actor := private.admin_assert(p_permission, p_stage);
 SELECT stage INTO current_stage FROM private.collection_workspace_settings WHERE singleton FOR SHARE;
 IF current_stage IS NULL OR current_stage='disabled' OR
    array_position(ARRAY['disabled','inspection','editing','publication'],current_stage) <
    array_position(ARRAY['disabled','inspection','editing','publication'],p_stage) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DISABLED';
 END IF;
 RETURN actor;
END $$;

CREATE FUNCTION private.collection_digest(p_snapshot jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT private.admin_snapshot_digest(p_snapshot)
$$;

REVOKE ALL ON FUNCTION private.collection_assert(text,text), private.collection_digest(jsonb) FROM PUBLIC, anon, authenticated;
