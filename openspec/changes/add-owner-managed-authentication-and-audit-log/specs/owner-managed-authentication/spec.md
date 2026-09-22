## Purpose

Provide a closed, Owner-governed staff identity lifecycle that supports safe login and email-verified password recovery now while preserving a direct migration path from development Mock providers to production authentication.

## ADDED Requirements

### Requirement: Closed account enrollment
The system SHALL reject public self-registration and SHALL allow account creation only through an authenticated actor with account-creation permission. Account creation SHALL capture a unique login email, display name, initial password, one or more roles, organization, status, and server-validated data scope.

#### Scenario: Owner creates a staff account
- **WHEN** an authorized Owner submits a valid staff account, initial password, role assignments, and scope
- **THEN** the system creates one disabled-or-active internal identity linked to that organization and records the creator

#### Scenario: External visitor attempts registration
- **WHEN** an unauthenticated visitor attempts to create an account outside the Owner workflow
- **THEN** the system rejects the request without creating an identity

### Requirement: Authenticated login and route protection
The system SHALL authenticate credentials through the configured server-side Auth Provider and SHALL resolve roles, their combined permissions, organization, and permission-specific record relationships from server-owned membership data before granting dashboard access. Combining roles SHALL NOT broaden a record relationship for one role merely because another role grants a different relationship.

#### Scenario: Active account signs in
- **WHEN** an active account submits valid credentials
- **THEN** the system creates a session and redirects the account to its permitted starting route

#### Scenario: Invalid or disabled account signs in
- **WHEN** credentials are invalid or the resolved account is disabled
- **THEN** the system denies access with a non-sensitive error and does not create a usable session

#### Scenario: Unauthenticated dashboard request
- **WHEN** a request without a valid session reaches a protected dashboard route
- **THEN** the system redirects to login and does not reveal protected content

### Requirement: Separate person, login, role, and relationship records
The system SHALL keep the internal person profile stable and SHALL link it optionally to an Auth user. Organization membership, role assignments, student self-login links, student-contact links, and class relationships SHALL be stored separately. A teacher, student, or student contact MAY exist without an Auth user and SHALL gain no login capability until explicitly linked and activated.

#### Scenario: Student exists without login
- **WHEN** an authorized actor creates a student without creating an Auth user
- **THEN** the student remains available for authorized teaching and administrative workflows without login capability

#### Scenario: Student receives a self-login account
- **WHEN** an authorized actor links an active student to a verified Auth user through an active student-user relationship
- **THEN** that Auth user may act as the student only while the organization membership, student-user relationship, and student status are all active

#### Scenario: Student has at most one active self-login
- **WHEN** an authorized actor attempts to create a second active self-login relationship for the same student
- **THEN** the system rejects the relationship without replacing or weakening the existing active link

#### Scenario: Contact exists without login
- **WHEN** an Owner records a student contact for communication or emergency purposes without granting system access
- **THEN** the contact remains linked to the student without an Auth user or active login membership

#### Scenario: Membership receives multiple roles
- **WHEN** an authorized Owner assigns more than one eligible role to the same active organization membership
- **THEN** the membership resolves the union of those role permissions while each protected resource remains limited by the relationship applicable to the requested permission and record

#### Scenario: Neutral student contact receives login access
- **WHEN** a student contact is explicitly linked to a verified Auth user and assigned an active contact role
- **THEN** the account may authenticate but can access only students linked through the neutral student-contact relationship

### Requirement: Student lifecycle remains separate from login lifecycle
The system SHALL preserve inactive, graduated, or archived student records and their history for authorized administrative and teaching access. A student who is not active, or whose student-user relationship is not active, SHALL NOT receive student-self access. Disabling student-self access SHALL NOT disable unrelated active roles held by the same organization membership.

#### Scenario: Inactive student remains searchable
- **WHEN** an authorized Owner or relationship-scoped teacher searches historical or inactive students
- **THEN** the system may return the inactive student and retained education history within the actor's organization and resource relationship

#### Scenario: Inactive student attempts self access
- **WHEN** an Auth user linked to an inactive student requests student-self data
- **THEN** the system denies student-self access even when the Auth session remains valid

#### Scenario: Multi-role user loses only student-self access
- **WHEN** a membership with both student and teacher roles has its student status or student-user relationship disabled
- **THEN** student-self access is denied while independently valid teacher access continues to follow teacher permissions and class assignments

### Requirement: Email-verified password management
The system SHALL allow an authenticated account holder to request a password-change email and an unauthenticated account holder to request a forgot-password email. Reset responses SHALL not reveal whether an email exists, and each reset link SHALL be single-use, time-limited, and bound to the intended account.

#### Scenario: Account holder changes their password
- **WHEN** an authenticated account holder follows a valid password-change email link and submits a compliant new password
- **THEN** the system replaces the credential, consumes the link, and revokes other existing sessions

#### Scenario: Visitor requests password recovery
- **WHEN** a visitor submits any syntactically valid email to the forgot-password flow
- **THEN** the system returns the same confirmation response regardless of account existence and sends a reset email only for an eligible account

#### Scenario: Reset link is invalid
- **WHEN** a password link is expired, consumed, altered, or belongs to a disabled account
- **THEN** the system refuses the password change and provides a safe path to request another link

### Requirement: Owner credential administration
The system SHALL allow an authorized Owner to change an account email, resend password setup, force a password reset, revoke sessions, disable an account, or restore an eligible account. The system MUST NOT expose an existing password to any actor.

#### Scenario: Owner forces password reset
- **WHEN** an Owner forces a reset for an account in the same organization
- **THEN** the system invalidates current sessions and sends a new password link without exposing the previous credential

#### Scenario: Owner changes login email
- **WHEN** an Owner replaces an account email with a unique valid email
- **THEN** future authentication and password emails use the new address and the action is attributable to the Owner

### Requirement: Session lifecycle
The system SHALL invalidate all active sessions when an account is disabled and SHALL support explicit logout and Owner-initiated session revocation.

#### Scenario: Account is disabled while signed in
- **WHEN** an Owner disables an account that has active sessions
- **THEN** subsequent protected requests are denied and the account must not regain access from a stale session

### Requirement: Replaceable authentication and email providers
The system SHALL expose stable authentication and email behavior independent of the selected provider. Development MAY use explicit Mock providers, while production SHALL require configured production providers and SHALL fail closed instead of falling back to a Mock identity.

#### Scenario: Development uses Mock providers
- **WHEN** the application runs in an explicitly configured development Mock mode
- **THEN** login and email flows are simulated with non-production identities and visibly identified as testing behavior

#### Scenario: Production provider is missing
- **WHEN** production starts or receives an authentication request without complete production provider configuration
- **THEN** the system refuses authentication and does not assume an Owner identity
