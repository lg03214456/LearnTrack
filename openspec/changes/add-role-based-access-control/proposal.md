## Why

LearnTrack currently exposes every dashboard route and action to a hard-coded mock profile, so hiding a menu item would not prevent direct URL or server data access. A mock-first access-control boundary is needed now so account and role UI can be validated before Supabase Auth and PostgreSQL RLS replace the mock data source.

## What Changes

- Add organization-scoped mock accounts, memberships, roles, permission assignments, and class assignments for owner, administrator, teacher, and assistant personas.
- Add centralized permission codes and an authorization service that evaluates both role permissions and data scope.
- Protect dashboard routes, repository reads, navigation items, and mutation controls without trusting client-supplied roles or organization identifiers.
- Add account management and role-permission administration screens based on the supplied UI direction, including search, filters, status, role assignment, permission grouping, and protected system roles.
- Add distinct unauthorized and unavailable-resource responses that do not reveal whether inaccessible records exist.
- Keep authentication and authorization contracts independent of mock fixtures so Supabase Auth, relational permission tables, and RLS can replace the mock adapters later.
- Document the future Supabase mapping; this change does not install Supabase or claim production-grade authentication.

## Capabilities

### New Capabilities

- `role-based-access-control`: Defines organization membership, permission checks, class-scoped access, protected routes/actions, and fail-closed authorization behavior.
- `access-administration`: Defines account-management and role-permission administration behavior for authorized operators.

### Modified Capabilities

None.

## Impact

- Affects the Next.js dashboard layout, navigation, page loaders, repositories, feature components, mock relations, domain types, and automated tests.
- Introduces server-only identity and authorization boundaries plus client-safe permission-derived view models.
- Adds `/settings/accounts` and `/settings/roles` routes and a role-switching development control for exercising mock personas.
- Requires no external dependency or database migration in the mock phase; later Supabase adoption will add Auth, membership/role tables, class assignments, audit records, and RLS policies behind the same contracts.
