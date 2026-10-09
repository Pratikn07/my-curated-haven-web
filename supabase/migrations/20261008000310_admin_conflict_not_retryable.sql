-- ADM_CONFLICT was raised with SQLSTATE 40001 (serialization_failure). PostgREST treats 40001 as a
-- transient database error and retries the whole request in a tight loop, so a stale save through the
-- API never returned and hammered the database (thousands of retries per second, observed locally on
-- PostgREST 14). Conflicts are a final answer, not a transient fault: raise them as PT409, which
-- PostgREST returns once as HTTP 409. The web app classifies by the ADM_CONFLICT message, so its
-- behaviour is unchanged.
--
-- Rewrites every console function in public/private that raises ADM_CONFLICT with 40001, changing only
-- that SQLSTATE. CREATE OR REPLACE keeps each function's owner, grants and security settings.
DO $$
DECLARE f record; def text; fixed text;
BEGIN
 FOR f IN SELECT p.oid, n.nspname, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname IN ('public','private') AND p.prokind='f' AND p.prosrc ~ 'ADM_CONFLICT' AND p.prosrc ~ '40001'
 LOOP
  def := pg_get_functiondef(f.oid);
  fixed := regexp_replace(def, $re$ERRCODE(\s*)=(\s*)'40001'(\s*,\s*MESSAGE\s*=\s*'ADM_CONFLICT')$re$,
    $rep$ERRCODE\1=\2'PT409'\3$rep$, 'g');
  IF fixed = def THEN RAISE EXCEPTION 'No ADM_CONFLICT 40001 pattern rewritten in %.%', f.nspname, f.proname; END IF;
  EXECUTE fixed;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname IN ('public','private') AND p.prosrc ~ $re$'40001'$re$) THEN
  RAISE EXCEPTION 'A console function still raises SQLSTATE 40001';
 END IF;
END $$;
