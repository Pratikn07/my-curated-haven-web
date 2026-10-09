-- Read only this actor's committed recipe publication receipts. The operation
-- table stays private, and the RPC exposes no request payload or other audits.
CREATE OR REPLACE FUNCTION public.admin_recipe_operations(p_recipe_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid;
  receipts jsonb;
BEGIN
  actor := private.admin_assert('recipe.read', 'inspection');
  IF p_recipe_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'operationId', recent.operation_id,
    'recipeId', recent.target,
    'action', recent.action,
    'revisionId', recent.result->'revisionId',
    'version', recent.result->'version',
    'digest', recent.result->'digest',
    'noChange', recent.result->'noChange',
    'committedAt', recent.committed_at,
    'publication', recent.result->'publication'
  ) ORDER BY recent.committed_at DESC, recent.operation_id DESC), '[]'::jsonb)
  INTO receipts
  FROM (
    SELECT operation_id, target, action, result, committed_at
    FROM private.admin_operations
    WHERE actor_id = actor
      AND target = p_recipe_id
      AND action IN ('revision.publish', 'recipe.withdraw')
      AND result IS NOT NULL
      AND committed_at IS NOT NULL
    ORDER BY committed_at DESC, operation_id DESC
    LIMIT 10
  ) recent;
  RETURN receipts;
END $$;

REVOKE ALL ON FUNCTION public.admin_recipe_operations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recipe_operations(uuid) TO authenticated;
