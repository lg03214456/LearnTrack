## 1. Domain Contracts and Store

- [x] 1.1 Extend client-safe curriculum item types and mutation command/result contracts for supported item types, delete, move direction, revision, and feedback; verify strict TypeScript and client/server import boundaries
- [x] 1.2 Extend the resettable curriculum mock store with append, delete, adjacent move, compact deterministic order, and version revision updates; verify identity/order invariants and reset behavior in unit tests

## 2. Service Rules and Actions

- [x] 2.1 Implement add-item validation for permission, organization ownership, editable status, supported type, non-empty name, and optimistic revision; verify invalid or stale commands make no changes
- [x] 2.2 Implement delete-item validation and compact reorder with stable item identities; verify unauthorized, missing, published, cross-scope, stale, and successful outcomes
- [x] 2.3 Implement adjacent move commands with first/last boundary handling and atomic revision checks; verify up/down, rapid stale commands, and deterministic ordering
- [x] 2.4 Add Server Actions that parse external form input, invoke curriculum services, revalidate the version route, and expose stable success/error states; verify action-to-service mapping tests

## 3. Curriculum Template Detail UI

- [x] 3.1 Upgrade the add-item UI with item type, accessible fields, pending state, validation feedback, successful refresh, and preserved invalid input; verify component interaction tests
- [x] 3.2 Add accessible move-up and move-down controls with correct disabled boundary states and pending protection; verify the displayed order follows repository output after each action
- [x] 3.3 Add an explicit accessible delete confirmation with cancel/confirm paths, pending state, and feedback; verify cancel does not invoke a mutation and success removes only the selected item
- [x] 3.4 Hide all mutation controls for published/archived versions and read-only personas while retaining the ordered item list; verify direct server commands are also rejected
- [x] 3.5 Verify the detail page at desktop and mobile widths, including long item names and no whole-page horizontal overflow

## 4. Persistence Handoff and Quality

- [x] 4.1 Update UI/backend action documentation and Supabase handoff with transaction, revision, unique order constraint, indexes, audit, and RLS requirements; verify every documented implementation path exists
- [x] 4.2 Run curriculum store, service, authorization, component, route, and browser tests, then run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; report warnings separately and state that production persistence still requires Supabase migration and RLS work

## 5. Drag-and-Drop Reordering Revision

- [x] 5.1 Install `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` at compatible versions; verify the lockfile changes only by the expected dependency graph and production build can resolve them
- [x] 5.2 Add a complete-order Server Action and service path using stable item IDs, organization ownership, draft status, exact item-set validation, and optimistic revision; verify success, missing/duplicate IDs, published versions, unauthorized actors, and stale conflicts
- [x] 5.3 Refactor the curriculum item list into accessible sortable rows with dedicated drag handles, pointer/touch/keyboard sensors, activation constraints, and retained up/down fallback controls; verify component tests cover handle labels, fallback controls, and read-only hiding
- [x] 5.4 Implement optimistic local ordering, one-request-at-a-time pending protection, success feedback, and rollback to repository order on conflict or failure; verify failed persistence preserves every item and restores the previous order
- [x] 5.5 Verify pointer drag, keyboard sorting, touch/mobile layout, long names, delete controls, published read-only mode, and no whole-page horizontal overflow in browser testing
- [x] 5.6 Add a dependency catalog to `docs/system-architecture.md` describing each dnd-kit package, why it is used, which Client boundary owns it, and the native/custom alternative; update codemap and UI/action flow paths and verify documented paths exist
- [x] 5.7 Run targeted sortable/service/action tests, then `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; report dependency or framework warnings separately

## 6. Focused Sortable Row Actions

- [x] 6.1 Remove visible move-up and move-down controls from editable curriculum rows while preserving pointer, touch, keyboard drag, delete, pending protection, and published read-only behavior; update tests and UI/action documentation, then run project checks
