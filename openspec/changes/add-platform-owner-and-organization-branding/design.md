## Context

See `proposal.md` for motivation. Today `AuthorizationContext` assumes one organization membership and one tenant scope, the Supabase membership adapter rejects zero or multiple active memberships, and authenticated shell branding is fixed rather than resolved from `organizations`. Existing RLS helpers derive access from `auth.uid()`, active memberships, role permissions, and relationship scope. Business repositories remain partly Mock-backed, so platform access must not create an unscoped fallback over those stores.

## Goals / Non-Goals

**Goals:**

- Represent platform and organization actors as distinct, exhaustively checked authorization contexts.
- Permit active Platform Owners to read an explicitly selected organization's data across tenants while denying tenant mutations.
- Preserve organization membership, permission, relationship, and RLS isolation for every tenant actor.
- Resolve organization display names from trusted server data and expose the active context in the shell.
- Make cross-organization reads attributable through append-only platform audit events.

**Non-Goals:**

- Platform writes to tenant business data.
- Public platform-operator registration or browser-side operator provisioning.
- Automatic multi-organization membership selection for ordinary organization users.
- Migrating every remaining Mock business repository within this change; platform read routes may expose only repositories completed for Supabase and must fail closed elsewhere.
- Custom tenant subdomains.

## Decisions

### 1. Use a discriminated authorization-context union

Introduce `actorType: "platform" | "organization"`. Platform contexts contain platform role and permission data but no fabricated membership or organization ID. Organization contexts retain membership, organization, tenant permissions, and relationship scope. Authorization helpers accept only the appropriate permission family.

Alternative: add `isPlatformOwner` to the existing context and use a sentinel organization ID. Rejected because every existing consumer could accidentally treat the sentinel as a tenant, while optional organization fields would make fail-open mistakes easier.

### 2. Persist platform governance separately from tenant RBAC

Add `platform_operators`, `platform_permissions`, `platform_role_permissions`, and append-only `platform_audit_logs`. Platform assignments link to stable profiles but not organization memberships. Only trusted bootstrap or server-only platform administration may create assignments.

Alternative: create a special platform organization and reuse tenant roles. Rejected because it would make membership-based RLS indistinguishable from global authority and could leak platform permissions into tenant role management.

### 3. Grant explicit read-only cross-tenant access

Define `platform.organizations.read`, `platform.tenant_data.read`, and `platform.audit.read`. Do not define or grant tenant-data mutation permission in this change. Platform-aware reads require an explicit target organization; missing target organization is an authorization error rather than an all-tenants query.

Alternative: treat Platform Owner as an unconditional bypass. Rejected because future tables and actions would become writable by default and tests could not prove least privilege.

### 4. Keep platform inspection separate from ordinary tenant navigation

Add a platform workspace that lists authorized organizations. Selection uses an immutable organization ID carried in a server-validated request/session context; URL slugs and labels are presentation hints only. Platform inspection routes resolve the target organization, authorize it, and render a persistent inspection indicator. No selection shows `LearnTrack 平台管理` and no tenant data.

Alternative: remove `organization_id` from repository filters for Platform Owner. Rejected because a missing filter would become indistinguishable from authorized global access.

### 5. Resolve branding through an organization-context view

Extend authenticated layout data with a server-resolved organization summary containing stable ID, current name, and status. Organization users receive the summary from their membership. Platform users receive no summary until they select a target. The shell renders the authoritative name; it never trusts browser-supplied labels.

Alternative: store organization name in the session token. Rejected because renames would remain stale and could drift from authorization data.

### 6. Extend RLS without using the service role as user authority

Add private helpers that resolve active platform permissions through `auth.uid()`. Read policies may allow either existing tenant relationship checks or `platform.tenant_data.read`. Insert, update, and delete policies remain tenant-scoped. Platform operator tables deny ordinary authenticated writes, and the service-role key remains server-only.

Alternative: perform platform reads with the service-role client. Rejected because service role bypasses RLS and would make per-user platform authorization and denial tests ineffective.

### 7. Separate platform and tenant audit stores

Cross-organization reads and platform-governance actions write to `platform_audit_logs`, including target organization when applicable. Tenant mutations continue using organization-scoped `audit_logs`. Both stores are append-only, omit credentials and raw sensitive payloads, and fail closed for security-sensitive operations.

Alternative: make `audit_logs.organization_id` nullable. Rejected because it would complicate current tenant RLS and mix platform visibility with tenant-owned audit history.

### 8. Lead implementation with authorization and RLS tests

First introduce failing tests for context discrimination, platform login resolution, explicit target enforcement, read/write separation, organization branding, protected migrations, and a two-organization RLS matrix. Static migration string tests remain useful but do not replace database behavior tests executed with authenticated identities.

## Risks / Trade-offs

- [Platform Owner can view sensitive data across every tenant] → Limit the change to explicit read permission, show persistent inspection context, and append a platform audit event for each cross-tenant entry/read boundary.
- [Existing code assumes `organizationId` always exists] → Use a discriminated union and exhaustive helpers; typecheck must identify every unsafe consumer before completion.
- [Partial Mock repositories cannot provide safe platform reads] → Enable platform inspection only for Supabase-backed repositories and fail closed for unmigrated features.
- [RLS policies become more complex] → Centralize platform permission checks in private SQL helpers and test a fixed two-organization matrix for every protected table.
- [Branding can display stale or forged tenant names] → Resolve names server-side from stable organization IDs and clear prior organization data when selection fails.
- [Audit volume increases] → Audit entry into tenant context and sensitive cross-tenant reads with small allowlisted metadata rather than duplicating full records.

## Migration Plan

1. Add failing unit and integration tests for the new actor union, platform read-only policy, two-organization isolation, and organization-name rendering.
2. Add platform tables, permission seeds, RLS helpers, policies, bootstrap/verification scripts, and platform audit persistence.
3. Migrate authorization contracts and identity resolution to return platform or organization contexts; keep existing organization authentication behavior intact.
4. Add explicit organization-target repositories and platform workspace routes only for safe, Supabase-backed reads.
5. Resolve organization summaries in authenticated layouts and render organization-aware branding and inspection indicators.
6. Seed one verified Platform Owner in the test environment, create two tenant fixtures, and execute the complete RLS and browser acceptance matrix.
7. Deploy migrations before application code, bootstrap the Platform Owner, deploy the compatible application, and require a fresh login.

Rollback disables platform-operator assignments and removes platform routes while preserving platform audit history. Tenant authentication and organization RLS continue using the existing path; migrations that contain durable audit records are not destructively rolled back.
