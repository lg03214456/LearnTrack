# Security and Action Rules

Use these rules for authentication, RBAC, organization scope, server actions, and database policies.

## Authorization model

- Treat UI visibility as guidance only. Every protected read or mutation must enforce permission again at the server, repository, or database boundary.
- Keep identity (`who`), role (`what category`), permission (`what action`), and scope (`which records`) separate.
- Scope organization-owned records by `organizationId` or an equivalent tenant key.
- Parent and student access must be restricted to linked student records, not broad role-wide access.
- Teacher access should be limited to assigned classes or students unless a broader permission is explicit.

## Actions

For every mutation:

1. Authenticate the caller.
2. Validate input shape and identifiers.
3. Check permission and record scope.
4. Perform the write through the server data boundary.
5. Return a typed, UI-safe result.
6. Refresh or invalidate only the affected data.

Never trust role, organization, student, or class ownership sent by the browser without verifying it against server-side data.

## Supabase

- RLS is a second enforcement layer, not a replacement for application checks.
- Policies should express tenant and relationship scope using stable identifiers.
- Service-role credentials remain server-only and must never enter browser bundles or public environment variables.
- Schema, policy, or authentication changes also require updating `frontend/docs/supabase-handoff.md`.

For relevant routes, contracts, and policy helpers, follow the access-control feature link in `docs/codemap.md`.
