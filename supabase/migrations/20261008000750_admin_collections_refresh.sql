-- Phase 2: durable public refresh after a collection publication. A job is written in the publication's
-- own transaction (trigger below), so a committed publication always has one. A server-only worker claims
-- a specific job with a lease, revalidates exactly the stored paths, and finishes it. A failed or lost
-- refresh leaves the publication committed and the job pending; retry never publishes again.

CREATE TABLE private.collection_refresh_jobs (
 operation_id uuid PRIMARY KEY,
 collection_id uuid NOT NULL REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 publication_id uuid NOT NULL UNIQUE REFERENCES private.collection_publications(id),
 paths text[] NOT NULL CHECK(cardinality(paths) BETWEEN 1 AND 20),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','claimed','complete','failed')),
 lease_token uuid, lease_expires_at timestamptz, attempts int NOT NULL DEFAULT 0 CHECK(attempts >= 0),
 error_ref text CHECK(error_ref IS NULL OR error_ref ~ '^[a-z0-9-]{1,64}$'),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
REVOKE ALL ON private.collection_refresh_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.collection_refresh_jobs TO service_role;
ALTER TABLE private.collection_refresh_jobs ENABLE ROW LEVEL SECURITY;

-- Paths come from the stored publication, never from a caller.
CREATE FUNCTION private.collection_refresh_paths(p_collection_id uuid, p_slug text) RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT ARRAY['/collections','/collections/'||p_slug,'/collections/series/breakfast','/collections/series/meal-prep',
   '/collections/test','/recipes','/sitemap.xml','/admin/collections','/admin/collections/'||p_collection_id::text]
$$;

CREATE FUNCTION private.collection_enqueue_refresh() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT NEW.imported THEN
  INSERT INTO private.collection_refresh_jobs(operation_id,collection_id,publication_id,paths)
  VALUES(NEW.operation_id,NEW.collection_id,NEW.id,private.collection_refresh_paths(NEW.collection_id,NEW.snapshot->>'slug'))
  ON CONFLICT (operation_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER collection_publications_enqueue_refresh AFTER INSERT ON private.collection_publications
 FOR EACH ROW EXECUTE FUNCTION private.collection_enqueue_refresh();

-- Claim one specific job. Returns NULL when it is complete, leased by another worker, or out of attempts.
CREATE FUNCTION private.collection_refresh_claim(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE job private.collection_refresh_jobs; lease uuid := gen_random_uuid();
BEGIN
 SELECT * INTO job FROM private.collection_refresh_jobs WHERE operation_id=p_operation_id FOR UPDATE;
 IF job.operation_id IS NULL OR job.state='complete' OR job.attempts >= 10
  OR (job.state='claimed' AND job.lease_expires_at > now()) THEN
  RETURN NULL;
 END IF;
 UPDATE private.collection_refresh_jobs SET state='claimed', lease_token=lease, lease_expires_at=now()+interval '2 minutes',
  attempts=attempts+1 WHERE operation_id=p_operation_id;
 RETURN jsonb_build_object('operationId',p_operation_id,'leaseToken',lease,'paths',to_jsonb(job.paths));
END $$;

-- Finish a claimed job: complete without an error reference, failed (retryable) with one.
CREATE FUNCTION private.collection_refresh_finish(p_operation_id uuid, p_lease_token uuid, p_error_ref text) RETURNS text
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE next_state text := CASE WHEN p_error_ref IS NULL THEN 'complete' ELSE 'failed' END;
BEGIN
 UPDATE private.collection_refresh_jobs SET state=next_state, error_ref=p_error_ref, lease_token=NULL, lease_expires_at=NULL,
  completed_at=CASE WHEN next_state='complete' THEN now() END
 WHERE operation_id=p_operation_id AND state='claimed' AND lease_token=p_lease_token;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
 RETURN next_state;
END $$;

-- Recent publication receipts for the workspace, with their current refresh state, plus the active base a
-- history copy must name. Lets a reloaded page recover the exact committed result without publishing again.
CREATE FUNCTION public.admin_collection_receipts(p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.collection_assert('collection.read','inspection');
 RETURN jsonb_build_object('base',private.collection_active_base(p_collection_id),'receipts',
  coalesce((SELECT jsonb_agg(r ORDER BY (r->>'committedAt') DESC) FROM (
  SELECT jsonb_build_object('operationId',p.operation_id,'collectionId',p.collection_id,'revisionId',p.revision_id,
   'publicationId',p.id,'releaseId',p.release_id,'version',rv.version,'digest',p.digest,'noChange',false,
   'committedAt',p.published_at,'refreshState',CASE WHEN j.state='complete' THEN 'complete' ELSE 'pending' END) r
  FROM private.collection_publications p
  JOIN private.collection_revisions rv ON rv.id=p.revision_id
  LEFT JOIN private.collection_refresh_jobs j ON j.publication_id=p.id
  WHERE p.collection_id=p_collection_id AND NOT p.imported
  ORDER BY p.published_at DESC LIMIT 10) x),'[]'::jsonb));
END $$;

-- A manual retry must come from someone who may still publish this collection.
CREATE FUNCTION public.admin_collection_refresh_allowed(p_collection_id uuid, p_operation_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.collection_assert('collection.publish','publication');
 RETURN EXISTS(SELECT 1 FROM private.collection_refresh_jobs WHERE operation_id=p_operation_id AND collection_id=p_collection_id);
END $$;

REVOKE ALL ON FUNCTION private.collection_refresh_paths(uuid,text), private.collection_enqueue_refresh(),
 private.collection_refresh_claim(uuid), private.collection_refresh_finish(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_collection_receipts(uuid), public.admin_collection_refresh_allowed(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_collection_receipts(uuid), public.admin_collection_refresh_allowed(uuid,uuid) TO authenticated;
