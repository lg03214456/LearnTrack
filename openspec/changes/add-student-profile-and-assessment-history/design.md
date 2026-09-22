## Context

See `proposal.md` for motivation. The existing `/students/[studentId]` page reads curriculum study-plan View Models, while roster rows intentionally contain only minimal contact data. Existing assessment fixtures are class-oriented and currently feed aggregate progress displays rather than a student-detail history. Authorization already provides organization-wide or assigned-class scope.

## Goals / Non-Goals

**Goals:**

- Compose profile, enrollment, study-plan, and assessment sections behind one student-detail query boundary.
- Keep guardian contacts out of list View Models and expose them only after student-scope authorization.
- Make result entry and correction testable through Action → Service → Repository boundaries.
- Calculate assessment summaries and chart points from normalized result records.

**Non-Goals:**

- Online testing, question banks, per-question analytics, grading workflows, files, notifications, parent access, or production Supabase migrations.
- Replacing curriculum progress status with assessment performance; the two measures remain separate.

## Decisions

### 1. Use one student-detail composition View Model

The student page receives a client-safe aggregate containing profile, active class memberships, study-plan summaries, assessment summary, filters, and paginated history. Reusing separate repository builders internally is preferred over letting UI join fixtures. Separate independent pages were rejected because teachers need one student context and consistent access checks.

### 2. Keep profile, guardian, assessment, and result records normalized

Student identity remains in `students`; guardian contacts use a student relationship; assessments describe the event and maximum score; assessment results connect student and assessment. Embedding history arrays in the student record was rejected because it weakens foreign keys, filtering, auditing, and RLS.

### 3. Authorize the student before loading sensitive sections

The repository first resolves the actor's organization and class scope, then composes profile and result data. Missing, cross-organization, and out-of-class students share a non-disclosing unavailable outcome. UI visibility is not treated as security.

### 4. Normalize scores for comparisons

Raw score and maximum score remain visible, while averages and trend values use `score / maximumScore * 100`. Storing a separate percentage was rejected because corrections could make it stale.

### 5. Model corrections as updates with audit-ready metadata

The mock phase keeps stable result IDs plus updated timestamp and actor identity. PostgreSQL handoff will recommend an audit log or immutable revision table; silently replacing result identity was rejected.

### 6. Preserve route and filter context

`/students/[studentId]` remains the canonical route. Class context and assessment filters use URL parameters so refresh and back navigation remain predictable.

## Risks / Trade-offs

- [Student detail query spans several domains] → Compose focused repository builders and test reconciliation at the boundary.
- [Guardian contacts are sensitive] → Keep them out of roster responses and enforce student scope before fetching them.
- [Small result sets can produce misleading trends] → Show result count and use an explicit empty/insufficient-data state.
- [Mock updates reset on server restart] → Display the existing development notice and document production persistence requirements.
- [Concurrent corrections can overwrite changes] → Add optimistic revision checks and stable conflict results.

## Migration Plan

1. Add permission codes, client-safe types, normalized mock guardians, assessments, and results.
2. Add scoped repository builders and service commands with contract tests.
3. Extend the student-detail page with profile and assessment sections while retaining study plans.
4. Add result entry/correction actions, URL filters, summaries, trends, loading, empty, denied, and unavailable states.
5. Document PostgreSQL constraints, indexes, repository replacement order, RLS, and audit strategy.

Rollback removes the new profile and assessment composition while preserving the existing study-plan page and class roster navigation.
