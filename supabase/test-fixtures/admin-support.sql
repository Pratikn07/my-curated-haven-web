-- Test-only synthetic support fixtures, always used inside a rollback transaction after admin-console.sql.
-- Phase 3 tasks add their orders, payments, sources and cases here. IDs use the f3000000-0000-4000-8000- prefix
-- and emails end in @synthetic.test; nothing here may name a real customer, account or provider object.
SELECT 1;
