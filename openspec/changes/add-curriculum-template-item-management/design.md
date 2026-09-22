## Context

See `proposal.md` for motivation and the capability spec for observable behavior. The existing curriculum detail route already reads through `curriculumRepository` and writes through curriculum Server Actions and service functions. The mock curriculum store contains ordered items and version status, but currently lacks complete delete and reorder commands and corresponding feedback.

## Goals / Non-Goals

**Goals:**

- Keep item mutation rules in the curriculum service rather than UI components.
- Preserve stable item identity while maintaining a compact deterministic order.
- Use controls that work consistently with pointer, keyboard, desktop, and mobile input.
- Provide immediate sortable feedback while keeping the repository result authoritative.
- Keep the store replaceable by a Supabase repository/transaction later.

**Non-Goals:**

- Cross-version item moves, bulk deletion, undo history, or collaborative live cursors.
- Editing published or archived content.

## Decisions

### Use dnd-kit sortable handles

Use `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`. They provide pointer, touch, and keyboard sensors plus sortable transforms without making persistence decisions. Each row has a dedicated drag handle; clicking the row itself does not start a drag. Separate up/down buttons are omitted to keep row actions compact. Native HTML drag events were considered but rejected because touch and keyboard behavior would require substantial custom accessibility code.

### Keep optimistic order local and commit one complete order

The Client Component stores only the temporary ordered View Model during an active drag. On drop it submits stable ordered item IDs and the current version revision to a Server Action. The service validates the exact item set and commits a compact order atomically. On success the route revalidates; on conflict or failure the component restores the last repository-provided order and displays feedback. The client never imports the mock store or database code.

### Keep mutation state in the existing curriculum boundary

Server Actions parse form data and return stable command outcomes. Curriculum service functions enforce permission, ownership, editable status, validation, and optimistic revision before mutating the resettable store. UI imports client-safe models only. A future Supabase adapter will implement the same transaction semantics without changing component contracts.

### Compact order after every mutation

Items are sorted by current order plus stable id, then rewritten to contiguous positions after add, delete, or move. This avoids gaps and ambiguous ties in mock data. PostgreSQL production writes should lock/check the version revision and update affected rows in one transaction with a unique deferred constraint on `(organization_id, version_id, sort_order)`.

### Confirmation is a client-side presentation concern

Deletion uses an accessible confirmation interaction before invoking the Server Action. The service never treats confirmation as authorization and independently validates the command. Add/reorder actions provide pending and stable success/error feedback; boundary move buttons are disabled.

## Risks / Trade-offs

- [Multiple rapid reorder or drag operations can race] → Allow only one persistence request at a time and reject stale version revisions.
- [Optimistic UI can diverge from persisted order] → Keep the repository-provided list as the rollback snapshot and replace local state after revalidation.
- [Touch scrolling can conflict with dragging] → Use a dedicated handle and activation constraints so normal page scrolling remains available.
- [Sortable dependencies increase bundle and maintenance surface] → Limit imports to the curriculum detail Client Component and document package ownership and alternatives in `docs/system-architecture.md`.
- [Deleting an item may affect future student plans] → Only editable template versions can change; activated student plans retain snapshots.
- [Mock memory resets on server restart] → Clearly label mock behavior and document the Supabase transaction/RLS replacement.
- [Some users may not know the keyboard interaction] → Keep an explicit accessible handle label and title that documents the Space-key interaction.

## Migration Plan

1. Extend client-safe curriculum commands/results and resettable store behavior.
2. Add service validation and tests before wiring UI controls.
3. Install the documented dnd-kit packages and add drag sensors, sortable rows, rollback behavior, and actions to the existing version detail page.
4. For Supabase, migrate revision/order constraints and RLS, implement transactional repository methods, then switch the composition root.
5. Rollback by removing the new controls/actions while leaving existing ordered records readable.
