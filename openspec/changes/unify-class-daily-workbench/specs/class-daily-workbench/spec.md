## Purpose

Provides one class- and date-scoped teacher workflow for attendance, material progress, assessment entry, and auditable session completion without merging their underlying domain records.

## ADDED Requirements

### Requirement: Unified class daily workspace
The system SHALL present attendance, material progress, assessment entry, and session history for one class occurrence in a single daily workspace.

#### Scenario: Teacher opens a scheduled class
- **WHEN** an authorized teacher opens a class for a selected date
- **THEN** the system SHALL show the occurrence details and one roster shared by the attendance, material, and assessment sections

#### Scenario: Mixed student curricula
- **WHEN** class members use different active material plans
- **THEN** each member SHALL receive only the material versions and learning items assigned to that student

### Requirement: Attendance-first workflow
The system SHALL allow attendance to be recorded before or alongside learning records and SHALL use attendance to provide safe learning-entry defaults.

#### Scenario: Default scheduled roster
- **WHEN** a new class occurrence is opened
- **THEN** eligible scheduled members SHALL default to present until the teacher changes their status

#### Scenario: Leave or absent student
- **WHEN** a member is marked leave or absent
- **THEN** material and assessment entry SHALL default to no update for that member

#### Scenario: Attendance changes after content was entered
- **WHEN** a teacher changes a member to leave or absent after entering material or assessment data
- **THEN** the system SHALL ask for confirmation before discarding or excluding the entered work

### Requirement: Atomic daily save
The system SHALL validate and persist the submitted attendance, material-progress, and assessment-result batch as one class-session operation.

#### Scenario: Valid complete batch
- **WHEN** every submitted relationship, value, permission, and revision is valid
- **THEN** the system SHALL persist attendance, progress history, current learning state, assessment results, and the updated session revision together

#### Scenario: Invalid batch member
- **WHEN** any submitted entry is invalid, stale, outside the class roster, or outside the actor's scope
- **THEN** the system SHALL persist none of the submitted batch and SHALL identify the affected entry

### Requirement: Role-aware workspace actions
The system SHALL independently enforce attendance, progress, and assessment permissions even though the actions appear in one workspace.

#### Scenario: Partial management permission
- **WHEN** an actor can manage attendance but can only read progress or assessments
- **THEN** the actor SHALL be able to edit attendance while the other sections remain visible only when readable and remain non-editable

#### Scenario: Unassigned class
- **WHEN** a class-scoped actor requests a class outside their assigned scope
- **THEN** the system SHALL return no workspace data and SHALL perform no writes

### Requirement: Cross-class attendance overview
The system SHALL retain a date-based attendance overview for authorized managers across all classes in their scope.

#### Scenario: Manager opens attendance overview
- **WHEN** a manager opens the attendance overview for a date
- **THEN** the system SHALL show class-level attendance summaries and SHALL link each class to its daily workspace for detailed entry or correction

### Requirement: Auditable completion and correction
The system SHALL preserve the completed occurrence and append correction records rather than silently overwriting historical entries.

#### Scenario: Complete daily class
- **WHEN** an authorized teacher completes a draft occurrence
- **THEN** the system SHALL lock ordinary editing and retain the submitted attendance, material, and assessment history

#### Scenario: Correct completed data
- **WHEN** an authorized user corrects a completed occurrence with a reason
- **THEN** the system SHALL retain the original record, append the correction, and expose the latest valid value

