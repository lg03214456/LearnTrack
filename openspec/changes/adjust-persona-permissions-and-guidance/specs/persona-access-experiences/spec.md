## Purpose

提供可理解、可測試且最小權限化的角色體驗，使開發者能切換 Owner、主任、老師、學生與家長，並驗證每種身分的導覽、操作能力與資料範圍。

## ADDED Requirements

### Requirement: Owner retains institution governance
The system SHALL grant the active organization Owner organization-wide access to instructional, account, role, and reporting features, and MUST prevent other personas from changing or disabling the Owner.

#### Scenario: Owner experience
- **WHEN** the Owner persona is active
- **THEN** all organization management navigation and permitted actions are available with organization-wide scope

#### Scenario: Director targets Owner
- **WHEN** a director attempts to change the Owner account or role
- **THEN** the system rejects the command and leaves the Owner unchanged

### Requirement: Director manages daily operations without ownership control
The system SHALL allow a director to manage organization students, teaching records, classes, schedules, attendance, curriculum, accounts, and analytics, but MUST deny Owner mutation and system-role governance.

#### Scenario: Director performs daily administration
- **WHEN** the director opens instructional or account-management features
- **THEN** the system permits organization-wide daily operations supported by the director permission set

#### Scenario: Director opens role governance
- **WHEN** the director directly requests a role-governance mutation
- **THEN** the system denies the mutation even if a client submits the command manually

### Requirement: Teacher is limited to assigned classes
The system SHALL let a teacher read and record students, attendance, progress, assessments, and study plans only for assigned classes, and MUST deny account, role, teacher reassignment, class creation, completion, and archival operations.

#### Scenario: Assigned teacher work
- **WHEN** a teacher opens an assigned class or student connected to that class
- **THEN** the system exposes the permitted teaching records and mutation controls

#### Scenario: Teacher requests unassigned data
- **WHEN** a teacher requests another class or unrelated student
- **THEN** the system returns an unavailable or access-denied state without exposing the target record

### Requirement: Student sees only self-service learning data
The system SHALL provide a student persona that can view only the active student's own courses, attendance, progress, assessment history, and published teacher feedback.

#### Scenario: Student opens own learning record
- **WHEN** the student persona opens an allowed learning destination
- **THEN** only that student's records are returned and management controls are absent

#### Scenario: Student requests another student
- **WHEN** the student requests another student's identifier
- **THEN** the system denies access without revealing that student's information

### Requirement: Parent sees only linked children
The system SHALL provide a parent persona that can view only linked children's courses, attendance, progress, assessment history, and parent-visible feedback, and MUST hide internal notes and all management operations.

#### Scenario: Parent views linked child
- **WHEN** a parent opens a linked child's learning record
- **THEN** the system returns that child's parent-visible information

#### Scenario: Parent requests unlinked child
- **WHEN** a parent requests a student without an active guardian link
- **THEN** the system denies access without revealing the student record

### Requirement: Persona switch explains the experience
The development persona switcher SHALL identify every persona's role, data scope, recommended starting destination, and primary allowed operations before or immediately after selection.

#### Scenario: Developer inspects persona options
- **WHEN** the mock persona selector is visible
- **THEN** Owner, director, teacher, student, and parent options are available with concise workflow guidance

#### Scenario: Developer switches persona
- **WHEN** a persona is selected
- **THEN** the server-rendered navigation, current identity summary, role guidance, data scope, and action controls reflect that persona

### Requirement: Permission matrix remains centrally testable
The system SHALL derive effective permissions and data scope from server-owned role, membership, student, and guardian relationships rather than client-submitted role or target identifiers.

#### Scenario: Direct unauthorized operation
- **WHEN** any persona submits a mutation outside its permission or relationship scope
- **THEN** the server rejects the operation and makes no data change

