## Purpose

定義班級每週重複排課與每日應到名單的可信規則，使班級時段、教師與學生 enrollment 能一致地提供點名工作台使用。

## ADDED Requirements

### Requirement: A class can have multiple weekly schedule slots
The system SHALL allow an editable class to contain zero or more weekly schedule slots, each with one weekday, a start time, an end time, and an optional room.

#### Scenario: Add multiple weekly slots
- **WHEN** an authorized user adds valid Tuesday and Thursday time ranges to a class
- **THEN** both slots SHALL be stored in deterministic weekday and start-time order

#### Scenario: Reject invalid time range
- **WHEN** a slot has no weekday, an invalid time, an end time not later than its start time, or duplicates another slot in the same class
- **THEN** the system SHALL reject the configuration without partial schedule changes

### Requirement: Schedule updates preserve class history
The system SHALL apply schedule changes to future expected attendance dates while preserving previously recorded attendance sessions and their original class context.

#### Scenario: Change a future weekly schedule
- **WHEN** an authorized user replaces a class schedule rule
- **THEN** future daily workbench queries SHALL use the new rule and existing attendance sessions SHALL remain unchanged

### Requirement: Daily attendance can resolve expected students
The system SHALL provide an organization-scoped query that resolves classes scheduled for a local calendar date and returns students with active enrollments applicable to that date.

#### Scenario: Build today's expected roster
- **WHEN** the daily attendance workbench requests a date whose weekday matches active class schedule slots
- **THEN** the result SHALL contain those active classes and their actively enrolled students without duplicating a student within the same class

#### Scenario: Ignore inactive classes and enrollments
- **WHEN** a class is completed or archived, or an enrollment ended before the requested date
- **THEN** that class or enrollment SHALL NOT contribute to the expected roster

### Requirement: Schedule access respects organization and role boundaries
The system MUST derive organization and actor scope from authenticated identity and MUST reject cross-organization, unassigned-teacher, inactive-account, and stale-revision schedule mutations.

#### Scenario: Unauthorized schedule mutation
- **WHEN** an actor without scope submits a schedule configuration
- **THEN** the system SHALL make no changes and SHALL NOT reveal whether an inaccessible class exists
