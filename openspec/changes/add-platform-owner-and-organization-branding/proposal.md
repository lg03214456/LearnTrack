## Why

LearnTrack currently resolves every authenticated user through exactly one organization membership, so it cannot represent a system developer who may inspect all tenants without pretending that developer belongs to one tenant. The application shell also shows a fixed product identity instead of the active organization's name, which makes tenant context unclear and increases the risk of acting in the wrong organization.

## What Changes

- Add a distinct, active `Platform Owner` identity that is independent of organization memberships and has explicit read-only access to every organization's business data.
- Keep organization Owners and all other tenant roles isolated to their own `organization_id`; platform access must not widen tenant-role permissions.
- Add platform-scoped permission definitions, persistence, RLS helpers, and append-only audit coverage for cross-organization reads.
- Split application authorization into platform and organization contexts, fail closed for inactive or unknown identities, and require explicit target organizations for tenant-data queries.
- Add a platform organization-selection experience. Before selection the shell identifies the platform context; after selection it prominently identifies both the selected organization and platform inspection mode.
- Replace fixed shell/home branding with the resolved organization name for organization users and for Platform Owners inspecting an organization.
- Add migration, provider, policy, repository, route, component, and cross-tenant isolation tests before enabling the new access path.
- **BREAKING**: authorization consumers that assume every actor has `membershipId`, `organizationId`, and one tenant scope must discriminate between platform and organization actors.

## Capabilities

### New Capabilities

- `platform-operator-access`: Platform Owner identity resolution, read-only cross-organization access, organization selection, tenant isolation, RLS enforcement, and platform audit requirements.
- `organization-context-branding`: Resolve and display the active organization's name throughout the authenticated shell while clearly distinguishing platform inspection mode.

### Modified Capabilities

None. The repository currently has no promoted main specs; existing organization RBAC behavior remains authoritative and is constrained, not broadened, by this change.

## Impact

- Affects authorization context types, identity and membership contracts, Supabase providers, policy helpers, route guards, repositories, application shell, login redirects, and audit boundaries.
- Adds Supabase migrations and bootstrap support for platform operators, platform permissions, platform audit events, and RLS policies without exposing the service-role key to the browser.
- Requires explicit organization targets for Platform Owner business-data reads and preserves the existing `organization_id` foreign-key and RLS isolation for tenant actors.
- Requires new integration tests using at least two organizations to prove Platform Owner read access and cross-tenant denial for organization users.
