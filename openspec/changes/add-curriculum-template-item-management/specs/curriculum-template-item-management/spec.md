## Purpose

提供教材範本項目的安全維護能力，讓具權限的教職人員可新增、刪除與重新排序未發布版本，同時維持發布版本不可變與多租戶資料隔離。

## ADDED Requirements

### Requirement: Authorized users can add template items
The system SHALL allow a user with curriculum management permission to add a named chapter, unit, worksheet, or assessment item to an editable curriculum version. The system MUST validate the item name and derive organization ownership on the server.

#### Scenario: Add a valid item
- **WHEN** an authorized user submits a non-empty name and supported item type for an editable version
- **THEN** the system appends the item to that version, assigns the next stable order, refreshes the detail view, and displays success feedback

#### Scenario: Reject invalid item input
- **WHEN** the submitted name is empty or the item type is unsupported
- **THEN** the system makes no change and displays an understandable validation error

### Requirement: Authorized users can delete template items
The system SHALL allow a user with curriculum management permission to delete an item from an editable version after explicit confirmation. The system MUST identify the item by stable identity and MUST NOT trust client-supplied organization ownership.

#### Scenario: Confirm item deletion
- **WHEN** an authorized user confirms deletion of an item in an editable version
- **THEN** the system removes only that item, compacts the remaining order, refreshes the detail view, and displays success feedback

#### Scenario: Cancel item deletion
- **WHEN** the user dismisses the deletion confirmation
- **THEN** the item and its order remain unchanged

### Requirement: Authorized users can reorder template items
The system SHALL provide a visible drag handle for every item in an editable version and SHALL support pointer, touch, and keyboard sorting. The system MUST preserve stable identities, submit the complete resulting order with the current version revision, and MUST NOT display separate move-up or move-down controls in the sortable list.

#### Scenario: Reorder with pointer or touch
- **WHEN** an authorized user drags an item by its handle and drops it at a different position
- **THEN** the list immediately reflects the intended position, persists the complete order, and displays success feedback

#### Scenario: Reorder with keyboard
- **WHEN** a keyboard user focuses the drag handle and performs the documented sortable keyboard interaction
- **THEN** the system announces the movement, updates the same ordered list, and persists the same command shape used by pointer sorting

#### Scenario: Sortable list actions stay focused
- **WHEN** an authorized user opens an editable version
- **THEN** each row exposes its drag handle and delete action without separate move-up or move-down buttons

#### Scenario: Concurrent reorder conflict
- **WHEN** the submitted version revision is older than the current version
- **THEN** the system rejects the reorder without partial changes, restores the repository order, and asks the user to refresh

#### Scenario: Reorder request fails
- **WHEN** a drag produces a valid local order but the persistence request fails
- **THEN** the system restores the previous authoritative order, preserves all items, and provides a retryable error message

### Requirement: Published versions are immutable
The system MUST reject add, delete, and reorder commands for published or archived versions even when the actor otherwise has curriculum management permission.

#### Scenario: View a published version
- **WHEN** a user opens a published version
- **THEN** the system displays its ordered items without add, delete, or move controls

#### Scenario: Direct mutation attempt against published version
- **WHEN** a client directly submits an add, delete, or reorder command for a published version
- **THEN** the server rejects the command and leaves all items unchanged

### Requirement: Item mutations respect tenant and role boundaries
The system MUST enforce active account status, curriculum management permission, organization ownership, stable version/item identity, and optimistic revision checks for every item mutation.

#### Scenario: Unauthorized or cross-organization mutation
- **WHEN** an inactive, read-only, or different-organization actor submits an item mutation
- **THEN** the system rejects the request without revealing or modifying protected curriculum data

### Requirement: Item management remains responsive and accessible
The item list SHALL remain usable without whole-page horizontal overflow at desktop and mobile widths, and every icon-only operation MUST expose an accessible name and visible disabled state.

#### Scenario: Manage items on a narrow screen
- **WHEN** an authorized user opens an editable version at a mobile width
- **THEN** item names, types, drag handles, and delete controls remain reachable without dragging the entire page horizontally
