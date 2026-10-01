# Account deletion: read-only catalog verification

Project: `tcaghsjndfaxlsgaqrdi` (Oharu). Checked 2026-10-01 using catalog-only SELECT queries; no account records, tokens, secrets, deletes, migrations or deployment were accessed or executed.

- `public.mcp_tokens.user_id` and `public.admins.user_id` reference `auth.users(id)` with `ON DELETE CASCADE`.
- `public.todos.user_id` still has no foreign key to `auth.users`; the reviewed migration is not applied.
- No noninternal triggers were found on `auth.users`, `public.todos` or `public.admins`.
- MCP token triggers exist only BEFORE INSERT and BEFORE UPDATE (`mcp_tokens_force_insert_defaults_trg`, `mcp_tokens_guard_update_trg`). Neither is a DELETE trigger.
- Storage bucket count is zero.
- Other public owner columns belong to `dashboard_delivery_ledger`, `dashboard_snapshots`, `dashboard_services`, and `dashboard_subscriptions`, with text owner IDs. These unrelated dashboard tables are excluded from the Oharu deletion implementation and are not modified.
- Auth identities, sessions, MFA factors, one-time tokens, OAuth authorizations/consents, WebAuthn credentials/challenges and MFA recovery code sets have user foreign keys with CASCADE. `auth.scim_users` uses SET NULL. This catalog check is not an assertion that every provider-side artifact or already-issued access JWT is immediately revoked.

The catalog establishes relationship definitions only. Actual cascade execution, provider OAuth, MFA, remote device cleanup and production deletion remain untested. No operational user deletion is permitted for verification. The server gate remains `securityPrerequisites:false` until independent review and the deployment prerequisites pass.
