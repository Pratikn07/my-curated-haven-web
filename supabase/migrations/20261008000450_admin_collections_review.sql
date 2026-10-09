-- Phase 2: exact collection review. A submission binds one revision digest and a fresh impact token; a
-- human decision binds that submission. Reviewers resolve human-raised issues; validation and source
-- checks cannot be waved away, and unknown evidence blocks approval. Publishers cannot decide reviews
-- (they lack collection.review). Owner self-review is allowed.

CREATE TABLE private.collection_issues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 collection_id uuid NOT NULL REFERENCES public.recipe_collections(id) ON DELETE RESTRICT,
 revision_id uuid NOT NULL REFERENCES private.collection_revisions(id),
 digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'),
 code text NOT NULL CHECK(code ~ '^[A-Z][A-Z0-9_]{1,63}$'), field text,
 severity text NOT NULL CHECK(severity IN ('blocker','suggestion')),
 origin text NOT NULL CHECK(origin IN ('human','validation','source','import','ai')),
 explanation text NOT NULL CHECK(length(trim(explanation)) BETWEEN 1 AND 1000),
 raised_by uuid REFERENCES auth.users(id), operation_id uuid NOT NULL, raised_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.collection_issue_resolutions (
 issue_id uuid PRIMARY KEY REFERENCES private.collection_issues(id),
 decision_id uuid NOT NULL REFERENCES private.collection_review_decisions(id),
 resolver uuid NOT NULL REFERENCES auth.users(id), reason text NOT NULL, resolved_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX collection_one_decision_per_submission ON private.collection_review_decisions(submission_id);
CREATE TRIGGER collection_issues_immutable BEFORE UPDATE OR DELETE ON private.collection_issues
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
CREATE TRIGGER collection_issue_resolutions_immutable BEFORE UPDATE OR DELETE ON private.collection_issue_resolutions
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
REVOKE ALL ON private.collection_issues, private.collection_issue_resolutions FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.collection_issues, private.collection_issue_resolutions TO service_role;
ALTER TABLE private.collection_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.collection_issue_resolutions ENABLE ROW LEVEL SECURITY;

-- The open draft must be exactly the revision, version and digest the caller saw.
CREATE FUNCTION private.collection_current_head(p_collection_id uuid, p_command jsonb) RETURNS private.collection_draft_heads
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE head private.collection_draft_heads; rev_digest text;
BEGIN
 SELECT * INTO head FROM private.collection_draft_heads WHERE collection_id=p_collection_id FOR UPDATE;
 SELECT digest INTO rev_digest FROM private.collection_revisions WHERE id=head.revision_id;
 IF head.collection_id IS NULL
  OR (p_command->>'revision_id') IS DISTINCT FROM head.revision_id::text
  OR (p_command->>'expected_version') IS DISTINCT FROM head.version::text
  OR (p_command->>'expected_digest') IS DISTINCT FROM rev_digest THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 RETURN head;
END $$;

-- Re-evaluate now; the caller's token must match and every evidence blocker must pass.
CREATE FUNCTION private.collection_fresh_evidence(p_collection_id uuid, p_revision_id uuid, p_token text, p_require_ready boolean)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE impact jsonb;
BEGIN
 impact := private.collection_evaluate(p_collection_id, p_revision_id);
 IF NOT (impact->>'ok')::boolean THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='ADM_UNAVAILABLE'; END IF;
 IF p_token IS DISTINCT FROM impact#>>'{value,token}' THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF p_require_ready AND EXISTS(SELECT 1 FROM jsonb_array_elements(impact#>'{value,checks}') c
   WHERE c->>'severity'='blocker' AND c->>'state'<>'pass') THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 RETURN impact->'value';
END $$;

CREATE FUNCTION public.admin_collection_submit(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; ids record; result jsonb; head private.collection_draft_heads; rev private.collection_revisions; sub uuid;
BEGIN
 actor := private.collection_assert('collection.edit','editing');
 ids := private.collection_command_ids(p_command);
 PERFORM 1 FROM public.recipe_collections WHERE id=ids.collection_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 result := private.collection_begin_operation(actor::text, ids.operation_id, 'collection.submit', ids.collection_id,
   jsonb_build_object('reason',ids.reason,'revision_id',p_command->'revision_id','expected_version',p_command->'expected_version',
     'expected_digest',p_command->'expected_digest','impact_token',p_command->'impact_token'));
 IF result IS NOT NULL THEN RETURN result; END IF;
 head := private.collection_current_head(ids.collection_id, p_command);
 IF head.state NOT IN ('draft','changes_requested') THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
 SELECT * INTO rev FROM private.collection_revisions WHERE id=head.revision_id;
 PERFORM private.collection_fresh_evidence(ids.collection_id, rev.id, p_command->>'impact_token', true);
 INSERT INTO private.collection_submissions(collection_id,revision_id,digest,impact_token,submitted_by,operation_id,reason)
 VALUES(ids.collection_id,rev.id,rev.digest,p_command->>'impact_token',actor,ids.operation_id,ids.reason) RETURNING id INTO sub;
 UPDATE private.collection_draft_heads SET state='submitted', submission_id=sub, updated_at=now() WHERE collection_id=ids.collection_id;
 PERFORM private.collection_audit_event(ids.collection_id,'collection.submit',rev.id,rev.digest,rev.id::text,sub::text,
   ids.operation_id,actor,ids.reason);
 result := private.collection_draft_result(ids.operation_id, rev.id, false);
 PERFORM private.collection_finish_operation(actor::text, ids.operation_id, result);
 RETURN result;
END $$;

-- A reviewer records a human issue against the submitted revision.
CREATE FUNCTION public.admin_collection_issue(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; ids record; result jsonb; head private.collection_draft_heads; rev private.collection_revisions; issue uuid;
BEGIN
 actor := private.collection_assert('collection.review','editing');
 ids := private.collection_command_ids(p_command);
 IF coalesce(p_command->>'severity','') NOT IN ('blocker','suggestion')
  OR coalesce(p_command->>'code','') !~ '^[A-Z][A-Z0-9_]{1,63}$'
  OR length(trim(coalesce(p_command->>'explanation',''))) NOT BETWEEN 1 AND 1000
  OR length(coalesce(p_command->>'field','')) > 80 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 PERFORM 1 FROM public.recipe_collections WHERE id=ids.collection_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 result := private.collection_begin_operation(actor::text, ids.operation_id, 'collection.issue', ids.collection_id,
   p_command - 'operation_id' - 'collection_id');
 IF result IS NOT NULL THEN RETURN result; END IF;
 head := private.collection_current_head(ids.collection_id, p_command);
 IF head.state <> 'submitted' THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
 SELECT * INTO rev FROM private.collection_revisions WHERE id=head.revision_id;
 INSERT INTO private.collection_issues(collection_id,revision_id,digest,code,field,severity,origin,explanation,raised_by,operation_id)
 VALUES(ids.collection_id,rev.id,rev.digest,p_command->>'code',nullif(p_command->>'field',''),p_command->>'severity','human',
   p_command->>'explanation',actor,ids.operation_id) RETURNING id INTO issue;
 PERFORM private.collection_audit_event(ids.collection_id,'collection.issue',rev.id,rev.digest,NULL,issue::text,
   ids.operation_id,actor,ids.reason);
 result := private.collection_draft_result(ids.operation_id, rev.id, false) || jsonb_build_object('issueId',issue);
 PERFORM private.collection_finish_operation(actor::text, ids.operation_id, result);
 RETURN result;
END $$;

CREATE FUNCTION public.admin_collection_review(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; ids record; result jsonb; head private.collection_draft_heads; rev private.collection_revisions;
 decision text := p_command->>'decision'; resolved uuid[]; issue private.collection_issues; dec uuid; sub private.collection_submissions;
BEGIN
 actor := private.collection_assert('collection.review','editing');
 ids := private.collection_command_ids(p_command);
 IF decision IS NULL OR decision NOT IN ('approve','changes_requested','reject') THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 BEGIN
  SELECT coalesce(array_agg(x::uuid),'{}') INTO resolved FROM jsonb_array_elements_text(coalesce(p_command->'resolved_issue_ids','[]'::jsonb)) x;
 EXCEPTION WHEN others THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 PERFORM 1 FROM public.recipe_collections WHERE id=ids.collection_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 result := private.collection_begin_operation(actor::text, ids.operation_id, 'collection.review', ids.collection_id,
   jsonb_build_object('reason',ids.reason,'revision_id',p_command->'revision_id','expected_version',p_command->'expected_version',
     'expected_digest',p_command->'expected_digest','impact_token',p_command->'impact_token','submission_id',p_command->'submission_id',
     'decision',decision,'resolved_issue_ids',coalesce(p_command->'resolved_issue_ids','[]'::jsonb)));
 IF result IS NOT NULL THEN RETURN result; END IF;
 head := private.collection_current_head(ids.collection_id, p_command);
 SELECT * INTO sub FROM private.collection_submissions WHERE id=head.submission_id;
 IF head.state <> 'submitted' OR sub.id IS NULL OR (p_command->>'submission_id') IS DISTINCT FROM sub.id::text
  OR sub.revision_id <> head.revision_id THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 SELECT * INTO rev FROM private.collection_revisions WHERE id=head.revision_id;
 IF sub.digest <> rev.digest THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
 -- Every resolved id must be an open issue on this exact revision; only human issues can be resolved.
 IF EXISTS(SELECT 1 FROM unnest(resolved) r WHERE NOT EXISTS(SELECT 1 FROM private.collection_issues i
   WHERE i.id=r AND i.revision_id=rev.id AND i.digest=rev.digest AND i.origin IN ('human','import','ai')
     AND NOT EXISTS(SELECT 1 FROM private.collection_issue_resolutions x WHERE x.issue_id=i.id))) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 PERFORM private.collection_fresh_evidence(ids.collection_id, rev.id, p_command->>'impact_token', decision='approve');
 IF decision='approve' AND EXISTS(SELECT 1 FROM private.collection_issues i WHERE i.revision_id=rev.id AND i.digest=rev.digest
   AND i.severity='blocker' AND i.id <> ALL(resolved)
   AND NOT EXISTS(SELECT 1 FROM private.collection_issue_resolutions x WHERE x.issue_id=i.id)) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;
 INSERT INTO private.collection_review_decisions(collection_id,revision_id,submission_id,digest,impact_token,decision,
   human_authoriser,executor_id,executor_type,operation_id,reason)
 VALUES(ids.collection_id,rev.id,sub.id,rev.digest,p_command->>'impact_token',decision,actor,actor::text,'human',
   ids.operation_id,ids.reason) RETURNING id INTO dec;
 INSERT INTO private.collection_issue_resolutions(issue_id,decision_id,resolver,reason)
 SELECT r, dec, actor, ids.reason FROM unnest(resolved) r;
 UPDATE private.collection_draft_heads SET state=CASE decision WHEN 'approve' THEN 'approved'
   WHEN 'changes_requested' THEN 'changes_requested' ELSE 'rejected' END, updated_at=now()
 WHERE collection_id=ids.collection_id;
 PERFORM private.collection_audit_event(ids.collection_id,'collection.review',rev.id,rev.digest,sub.id::text,dec::text,
   ids.operation_id,actor,decision||': '||ids.reason);
 result := private.collection_draft_result(ids.operation_id, rev.id, false) || jsonb_build_object('decisionId',dec);
 PERFORM private.collection_finish_operation(actor::text, ids.operation_id, result);
 RETURN result;
END $$;

-- Review state for the workspace: the current submission, issues on the open revision, all decisions.
CREATE FUNCTION private.collection_review_json(p_collection_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH head AS (SELECT h.*, r.digest FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id
   WHERE h.collection_id=p_collection_id)
 SELECT jsonb_build_object(
  'submission',(SELECT jsonb_build_object('id',s.id,'submittedAt',s.submitted_at,'submittedBy',u.email,'reason',s.reason)
     FROM head JOIN private.collection_submissions s ON s.id=head.submission_id LEFT JOIN auth.users u ON u.id=s.submitted_by),
  'issues',coalesce((SELECT jsonb_agg(jsonb_build_object('id',i.id,'code',i.code,'field',i.field,'severity',i.severity,
     'origin',i.origin,'explanation',i.explanation,'raisedBy',u.email,'raisedAt',i.raised_at,
     'resolved',EXISTS(SELECT 1 FROM private.collection_issue_resolutions x WHERE x.issue_id=i.id)) ORDER BY i.raised_at, i.id)
    FROM head JOIN private.collection_issues i ON i.revision_id=head.revision_id AND i.digest=head.digest
    LEFT JOIN auth.users u ON u.id=i.raised_by),'[]'::jsonb),
  'decisions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'decision',d.decision,'reason',d.reason,'decidedAt',d.decided_at,
     'decidedBy',u.email,'revisionId',d.revision_id,'version',r.version,'digest',d.digest) ORDER BY d.decided_at DESC, d.id)
    FROM private.collection_review_decisions d JOIN private.collection_revisions r ON r.id=d.revision_id
    LEFT JOIN auth.users u ON u.id=d.human_authoriser WHERE d.collection_id=p_collection_id),'[]'::jsonb))
$$;

-- The detail read now includes review state.
CREATE OR REPLACE FUNCTION public.admin_collection_detail(p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE published jsonb; working jsonb; published_digest text; working_digest text; working_id uuid; working_state text;
 history jsonb; impact jsonb;
BEGIN
 PERFORM private.collection_assert('collection.read','inspection');
 IF NOT EXISTS(SELECT 1 FROM public.recipe_collections WHERE id=p_collection_id) THEN
  RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND';
 END IF;
 SELECT jsonb_build_object('publicationId',p.id,'releaseId',p.release_id,'snapshot',p.snapshot), p.digest
  INTO published, published_digest
  FROM private.collection_active_publications a JOIN private.collection_publications p ON p.id=a.publication_id
  WHERE a.collection_id=p_collection_id;
 SELECT private.collection_revision_json(h.revision_id), r.digest, r.id, h.state INTO working, working_digest, working_id, working_state
  FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id
  WHERE h.collection_id=p_collection_id;
 history := public.admin_collection_history(p_collection_id,NULL);
 impact := CASE WHEN working_id IS NULL THEN private.collection_impact(p_collection_id)
   ELSE private.collection_evaluate(p_collection_id, working_id) END;
 RETURN jsonb_build_object(
  'collectionId',p_collection_id,
  'identity',(SELECT jsonb_build_object('slug',slug,'title',title) FROM public.recipe_collections WHERE id=p_collection_id),
  'sourceMode',coalesce((SELECT source_mode FROM private.collection_sources WHERE collection_id=p_collection_id),'legacy'),
  'commerceState',private.collection_commerce_state(p_collection_id),
  'published',published,
  'working',working,
  'readiness',CASE WHEN working_id IS NULL
    THEN jsonb_build_object('digest',coalesce(published_digest,private.collection_digest('{}'::jsonb)),'checks','[]'::jsonb,
      'readyForApproval',false,'readyToPublish',false,'needsVerification',false)
    ELSE private.collection_readiness(working_digest, impact, working_state) END,
  'impact',impact,
  'review',private.collection_review_json(p_collection_id),
  'recipes',coalesce((SELECT jsonb_agg(jsonb_build_object('recipeId',c.id,'slug',c.slug,'title',c.title,
      'publication',c.publication_state,'totalMinutes',c.total_minutes,'imagePath',c.preview_image_path,
      'allergens',coalesce(to_jsonb(b.allergens),'[]'::jsonb),'storageNotes',b.storage_notes) ORDER BY c.id)
    FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id=c.id WHERE c.id IN (
      SELECT (m->>'recipeId')::uuid FROM jsonb_array_elements(coalesce(published#>'{snapshot,members}','[]'::jsonb)) m
      UNION SELECT (m->>'recipeId')::uuid FROM jsonb_array_elements(coalesce(working#>'{snapshot,members}','[]'::jsonb)) m
      UNION SELECT (x#>>'{}')::uuid FROM jsonb_array_elements(coalesce(impact#>'{value,protectedRecipeIds}','[]'::jsonb)) x)),'[]'::jsonb),
  'history',history->'events',
  'historyCursor',history->'nextCursor',
  'checkedAt',now());
END $$;

REVOKE ALL ON FUNCTION private.collection_current_head(uuid,jsonb), private.collection_fresh_evidence(uuid,uuid,text,boolean),
 private.collection_review_json(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_collection_submit(jsonb), public.admin_collection_issue(jsonb),
 public.admin_collection_review(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_collection_submit(jsonb), public.admin_collection_issue(jsonb),
 public.admin_collection_review(jsonb) TO authenticated;
