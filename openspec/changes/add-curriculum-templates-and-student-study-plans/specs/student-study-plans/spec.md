## Purpose

Defines term-specific student subject bindings and personalized learning-item snapshots so progress remains traceable to a curriculum version while allowing individual adjustments.

## ADDED Requirements

### Requirement: Distinct term subject plans
The system SHALL model a student's academic-term subject plan separately from class enrollment and SHALL bind it to one grade, subject, and published curriculum-template version.

#### Scenario: Create a study plan
- **WHEN** an authorized user selects a student, academic term, subject, grade, and published version
- **THEN** the system creates one active subject plan for that student-term-subject combination

#### Scenario: Duplicate subject plan
- **WHEN** an active plan already exists for the same student, term, and subject
- **THEN** the system rejects the duplicate or requires an explicit replacement workflow

### Requirement: Materialized learning-item snapshot
The system SHALL materialize ordered student learning items from the selected published template when a study plan is activated.

#### Scenario: Activate a plan
- **WHEN** a valid draft study plan is activated
- **THEN** every included template item is copied into the student's learning list with its source-version reference

#### Scenario: Source template changes later
- **WHEN** a newer template version is published after a student's plan is active
- **THEN** the student's existing item titles, order, inclusion, and progress remain unchanged

### Requirement: Student-specific adjustments
The system SHALL allow authorized users to rename, reorder, skip, restore, and add custom learning items for one student without modifying the source template or other students.

#### Scenario: Add a custom item
- **WHEN** an authorized user adds a student-specific worksheet or assessment placeholder
- **THEN** the item appears only in that student's plan and is identified as custom

#### Scenario: Skip a template item
- **WHEN** an authorized user excludes an incomplete item from one student's plan
- **THEN** the item remains traceable but is omitted from active completion totals

### Requirement: Study-plan lifecycle
The system SHALL support draft, active, completed, and archived study-plan states and SHALL preserve historical items when a plan is completed or archived.

#### Scenario: Replace a curriculum version
- **WHEN** an authorized user replaces an active plan with another version
- **THEN** the system preserves the prior plan and requires a preview of items to carry forward, add, or retire

### Requirement: Study-plan access control
The system SHALL require `study_plans.read` to view plans and `study_plans.manage` to bind curricula or adjust items, while enforcing organization and assigned-class student scope.

#### Scenario: Teacher views an assigned student
- **WHEN** a teacher with read permission requests a student in an assigned class
- **THEN** the system returns only that student's visible term plans and learning items

#### Scenario: Teacher requests an unassigned student
- **WHEN** a class-scoped user requests a student outside assigned classes
- **THEN** the system returns a non-disclosing unavailable result

### Requirement: Reconciled progress
The system SHALL derive completion totals and percentages from active, included student learning items rather than storing an independent display percentage.

#### Scenario: Complete a learning item
- **WHEN** one included item changes to completed
- **THEN** the plan completion count and percentage update from the same item collection

