# Account deletion schema evidence — 2026-10-01

Project: tcaghsjndfaxlsgaqrdi / oharu / ap-southeast-1.

Independent review and source 511826e CI success confirmed before application.

Applied once using Supabase apply_migration, name account_deletion_todos_fk:

```sql
ALTER TABLE public.todos
  ADD CONSTRAINT todos_user_id_account_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE CASCADE NOT VALID;
```

Result: success:true. Read-only catalog rechecks before and after inactive function deployment:

```json
{"constraint":"todos_user_id_account_fkey","validated":false,"definition":"FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID","buckets":0}
```

confdeltype=c. Existing rows were not validated or deleted. No RLS, grants, credentials, storage writes, user deletion or orphan cleanup performed. This metadata evidence is not a live account deletion/cascade E2E test.
