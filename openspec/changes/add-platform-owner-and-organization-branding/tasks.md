## 1. Authorization Contracts and Tests

- [x] 1.1 Add failing type and policy tests for discriminated platform and organization authorization contexts, separate permission catalogs, explicit organization targets, tenant isolation, and read/write separation; verify the focused Vitest suite fails for the expected missing behavior
- [x] 1.2 Implement platform and organization authorization context types and exhaustive policy helpers; verify typecheck and authorization policy tests pass
- [x] 1.3 Update existing tenant authorization consumers to narrow organization actors without weakening current role and scope checks; verify the full existing authorization and service test suites pass

## 2. Platform Persistence and RLS

- [x] 2.1 Extend migration tests for platform operators, platform permissions, role assignments, protected audit history, RLS enablement, anonymous denial, and self-promotion denial; verify the migration suite fails before schema implementation
- [x] 2.2 Add additive migrations for `platform_operators`, `platform_permissions`, `platform_role_permissions`, and append-only `platform_audit_logs` with indexes and constraints; verify static migration tests pass
- [x] 2.3 Add private platform-permission helpers and read-only platform branches to protected tenant SELECT policies while preserving tenant INSERT/UPDATE/DELETE policies; verify migration tests detect read/write separation
- [x] 2.4 Add safe one-time Platform Owner bootstrap and verification SQL that links a verified Auth user without organization membership or embedded credentials; verify bootstrap tests and idempotency/error behavior
- [ ] 2.5 Add authenticated two-organization database integration coverage for Platform Owner reads, tenant cross-organization denial, anonymous denial, self-promotion denial, and platform mutation denial; verify the RLS integration suite passes against the test database

## 3. Identity Resolution and Audit

- [ ] 3.1 Extend Supabase provider fakes and identity tests for active/inactive Platform Owners, zero-membership platform login, organization fallback, and organization Owner platform denial; verify focused provider and authentication tests fail before implementation
- [x] 3.2 Implement platform identity resolution before tenant membership resolution without granting platform access by email, order, or service-role status; verify provider, authentication, and session tests pass
- [ ] 3.3 Add a platform audit repository and allowlisted cross-organization read/denial events with target organization and request correlation; verify append-only behavior and sensitive-field exclusion tests

## 4. Organization Context and Branding

- [ ] 4.1 Add organization-context repository tests for membership-derived names, platform target resolution, inactive/missing organizations, rename freshness, and forged-label rejection; verify focused tests fail before implementation
- [x] 4.2 Implement trusted organization summary resolution for organization actors and explicitly selected Platform Owner targets; verify repository and authorization tests pass
- [x] 4.3 Update the authenticated shell and landing experience to display the organization name, `LearnTrack 平台管理` without a platform selection, and a persistent platform inspection indicator after selection; verify component and accessibility tests cover each state

## 5. Platform Workspace and Safe Reads

- [ ] 5.1 Add route tests proving organization users cannot open platform routes, Platform Owners can list active organizations, and no selection exposes tenant data; verify focused route tests fail before implementation
- [x] 5.2 Implement the platform organization list and server-validated selection flow using immutable organization IDs; verify URL labels, local storage, and unsigned values cannot determine authoritative organization context
- [x] 5.3 Add explicit target-organization read adapters only for Supabase-backed business data and fail closed for remaining Mock-only features; verify missing targets and unsupported repositories return denial rather than unscoped data
- [x] 5.4 Add tests for switching from organization A to B without retaining A data and for auditing each platform tenant inspection; verify route/repository integration tests pass

## 6. Documentation and Completion

- [x] 6.1 Update the Supabase handoff with migration order, Platform Owner bootstrap, platform permission boundaries, organization branding behavior, rollback, and two-tenant verification steps; verify no credentials or real identifiers are documented
- [ ] 6.2 Run formatting, lint, typecheck, unit/integration tests, migration validation, production build, and the two-organization browser acceptance matrix; record any unrelated pre-existing failure and verify all change-related checks pass
- [ ] 6.3 Verify the deployed test environment shows each organization user's organization name, Platform Owner read-only inspection across two organizations, tenant cross-organization denial, mutation denial, and platform audit entries before marking the change complete
