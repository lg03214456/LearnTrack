## Purpose

Provide an immutable, privacy-conscious record of authentication, account governance, permission changes, and material education-data operations so authorized reviewers can determine who performed an action, when it occurred, and what safely describable outcome followed.

## ADDED Requirements

### Requirement: Append-only audit events
The system SHALL append an audit event for security-relevant and material business operations and SHALL prevent ordinary application users from editing or deleting existing events.

#### Scenario: Material mutation succeeds
- **WHEN** an authenticated actor successfully changes an account, role, student, class, attendance, curriculum, progress, assessment, or export state
- **THEN** the system appends an event containing organization, actor, action, resource type, resource identifier, result, timestamp, request correlation, and safe change metadata

#### Scenario: Protected operation is denied
- **WHEN** a high-risk operation is denied because of authentication, permission, scope, validation, or conflict
- **THEN** the system appends a denied event without exposing protected resource details to the caller

### Requirement: Authentication event coverage
The system SHALL record login success, login failure, logout, password reset request, password change completion, email change, session revocation, account creation, account disablement, and account restoration.

#### Scenario: Login attempt completes
- **WHEN** a login attempt succeeds or fails
- **THEN** the system records the outcome, time, safe account reference when available, and request context without recording the submitted password

### Requirement: Sensitive data minimization
Audit events MUST NOT contain passwords, password hashes, access tokens, refresh tokens, reset tokens, full authentication links, or unnecessary copies of student personal data. Change metadata SHALL prefer changed field names and minimal before/after values appropriate to the resource sensitivity.

#### Scenario: Password is changed
- **WHEN** any password creation, change, or reset completes
- **THEN** the audit event records the action and outcome but contains no credential value or reset secret

### Requirement: Audit access control
The system SHALL restrict audit-log reading to actors with an explicit audit permission and organization-wide scope. Audit queries SHALL be scoped by organization and support filters for time, actor, action, resource, and result.

#### Scenario: Owner reviews organization events
- **WHEN** an authorized Owner filters audit history for their organization
- **THEN** the system returns only matching events from that organization in reverse chronological order

#### Scenario: Teacher requests audit history
- **WHEN** an actor without audit-read permission requests audit events
- **THEN** the system denies access without revealing whether matching events exist

### Requirement: Audit persistence portability
Audit-writing callers SHALL depend on a stable audit contract so development Mock persistence can be replaced by durable PostgreSQL persistence without changing protected UI and domain-action behavior.

#### Scenario: Audit repository changes provider
- **WHEN** the configured audit persistence changes from Mock to production storage
- **THEN** the same operations continue to emit equivalent event fields and enforcement behavior

