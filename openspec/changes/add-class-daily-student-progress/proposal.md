## Why

LearnTrack currently shows student-level progress but does not provide a class-session workspace where a teacher can record what each mixed-grade class member studied that day. Teachers need one roster-based workflow that loads each student's own assigned curriculum versions, records the selected learning item and status, and preserves every session entry as history.

## What Changes

- Add a class detail route with a "今日課堂" workspace that creates or opens a dated class session and loads active class members.
- Resolve curricula from each student's active study plans; the class itself does not own or override a curriculum version.
- Allow one student to record zero, one, or multiple curriculum progress entries in the same class session.
- Record the selected learning item, the resulting status (`not_started`, `in_progress`, or `completed`), and an optional free-text note; page numbers remain unstructured note content.
- Preserve an immutable per-session history entry while updating the student's current learning-item state in one service operation.
- Default absent or leave students to "本次不更新" and exclude archived or ended enrollments from newly created sessions.
- Add server-side organization, permission, assigned-class, enrollment, study-plan, and learning-item validation for reads and mutations.
- Document the mock-first record structure and its future Supabase transaction, indexes, audit, and RLS boundaries.

## Capabilities

### New Capabilities

- `class-daily-student-progress`: Class-session creation, roster-based daily progress entry, immutable per-session history, and synchronization with each student's current curriculum learning-item state.

### Modified Capabilities

None.

## Impact

- Adds `/classes/[classId]` as the class workspace and links class cards to its daily-session entry point while retaining the existing filtered student-list action.
- Adds client-safe class-session/progress contracts, UI components, Server Actions, services, repositories, normalized mock records, and focused tests.
- Reads existing class enrollment, attendance, student study-plan, curriculum-version, and student-learning-item data without introducing a class-level curriculum binding.
- Extends permission enforcement around class-scoped progress reads and mutations; Supabase Auth/RLS and persistent transactions remain a later adapter phase.
- Updates the class/attendance and student/curriculum codemaps plus the UI-to-backend action documentation.
