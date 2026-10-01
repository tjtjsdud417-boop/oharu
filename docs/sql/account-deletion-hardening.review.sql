-- REVIEW ONLY. Not applied; intentionally outside supabase/migrations.
-- Exact project: tcaghsjndfaxlsgaqrdi / oharu.
-- Authorized launch scope; requires independent release security review before use.
-- No rows are deleted by adding this constraint. Existing orphan rows are not
-- validated, removed or reassigned. No RLS policy, credentials or grants change.
-- New writes are checked immediately. An explicit authenticated owner deletion
-- through Auth admin.deleteUser then deletes that owner's todos in the same
-- PostgreSQL transaction, rather than two separate HTTP mutations.
-- A still-unexpired JWT cannot recreate todos for the deleted auth.users ID.

ALTER TABLE public.todos
  ADD CONSTRAINT todos_user_id_account_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE CASCADE NOT VALID;

-- Read-only verification after an approved apply:
-- SELECT conname, convalidated, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.todos'::regclass
--   AND conname = 'todos_user_id_account_fkey';

-- Before rollback, deploy the deletion endpoint with its deletion gate disabled.
-- Rollback of the constraint only, if required; does not restore deleted data:
-- ALTER TABLE public.todos DROP CONSTRAINT todos_user_id_account_fkey;
-- No account/data deletion must be exercised on production without approval.
