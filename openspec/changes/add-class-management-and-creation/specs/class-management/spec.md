## Purpose

提供可稽核且保留歷史資料的班級生命週期管理，讓具權限人員能建立、編輯、指派教師與學生，並從同一份班級資料驅動名冊與後續教務流程。

## ADDED Requirements

### Requirement: Users can view trustworthy class summaries
The system SHALL list organization-scoped classes with name, type, subjects, grade scope, assigned teacher, recurring schedules, active enrollment count, optional capacity, and lifecycle status.

#### Scenario: View class overview
- **WHEN** an authorized user opens the class overview
- **THEN** every card SHALL display values derived from the same class, assignment, schedule, and enrollment records

#### Scenario: Search and filter classes
- **WHEN** the user searches by class name or code or selects a grade filter
- **THEN** only classes satisfying every active filter SHALL remain visible

### Requirement: Authorized managers can create a class
The system SHALL allow an organization owner or administrator with class-management permission to create a class with a required unique name, class type, grade scope, teacher assignment, optional subjects, optional positive capacity, zero or more schedules, and zero or more initial students.

#### Scenario: Create a standard progress class
- **WHEN** an authorized manager submits valid class details, at least one grade or all-grades scope, a valid teacher, schedules, and selected students
- **THEN** the system SHALL atomically create the class, assignments, schedules, and active enrollments and display the new class in the overview

#### Scenario: Create an empty self-study class
- **WHEN** an authorized manager creates a self-study class without subjects, schedules, students, or capacity
- **THEN** the system SHALL create the class and allow those optional relationships to be added later

#### Scenario: Reject invalid class input
- **WHEN** the name is empty or duplicated in the organization, capacity is not positive, grade scope is empty, or a referenced teacher or student is unavailable
- **THEN** the system SHALL make no partial changes and display field-level errors without exposing out-of-scope records

### Requirement: Authorized users can edit assigned classes
The system SHALL allow owners and administrators to edit organization classes and SHALL allow teachers with class-management permission to edit only classes to which they are assigned. Updates MUST use optimistic revision checks.

#### Scenario: Update class configuration
- **WHEN** an authorized user changes basic details, subjects, grades, capacity, assigned teacher, or schedule rules using the current revision
- **THEN** the system SHALL save the complete validated configuration and refresh the overview

#### Scenario: Reject stale or out-of-scope update
- **WHEN** an update uses a stale revision or the actor cannot manage the target class
- **THEN** the system SHALL reject the command without partial changes or protected-data disclosure

### Requirement: Class enrollment can be managed
The system SHALL manage class membership through stable active enrollment relationships rather than embedding students in a class record. A student MAY belong to multiple classes.

#### Scenario: Add existing students to a class
- **WHEN** an authorized user searches and selects organization students not actively enrolled in the class
- **THEN** the system SHALL add each selected student once and update the class count

#### Scenario: Remove a student from a class
- **WHEN** an authorized user withdraws a student from a class
- **THEN** the active enrollment SHALL end while historical attendance, progress, and assessment records remain attributable to that class and student

#### Scenario: Enforce class capacity
- **WHEN** adding students would exceed a configured capacity
- **THEN** the system SHALL reject the additions without partially updating membership

### Requirement: Classes preserve history through lifecycle states
The system SHALL support recruiting, active, completed, and archived lifecycle states. Completed or archived classes MUST preserve related historical records and MUST NOT appear in active operational selectors by default.

#### Scenario: Complete or archive a class
- **WHEN** an authorized owner or administrator confirms completion or archival
- **THEN** the system SHALL retain class identity, enrollments, attendance, grades, and progress while excluding the class from future active operations

#### Scenario: Attempt permanent deletion with history
- **WHEN** a client requests permanent deletion of a class that has related operational or historical records
- **THEN** the system SHALL reject deletion and direct the user to completion or archival

### Requirement: Class management is accessible and responsive
The system SHALL keep class creation, editing, enrollment, confirmation, validation, and overview operations keyboard accessible and usable without whole-page horizontal overflow.

#### Scenario: Manage a class on a narrow screen
- **WHEN** an authorized user uses the workflow at a mobile viewport
- **THEN** required controls and error messages SHALL remain reachable and associated with their fields

