## Why

Teachers currently select the same date, class, and roster separately for attendance and daily learning progress, which creates duplicate work and allows the two records to drift. Curriculum templates also mix long-term material structure with worksheets and assessments, causing material completion percentages to change when extra exams are added.

## What Changes

- Make the class-scoped daily workbench the primary teacher entry point for attendance, material progress, assessment results, and session history.
- Keep attendance, material progress, and assessment records as separate domain records while presenting and saving them through one coordinated class-session workflow.
- Retain `/attendance` as an organization-wide, cross-class attendance overview and correction surface rather than the primary per-class entry form.
- Separate material templates from assessment templates so both can be searched and maintained by template name without forcing exams into a material version.
- Allow teachers to add an ad-hoc assessment during a class session without first modifying a material template, with an option to reference an existing assessment template.
- Calculate material completion, planned-assessment completion, assessment performance, and extra-assessment count independently.
- Default leave and absent students to no material or assessment update, while requiring confirmation before discarding already-entered session work.
- Save a submitted daily class batch atomically with authorization, relationship, and optimistic revision validation.

## Capabilities

### New Capabilities

- `class-daily-workbench`: A class- and date-scoped workflow that coordinates attendance, student material progress, assessment entry, completion, correction, and role-aware actions.
- `material-assessment-separation`: Separate searchable material and assessment template catalogs, planned versus ad-hoc assessment assignments, and independent progress/performance metrics.

### Modified Capabilities

None. The relevant capabilities currently exist only in unarchived changes, so this proposal introduces the consolidated target behavior as new delta capabilities without claiming a main-spec modification.

## Impact

- Routes and UI: `/classes/[classId]`, `/attendance`, curriculum/template navigation, student assessment history, progress dashboards, and class cards.
- Contracts and data: class sessions and members, attendance records, student session progress, material templates and versions, assessment templates, planned assessment assignments, session assessment results, and independent summary metrics.
- Server boundaries: attendance, class-session, curriculum, and student-assessment repositories, services, Server Actions, authorization checks, transaction staging, correction audit history, and future Supabase RLS/transaction definitions.
- Existing material progress and assessment history must remain readable; mock fixtures need deterministic migration to the separated model.
