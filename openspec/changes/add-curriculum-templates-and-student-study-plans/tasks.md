## 1. Curriculum and Study-plan Data Boundary

- [x] 1.1 Define client-safe grade, subject, publisher, academic-term, template, version, template-item, study-plan, student-learning-item, query, command, result, and View Model types; verify strict TypeScript checking and Client/Server import boundaries pass
- [x] 1.2 Add `curriculum.read`, `curriculum.manage`, `study_plans.read`, and `study_plans.manage` to the permission catalog and role fixtures; verify catalog dependency and persona authorization tests
- [x] 1.3 Create normalized resettable mock records for dimensions, terms, templates, versions, hierarchical items, plans, and student item snapshots; verify every organization and foreign-key-like relationship resolves
- [x] 1.4 Add repository contracts and pure View Model builders for curriculum lists/details and student study plans; verify organization isolation, ordering, hierarchy, version status, and derived progress contract tests

## 2. Curriculum Template Domain

- [x] 2.1 Implement curriculum command validation for organization-owned dimensions, duplicate names, item types, same-version parents, cycle prevention, depth, and ordering; verify valid and invalid hierarchy service tests
- [x] 2.2 Implement draft create/edit/reorder operations with optimistic version checks; verify stale commands make no changes and return stable conflict results
- [x] 2.3 Implement publish behavior that requires content and makes a version immutable; verify published-edit attempts fail and a new draft can be created from the published version
- [ ] 2.4 Implement template copy and archive operations; verify copies are independent and archived templates remain readable by existing plans but unavailable for new assignment

## 3. Curriculum Template UI

- [x] 3.1 Build `/curriculum/templates` with permission-aware navigation, URL-backed grade/subject/publisher/status filters, summaries, responsive cards/table, mock notice, loading, empty, denied, and unavailable states; verify component tests and direct-route authorization
- [ ] 3.2 Build curriculum template create/detail UI for dimensions, version status, hierarchical ordered items, and read-only published states; verify accessible labels and keyboard interaction tests
- [ ] 3.3 Connect create, copy, draft edit, reorder, publish, and archive forms through Server Actions and curriculum service boundaries; verify accessible success/error feedback and server refresh behavior
- [ ] 3.4 Verify curriculum list, detail, copy, publish, and archive flows in the browser at desktop and mobile widths without whole-page horizontal overflow

## 4. Student Study-plan Domain

- [ ] 4.1 Implement organization- and class-scoped student eligibility lookup separately from class enrollment; verify assigned, unassigned, unavailable, and cross-organization student cases
- [ ] 4.2 Implement draft study-plan creation with student, term, subject, grade, and published template version validation plus duplicate active-plan prevention; verify service tests cover all lifecycle preconditions
- [x] 4.3 Implement activation that materializes an ordered student-learning-item snapshot with source references; verify later source-template changes do not alter activated student items
- [ ] 4.4 Implement student-specific rename, reorder, skip, restore, and custom-item commands; verify changes affect only the selected student and progress excludes skipped items
- [ ] 4.5 Implement version-replacement preview and apply behavior that preserves the prior plan and classifies carry-forward, new, and retired items; verify no destructive automatic migration occurs

## 5. Student Study-plan UI and Progress Integration

- [x] 5.1 Add a student detail route and study-plan section reachable from the student roster while preserving class filter context; verify stable student identifiers and authorization-aware navigation tests
- [ ] 5.2 Build term and subject plan summaries with bound grade/publisher/version, lifecycle state, ordered learning items, custom/source labels, and reconciled completion metrics; verify empty, denied, unavailable, and multi-subject component tests
- [ ] 5.3 Build bind-template, activation, individual-adjustment, and version-replacement-preview interactions through Server Actions and study-plan services; verify validation, conflict, success feedback, and refresh behavior
- [ ] 5.4 Replace aggregate-only progress reads with learning-item-derived View Models behind repository contracts while keeping existing `/progress` behavior compatible; verify dashboard and student progress totals reconcile with the same snapshot data
- [ ] 5.5 Verify owner/admin organization-wide access and teacher/assistant assigned-class scope across roster, student detail, curriculum selection, and plan mutations at desktop and mobile widths

## 6. Supabase Handoff, Documentation, and Quality

- [ ] 6.1 Document PostgreSQL tables, foreign keys, uniqueness rules, immutable-version constraints, hierarchy/order indexes, snapshot indexes, repository replacement order, and RLS policies for curriculum and study-plan records
- [ ] 6.2 Update system architecture, codemap, UI/backend action flows, and requirement-viewing guidance for the new routes, features, services, repositories, snapshot activation, and replacement workflow; verify documented paths match implementation
- [ ] 6.3 Run relationship, repository, service, authorization, component, route, and browser tests, then run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; report warnings separately and state that production persistence still requires Supabase migrations and RLS
