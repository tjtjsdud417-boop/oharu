-- Oharu tcaghsjndfaxlsgaqrdi: account-deletion integrity constraint.
-- NOT VALID preserves existing rows, including any pre-existing orphan rows.
-- New writes are checked. Only an explicit future Auth account deletion cascades.
-- No RLS policies, grants, credentials or data-cleanup statements are changed.
-- Apply only after the independent release security review passes.
ALTER TABLE public.todos
  ADD CONSTRAINT todos_user_id_account_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE CASCADE NOT VALID;
