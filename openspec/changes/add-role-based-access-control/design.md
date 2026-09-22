## Context

See `proposal.md` for motivation. The application is a single Next.js deployment with Server Components, client feature components, server-only repositories, and centralized mock fixtures. The current organization is hard-coded and `Profile.role` contains only `admin | teacher`; there is no session provider, authorization service, protected route boundary, or persistent database. Existing student access already joins enrollments and fails closed for unavailable classes, which provides the starting point for class scope.

## Goals / Non-Goals

**Goals:**

- Establish one server-owned authorization context used consistently by pages, repositories, commands, navigation, and UI controls.
- Model organization membership, role permissions, account status, and assigned-class scope without coupling features to mock fixtures.
- Provide realistic account and role administration UI with testable mock commands.
- Make replacement with Supabase Auth, PostgreSQL tables, and RLS an adapter change rather than a UI rewrite.

**Non-Goals:**

- Production login, password reset, email delivery, MFA, OAuth, or real invitations.
- Claiming mock persona selection or in-memory records provide production security.
- Installing the Supabase SDK, creating a hosted project, or applying SQL/RLS migrations in this change.
- Fine-grained per-student exceptions, parent/student portals, billing roles, or multiple simultaneous organization memberships in the UI.

## Decisions

### 1. Use RBAC plus a separate data-scope decision

Roles grant stable permission codes such as `students.read` and `attendance.manage`; they do not encode specific class identifiers. The resolved authorization context separately carries `organization-wide` or `assigned-classes` scope and allowed class IDs.

This prevents role explosion such as one role per teacher/class combination. A pure role-only model was rejected because teachers with the same role still require different data visibility.

### 2. Resolve identity only on the server

Introduce an `IdentityProvider` contract returning the active member context. The mock adapter resolves a development persona from a server-readable selector, while production will resolve a Supabase session. Client components receive only a capability view needed for rendering; they never supply authoritative role, organization, or scope values.

The mock persona selector may set an opaque persona key for development convenience, but every server request resolves the complete context again from trusted mock data. Passing the entire user object through query parameters or client state was rejected.

### 3. Centralize permission metadata and authorization policy

A permission catalog defines code, module, label, description, and optional dependency. An authorization service exposes semantic checks such as permission evaluation and class accessibility. Pages and commands call this boundary before repositories; repositories additionally accept an already-resolved access scope to constrain queries.

Scattered role-name conditionals such as `role === "admin"` were rejected because they drift as roles become editable.

### 4. Keep client-safe and server-only boundaries explicit

Client-safe feature types contain permission codes, administration view models, filter state, and command results. Identity resolution, mock relations, policy evaluation, repository implementations, and raw account email records remain under `src/server/` with `server-only` guards where appropriate.

Navigation is built from declarative items with required permissions. Hiding an item is a usability result only; the corresponding server page independently authorizes access.

### 5. Model mock data like the future relational schema

Normalized fixtures mirror the future tables:

```text
profiles
organization_memberships -> profiles, organizations, roles
roles
permissions
role_permissions -> roles, permissions
class_assignments -> memberships, classes
```

System roles are identified explicitly, not inferred by display name. The owner role is protected, and service rules prevent removal or deactivation of the last active owner.

### 6. Use feature-oriented administration modules

Place reusable access types and UI under `src/features/access-control/`; add server identity, policy, repository, and service boundaries under `src/server/auth/`, `src/server/authorization/`, and `src/server/repositories/`. Routes `/settings/accounts` and `/settings/roles` remain thin Server Components.

Account filters remain URL-backed. Role permission toggles use a focused Client Component that submits a validated command and refreshes the server result. The mock repository can persist updates for the running development process, but the UI must label them as mock data and tests must reset state between cases.

### 7. Map the same contracts to Supabase later

The production adapter will map Supabase `auth.users.id` to profiles and organization memberships. Application services continue to enforce business rules; PostgreSQL RLS provides a second, fail-closed database boundary using the authenticated user and organization/class relationships. Service-role credentials must never reach the browser.

## Risks / Trade-offs

- **Mock persona selection can be mistaken for real authentication** → Display a persistent development notice, isolate the selector behind a development adapter, and document that production data is prohibited until Supabase Auth and RLS are implemented.
- **UI and server permissions can drift** → Derive both from the same permission catalog and cover direct-URL and direct-command denial in tests.
- **Editable roles can remove required permissions** → Encode dependencies such as write requiring read and validate them server-side.
- **Administrators can lock out the organization** → Protect system-owner invariants and reject changes that leave no active owner.
- **Class filters can reveal inaccessible identifiers** → Return the same unavailable response for missing, cross-organization, and unassigned classes.
- **Process-memory mock updates are not durable across restarts** → Label the limitation and keep persistence behind a repository contract.
- **Authorization joins add query complexity** → Pass normalized access scope into repositories and later index organization, membership, role, and class-assignment foreign keys.

## Migration Plan

1. Add normalized mock identity, membership, role, permission, and class-assignment records plus relationship tests.
2. Introduce server identity and authorization contracts, then protect existing routes and repository reads before adding administration screens.
3. Add capability-driven navigation and mock persona selection, followed by account and role administration UI and commands.
4. Document the Supabase schema/RLS mapping and keep the mock adapter as the development fallback.
5. In a later change, create Supabase tables and policies, migrate seeded roles, replace `IdentityProvider` and repositories, and run adapter contract/integration tests.

Rollback is performed by restoring the previous layout and repository wiring; normalized mock records are additive and contain no production data.
