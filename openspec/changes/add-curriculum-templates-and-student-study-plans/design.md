## Context

See `proposal.md` for motivation. LearnTrack currently has class enrollments, aggregate `LessonProgress`, mock repositories, and server-owned RBAC. It does not have academic terms, curriculum master data, immutable versions, hierarchical content, or term-specific subject bindings. This change must remain mock-first while shaping data that maps cleanly to PostgreSQL.

## Goals / Non-Goals

**Goals:**

- Separate reusable curriculum definitions from student-specific execution state.
- Preserve historical meaning when templates evolve.
- Distinguish class membership from academic-term subject study plans.
- Make all visible progress derivable from authoritative learning-item state.
- Integrate with existing organization and class-scoped authorization boundaries.

**Non-Goals:**

- Daily scheduling, attendance-session generation, daily learning-log entry, score entry, student dashboards, or the parent portal.
- Automatic migration between published curriculum versions without a user preview.
- Real Supabase migrations or production persistence in this change.
- Rich document uploads, page-content authoring, or publisher-licensed content storage.

## Decisions

### 1. Separate template identity from immutable versions

`curriculum_templates` owns organization, grade, subject, publisher, and display identity. `curriculum_template_versions` owns version number and draft/published status; items belong to a version. Published rows are immutable. Editing creates a new draft, which avoids silent historical rewrites.

### 2. Use a flexible ordered item hierarchy

Template items use a bounded type (`chapter`, `unit`, `material`, `worksheet`, `assessment`) with optional parent and stable sort position. This supports mixed publisher and custom structures without introducing one table per content type. Assessment definitions with grading behavior remain a later capability; this phase stores placeholders only.

### 3. Keep class enrollment and subject study plan distinct

Existing enrollment continues to answer “which class does the student attend?” A student subject plan answers “which subject and curriculum version does the student follow in this term?” This avoids assuming every class has one uniform publisher version.

### 4. Snapshot on activation

Activating a study plan copies included template items into `student_learning_items`, retaining `source_template_item_id` and source version. Student-specific title, order, inclusion, status, and custom items live only in this snapshot. A live join to current template items was rejected because template edits would alter progress history.

### 5. Use explicit replacement with preview

Changing versions creates a successor plan or plan revision. A service computes a comparison using source item identity and presents carry-forward/add/retire choices. No automatic destructive merge occurs. Existing completion records remain attached to their original snapshot.

### 6. Derive progress

Repository View Models calculate `completed / active included items`; skipped and archived items are excluded according to documented rules. No writable percentage field is exposed to UI.

### 7. Preserve clean boundaries

Client-safe curriculum and study-plan types live under feature modules. Server pages read repository View Models. Mutations flow through Server Actions, validation, services, and repositories. Mock data remains normalized and resettable for tests. Permission catalog gains `curriculum.read/manage` and `study_plans.read/manage`.

## Risks / Trade-offs

- **Snapshot duplication increases row count** → Accept the storage cost for stable history and index by organization, plan, and source item.
- **Template corrections do not reach existing students automatically** → Provide an explicit compare/apply workflow and show the bound version.
- **Flexible hierarchy can permit malformed trees** → Validate same-version parents, allowed depth, cycles, and deterministic ordering in the service.
- **Copy and publish operations can conflict** → Use optimistic version fields and reject stale commands.
- **Mock persistence can be confused with production readiness** → Display development notices and document Supabase/RLS requirements.
- **Publisher names may be sensitive or licensed** → Store metadata and teacher-authored labels only; file/content licensing is outside scope.

## Migration Plan

1. Add permission codes and normalized mock master data, versions, items, terms, plans, and student-item records.
2. Add curriculum repositories/services and `/curriculum/templates` management UI.
3. Add student study-plan repositories/services and integrate plans into student detail navigation.
4. Replace aggregate progress reads with learning-item-derived View Models while preserving current routes.
5. Document PostgreSQL tables, constraints, indexes, Supabase adapter mapping, and RLS policies.

Rollback removes new navigation and composition wiring; existing class enrollment and aggregate progress fixtures remain usable until the migration is explicitly completed.
