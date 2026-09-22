## Context

See `proposal.md` for motivation. The current `getAuthorizationContext` reads a development persona cookie and defaults to Owner. Existing pages and Server Actions already consume an `AuthorizationContext`, permission catalog, and record scope, so the safest migration is to preserve that downstream contract and replace how authenticated identity is resolved. Business data is still Mock-backed, and Supabase has not been configured yet.

## Goals / Non-Goals

**Goals:**

- Make authentication, email delivery, account membership, sessions, and auditing replaceable at explicit server boundaries.
- Preserve existing RBAC and repository scope behavior after identity resolution.
- Support a complete Mock UI flow now without creating a hidden production bypass.
- Make future Supabase Auth, SMTP, PostgreSQL, and RLS integration additive rather than a rewrite.
- Keep credential secrets and service-role capabilities server-only.

**Non-Goals:**

- Public registration, social login, or self-service role and email changes.
- General parent, student, and contact login rollout beyond establishing the optional-link schema and RLS-safe relationship model.
- Migrating student, class, curriculum, attendance, and progress persistence to Supabase.
- Product clickstream analytics; audit events cover security and material business actions only.

## Decisions

### 1. Preserve `AuthorizationContext` as the application identity contract

An Auth Provider authenticates a session, then an Identity/Membership repository maps its stable auth user ID to the internal profile, organization, role, permissions, and scope. Pages, Services, and Repositories continue receiving the resulting `AuthorizationContext`.

Alternative: pass raw provider users throughout the application. Rejected because it would couple RBAC and domain code to Supabase and make Mock testing harder.

### 2. Separate Auth, Email, Membership, and Audit ports

Use server-only contracts for credential/session behavior, email delivery, internal membership lookup, and audit persistence. Mock adapters are selected only by an explicit development configuration; production adapters are selected by production configuration.

Alternative: one large authentication service owning all persistence and email. Rejected because provider migration, testing, and failure handling would become tightly coupled.

### 3. Fail closed in production

Production configuration validation occurs before authentication is considered available. Missing provider settings return an unavailable/denied state; they never select the Mock adapter or default persona. The Mock persona switch is rendered only in the explicit development mode.

Alternative: fall back to Mock for deployment convenience. Rejected because it can silently grant Owner access.

### 4. Owner provisioning separates the stable person, optional provider identity, membership, and role assignments

The account Service validates permission, organization, unique email, roles, and relationship inputs before invoking the Auth Provider and membership persistence. `profiles` represents a stable person and keeps a nullable unique `auth_user_id`; `organization_memberships` represents organization and whole-account lifecycle status; `membership_roles` assigns one or more roles. Partial failure must be compensated or represented as a non-login pending account so an orphaned provider identity cannot gain access.

The internal profile ID remains the stable domain actor reference. A nullable `authUserId` allows existing Mock accounts to be linked to production Auth later without changing historical foreign keys.

Role and permission definitions are normalized as `roles`, `permissions`, and `role_permissions`. Stable permission codes such as `students.read` exist in both the application catalog and seeded database rows. Adding a role adds data, not a role-specific table. The current `AuthorizationContext.roleId` remains a compatibility view during migration and is replaced or extended with role IDs without weakening downstream permission checks.

Students remain domain records independently of authentication. `students.status` represents the student's business lifecycle, while `student_user_links` explicitly relates a student to an Auth user for student-self access and carries its own lifecycle status. A partial unique constraint permits at most one active self-login link per student. Disabling or unlinking student-self access preserves the student record and education history.

Student relationships use the neutral `student_contacts` name rather than assuming every contact is a parent or guardian. A contact profile can exist without an Auth user; login is granted only after explicit Auth linkage, active membership, role assignment, and RLS-protected student linkage. Teacher scope remains separate through class assignments. `organization_memberships.status` controls whether the account may participate in the organization at all; it is not changed merely because one student relationship is disabled when another role remains valid.

### 5. Email links control password change and recovery

Owner chooses the initial email and password. An account holder changes or recovers the password through a single-use, time-limited provider link. Forgot-password responses are identical for existing and unknown emails. Owner can change email, resend setup, force reset, and revoke sessions, but cannot retrieve a password.

Alternative: allow direct self-service password changes with only the current password. Rejected because the confirmed requirement uses email verification and because verified links support forgotten passwords consistently.

### 6. Audit events are append-only and emitted at trusted boundaries

Authentication adapters emit security outcomes; Services emit domain mutation outcomes after permission and validation checks. An Audit Service normalizes event names, actor/resource references, results, request correlation, and safe diffs. UI components never author authoritative audit events.

Persistence starts with a resettable Mock store and later moves to an append-only organization-scoped PostgreSQL table with RLS. Passwords, hashes, tokens, and full reset URLs are prohibited fields.

### 7. Audit failure policy depends on operation risk

Account, credential, role, permission, export, and destructive lifecycle operations fail closed if their required audit event cannot be persisted. Lower-risk teaching-data operations return an operational error rather than pretending success; the implementation must not commit a mutation and silently lose its audit trail.

Alternative: best-effort logging after every write. Rejected because the most sensitive actions could become unattributable.

### 8. Resolve row scope per permission and resource relationship

Role permissions may be combined for an active membership, but row visibility is not represented by one unioned global scope. RLS and trusted repositories evaluate the relationship relevant to the requested operation and record: student-self access through active `student_user_links`, contact access through active `student_contacts`, teacher access through class assignments, and Owner access through organization ownership plus explicit permission.

An inactive student remains queryable by authorized organization actors whose relationship permits historical access, while student-self access additionally requires an active student record and active student-user link. A multi-role membership losing student-self access retains only the independently valid access granted by its other roles and relationships.

Alternative: combine all role scopes into one broad record set. Rejected because a user who is both a teacher and student, or teacher and contact, could inherit access to records unrelated to the permission being exercised.

## Risks / Trade-offs

- [Mock password behavior may be mistaken for production security] → Display a persistent Mock banner, use non-real seeded credentials, and prohibit Mock configuration in production.
- [Auth identity may be created while membership persistence fails] → Use a pending/disabled state and compensating cleanup; never authorize a provider user without active membership.
- [Email delivery failure can lock out staff] → Let Owner resend setup or force reset while preserving the same internal account identity.
- [Audit payloads can duplicate personal data] → Centralize allowlisted metadata and test prohibited keys and values.
- [Audit requirements can make writes unavailable] → Keep event payloads small and persistence local to the same trusted server boundary; surface retryable errors.
- [Provider migration can invalidate sessions] → Treat cutover as a planned re-login and link accounts by verified email plus explicit Owner review.
- [Multiple roles can accidentally broaden row access] → Resolve row scope per permission and resource relationship, and test mixed-role memberships against unrelated students and classes.

## Migration Plan

1. Add contracts, configuration validation, and Mock adapters while keeping existing persona behavior behind explicit development mode.
2. Add login/password/account/audit UI and route guards using the contracts.
3. Move account and domain mutations through audited Services and verify authorization remains server-enforced.
4. Create a Supabase project, sender configuration, redirect URLs, Auth adapter, membership/audit schema, and RLS policies.
5. Link existing internal accounts to Supabase auth user IDs, disable Mock mode, and require all users to establish fresh production sessions.
6. Validate Owner access, disabled-account denial, password email delivery, audit coverage, organization isolation, and rollback readiness before public use.

Rollback before production cutover restores the previous development-only build and Mock data. Rollback after production cutover disables login and restores the last compatible application version; it MUST NOT re-enable a Mock Owner on a public environment or discard durable audit events.

## Open Questions

- Exact password length, link expiry, session duration, login-rate limits, MFA policy, audit retention, and SMTP vendor can be selected during Supabase deployment without changing the provider contracts or user-visible workflow.
