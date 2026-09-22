## Purpose

Separates reusable material structures from assessment definitions and keeps material completion, planned-assessment completion, assessment performance, and extra practice independently understandable.

## ADDED Requirements

### Requirement: Separate searchable template catalogs
The system SHALL maintain material templates and assessment templates as separate searchable catalogs.

#### Scenario: Search material templates
- **WHEN** a user searches the material catalog by template name, grade, subject, or publisher
- **THEN** the system SHALL return matching material templates and their versioned unit and chapter structures without assessment templates

#### Scenario: Search assessment templates
- **WHEN** a user searches the assessment catalog by template name, grade, subject, or tag
- **THEN** the system SHALL return matching assessment definitions including title and maximum score without requiring a material-template relationship

### Requirement: Material-only completion metric
The system SHALL derive material completion only from included current material learning items.

#### Scenario: Extra assessment is recorded
- **WHEN** a student completes an additional assessment
- **THEN** the student's material completed count, material denominator, and material completion percentage SHALL remain unchanged

### Requirement: Planned assessment assignments
The system SHALL distinguish assessments formally assigned to a student's assessment plan from ad-hoc assessments recorded during class.

#### Scenario: Complete a planned assessment
- **WHEN** a result is recorded against an incomplete planned assessment assignment
- **THEN** the assignment SHALL become completed and SHALL contribute to planned-assessment completion

#### Scenario: Record an ad-hoc assessment
- **WHEN** a teacher records an assessment that has no planned assignment
- **THEN** the result SHALL be labeled additional and SHALL not change the planned-assessment denominator

### Requirement: Ad-hoc assessment entry
The system SHALL allow an authorized teacher to record an assessment result during a class session without first changing a material template.

#### Scenario: Use an existing assessment template
- **WHEN** a teacher selects an assessment template and enters a valid score
- **THEN** the system SHALL create a session-linked result using the template title and maximum score snapshot

#### Scenario: Enter a new temporary assessment
- **WHEN** a teacher enters a temporary title, maximum score, and valid student score
- **THEN** the system SHALL create a session-linked additional result without requiring a template identifier

#### Scenario: Invalid score
- **WHEN** the submitted score is below zero or above the recorded maximum score
- **THEN** the system SHALL reject the result without changing assessment or material metrics

### Requirement: Independent assessment summaries
The system SHALL present planned-assessment completion, assessment performance, and additional-assessment count separately.

#### Scenario: Student has planned and additional assessments
- **WHEN** a student has results from both sources
- **THEN** planned-assessment completion SHALL use only planned assignments, performance SHALL use the authorized filtered result set as normalized percentages, and additional-assessment count SHALL include only ad-hoc results

### Requirement: Promote additional assessment to planned use
The system SHALL require an explicit action before an additional assessment becomes a reusable template or a planned assignment.

#### Scenario: Leave temporary result temporary
- **WHEN** a teacher saves an ad-hoc result without promotion
- **THEN** the result SHALL remain in student history but SHALL not create a catalog template or planned assignment

