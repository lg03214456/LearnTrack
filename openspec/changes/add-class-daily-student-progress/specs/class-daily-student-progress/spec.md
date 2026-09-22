## Purpose

Defines a class-session workspace that records each attending student's work against that student's own curriculum plans while preserving dated progress history and current learning-item state.

## ADDED Requirements

### Requirement: Class-scoped daily workspace
The system SHALL provide an authorized user with a dated class-session workspace containing students whose class enrollments are active for that session, without assigning a curriculum version to the class.

#### Scenario: Open today's class session
- **WHEN** an authorized teacher opens the daily workspace for an assigned class and date
- **THEN** the system returns the class-session identity, schedule context, attendance state, and eligible class members

#### Scenario: Exclude inactive members from a new session
- **WHEN** a student is archived or the student's class enrollment ended before the session
- **THEN** the student is not added to the newly created session roster

#### Scenario: Preserve an existing session roster
- **WHEN** a student's enrollment ends after a class session has already been created
- **THEN** the existing session retains that student in its historical roster

### Requirement: Student-owned curriculum resolution
The system SHALL resolve available curricula independently for each student from that student's active study plans and SHALL NOT infer or assign a curriculum version from the class.

#### Scenario: Mixed-grade and mixed-version class
- **WHEN** class members have different grades, subjects, or curriculum versions
- **THEN** each member row exposes only that student's active plans and learning items

#### Scenario: Student has no active study plan
- **WHEN** an eligible class member has no active study plan
- **THEN** the workspace marks the student as requiring study-plan setup and does not permit a fabricated progress entry

### Requirement: Daily student progress entry
The system SHALL allow zero, one, or multiple progress entries per student in one class session, with each entry identifying an active study plan, one learning item, a resulting learning status, and an optional free-text note.

#### Scenario: Record one curriculum item
- **WHEN** a teacher selects a student's curriculum item, chooses `pending`, `in_progress`, or `completed`, and saves
- **THEN** the system records the resulting status for that item in the current class session

#### Scenario: Record multiple curricula
- **WHEN** a student works from multiple active study plans during one class session
- **THEN** the teacher can add and save a separate entry for each selected learning item

#### Scenario: Leave note empty
- **WHEN** a teacher saves a valid progress entry without a note
- **THEN** the system accepts the entry and does not synthesize page information

#### Scenario: Record page information as a note
- **WHEN** a teacher enters text such as `看到 p.42` in the optional note
- **THEN** the system preserves it as unstructured text and does not parse it or use it in completion calculations

#### Scenario: Do not update this session
- **WHEN** a teacher chooses `本次不更新` for a student
- **THEN** the system creates no progress entry and leaves that student's current learning-item states unchanged

### Requirement: Attendance-aware defaults
The system SHALL default present and late students to progress entry availability and default leave or absent students to `本次不更新`, while allowing an authorized teacher to make an explicit change before saving.

#### Scenario: Leave student is not updated by default
- **WHEN** the roster marks a student as on leave
- **THEN** the student's progress controls default to no update and no progress entry is created unless the teacher explicitly adds one

### Requirement: Historical record and current-state synchronization
The system SHALL preserve each saved session entry as dated history and update the referenced student learning item's current status as one atomic operation.

#### Scenario: Successful progress save
- **WHEN** all submitted student entries pass authorization and relationship validation
- **THEN** the system appends session history entries and updates the corresponding current learning-item states together

#### Scenario: Any entry is invalid
- **WHEN** any submitted entry references an unavailable student, inactive plan, unrelated learning item, or stale revision
- **THEN** the system rejects the command without partially saving the batch

#### Scenario: Correct a completed session entry
- **WHEN** an authorized user corrects a previously saved entry
- **THEN** the system preserves the prior value, records the replacement value and reason, and exposes the latest valid value as current

### Requirement: Derived progress remains authoritative
The system SHALL derive a student's completion totals from included student learning-item statuses; class-session notes SHALL NOT affect completion percentages.

#### Scenario: Mark an item completed
- **WHEN** a saved session entry changes an included learning item to `completed`
- **THEN** the student's derived completion count reflects that status change

### Requirement: Daily progress authorization and scope
The system SHALL require progress read or manage permission as appropriate, active organization membership, and class/student scope for every daily-progress read and mutation.

#### Scenario: Assigned teacher records progress
- **WHEN** a teacher with `progress.manage` accesses an assigned class and submits entries for active members
- **THEN** the system permits the valid entries

#### Scenario: Teacher accesses an unassigned class
- **WHEN** a class-scoped teacher requests or submits progress for an unassigned class
- **THEN** the system returns a non-disclosing unavailable or forbidden result without exposing class or student data

#### Scenario: Cross-organization identifier is submitted
- **WHEN** a command contains a class, student, plan, or learning-item identifier from another organization
- **THEN** the system rejects the complete command and records no progress changes

