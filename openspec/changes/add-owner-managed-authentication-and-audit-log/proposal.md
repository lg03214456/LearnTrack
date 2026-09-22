## Why

LearnTrack currently trusts a development-only persona cookie and defaults missing identity to Owner, so it cannot safely support public testing, real staff accounts, password recovery, or attributable operational history. The system needs a closed, Owner-governed authentication flow and durable audit trail that can run against Mock providers now and switch to Supabase later without rebuilding the UI or authorization model.

## What Changes

- Add a closed staff login flow with no public registration.
- Allow only Owner-authorized account administration to create accounts, choose the login email and initial password, assign one or more roles, disable accounts, and revoke sessions; resolve accessible records per permission and resource relationship instead of one merged global scope.
- Separate people, optional login identities, organization memberships, role assignments, and record relationships so teachers, students, and neutral student contacts can be created and managed without being forced to own an Auth account; link a student to a self-login only through an explicit student-user relationship.
- Allow an authenticated account holder to change their own password through a verified email link and an unauthenticated account holder to request a non-enumerating forgot-password email.
- Let Owner change an account email, resend password setup, or force a password reset without reading the current password.
- Separate authentication, email delivery, identity membership, and audit persistence behind provider/repository contracts so Mock implementations can be replaced by Supabase Auth, SMTP, PostgreSQL, and RLS.
- Record login security events and material account, permission, student, class, attendance, curriculum, progress, assessment, and export mutations in an append-only audit log without storing passwords or reset tokens.
- Remove the development persona switch from production and fail closed when production authentication is unavailable; do not fall back to a Mock Owner.

## Capabilities

### New Capabilities

- `owner-managed-authentication`: Closed account creation, login, email-verified password management, session lifecycle, provider switching, and production fail-closed behavior.
- `audit-logging`: Append-only security and business mutation history with actor, organization, resource, result, and safe change metadata.

### Modified Capabilities

None. Existing RBAC permissions and data scopes remain authoritative after the authenticated identity is resolved.

## Impact

- Affects the dashboard layout, login and password routes, account management, identity resolution, Server Actions, and protected repositories.
- Introduces Auth, Email, Session, Membership, and Audit contracts with Mock adapters first and Supabase/SMTP/PostgreSQL adapters later.
- Requires normalized roles, permissions, membership-role assignments, student self-login links, neutral student-contact relationships, resource-specific relationship checks, new account and audit permissions, environment-based provider selection, production guardrails, and security-focused tests.
- Future Supabase rollout will require Auth configuration, redirect URLs, a sender email/domain, SMTP credentials, membership tables, audit tables, RLS policies, and secret deployment variables.
