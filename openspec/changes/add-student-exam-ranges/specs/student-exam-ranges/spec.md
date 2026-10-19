## Purpose

Enable authorized staff to define examination coverage separately for each student using that student's assigned learning content. Show a preparation percentage derived from the selected content and existing completion records, preserving learning history and tenant isolation independently from examination scores.

## ADDED Requirements

### Requirement: Individual student examination coverage
The system SHALL let authorized staff create multiple named examination ranges for one student, with an optional examination date and selected learning items from that student's assigned active study plans. A range MUST belong to exactly one organization and student, and MUST NOT propagate to classmates.

#### Scenario: Create coverage from assigned materials
- **WHEN** staff with management access selects content from the student's active assigned plans and saves a valid range
- **THEN** the system persists the name, date, selected items and their plan/version relationships and shows the range on that student's study-progress page
- **AND** no other student's coverage or learning records change

#### Scenario: Invalid or empty selection
- **WHEN** a name is blank, a supplied date is invalid, no countable items are selected, or a selection is outside the student's allowed plans
- **THEN** the system rejects the whole save with an actionable error and leaves the stored range unchanged

### Requirement: Range-derived completion percentage
The system SHALL calculate each range as completed selected learning items divided by distinct selected learning items, rounded to a whole percentage. Completion MUST use the learning status, not notes or scores. Selecting a containing unit MUST select its countable descendant content without counting the unit a second time. Skipped, pending and in-progress selected items MUST remain in the denominator and MUST NOT count as completed.

#### Scenario: Partial coverage completion
- **WHEN** six out of ten distinct selected items are completed
- **THEN** the range shows 6 / 10 and 60%, regardless of content outside the range or recorded examination scores

#### Scenario: Deduplication and completion updates
- **WHEN** content is selected both through a containing unit and individually, or its completion status changes
- **THEN** each item contributes once and the refreshed range reflects the authoritative status without changing the coverage definition

### Requirement: Edit coverage without altering learning history
The system SHALL support editing a range's name, date and selection in a responsive accessible dialog. Canceling MUST not save or clear stored data. Saving MUST use conflict detection and MUST NOT change learning statuses, plan versions or examination results.

#### Scenario: Edit and cancel
- **WHEN** staff changes selection and cancels
- **THEN** the existing range and all learning data remain unchanged

#### Scenario: Concurrent edits
- **WHEN** a range was changed after an editor loaded it
- **THEN** a stale save is rejected and the user is prompted to reload rather than silently overwriting newer coverage

### Requirement: Version lineage remains explicit
The system SHALL preserve examination coverage references and history when a study plan is replaced, archived or completed. It MUST NOT silently move selected content to a different version, drop removed items from the denominator, or change the range to make its percentage appear higher. Affected coverage MUST show that review is needed and retain visible source version labels.

#### Scenario: Material replacement
- **WHEN** the student switches to a newer material plan and some selected old items are removed
- **THEN** the range remains linked to the old items, shows a review warning and permits an authorized explicit coverage edit without deleting historical learning records

### Requirement: Tenant and student scoped authorization
The system SHALL require study-plan read permission plus student visibility for range reads, and study-plan management permission plus student visibility for writes. Client-supplied organization, student, plan, item and range identifiers MUST be revalidated by the server and database. Platform inspection MUST NOT grant tenant mutation rights.

#### Scenario: Unauthorized access
- **WHEN** an anonymous actor, an actor from another organization, an unassigned teacher, an unrelated student/contact or a read-only actor attempts a protected operation
- **THEN** the system rejects the disallowed read or mutation without leaking another student's range details

#### Scenario: Permitted scoped use
- **WHEN** an authorized owner or assigned teacher manages coverage for a visible student, or a read-authorized linked student/contact views it
- **THEN** only the allowed student's ranges and assigned content are accessible and read-only actors have no mutation access

### Requirement: Durable atomic storage and safe failures
The system SHALL persist ranges and membership selections atomically, maintain non-orphaned same-tenant relationships, and use the configured data provider. Supabase failures or missing migrations MUST NOT fall back to mock data. Required mutation audit failures MUST fail closed without presenting success.

#### Scenario: Reload and interrupted save
- **WHEN** a successful range save is followed by a page reload, or a later save fails validation midway
- **THEN** the successful definition remains durable and a failed save exposes no partially updated selection

#### Scenario: Missing schema or unavailable service
- **WHEN** range persistence cannot be reached or its migration is missing
- **THEN** the user sees a safe diagnostic/retry state rather than fabricated ranges, a misleading zero percentage or a success notification
