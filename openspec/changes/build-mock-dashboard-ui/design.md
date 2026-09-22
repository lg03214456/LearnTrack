## Context

See `proposal.md` for motivation. The repository currently contains empty `frontend/` and `backend/` placeholders and a repo-local OpenSpec setup shared by Codex and OpenCode. The first delivery must run without external accounts while preserving a safe path to Supabase PostgreSQL, Auth, and RLS.

## Goals / Non-Goals

**Goals:**

- Deliver a polished, responsive, mock-data-first product slice based on the five supplied visual references.
- Keep browser presentation, server-only domain logic, and persistence access visibly separated even though the first deployment is one full-stack application.
- Make mock relationships realistic enough to design PostgreSQL tables and validate JOIN-heavy screens.
- Preserve organization ownership in every relevant model from the first fixture version.

**Non-Goals:**

- Creating a Supabase project, applying production migrations, configuring secrets, or enabling live authentication.
- Implementing payments, messaging, parent portals, student portals, file uploads, or full create/edit workflows.
- Building or deploying a separately hosted API in `backend/` during this change.

## Decisions

### Use `frontend/` as the deployable full-stack Next.js application

The initial app will use Next.js App Router with TypeScript. Pages and components live under `frontend/src/app` and `frontend/src/components`; server-only repositories and domain services live under `frontend/src/server`. The existing `backend/` placeholder remains unused rather than being deleted.

This preserves the single-project deployment discussed with the user while maintaining boundaries that can later be extracted. A Vite SPA plus separate API was considered, but it would require two runtimes before the domain is validated and would provide less direct support for future SSR/SEO pages.

### Use Tailwind CSS, shadcn-style primitives, Lucide icons, and Recharts

The references share a restrained administration aesthetic: off-white canvas, dark teal navigation, compact cards, semantic status colors, and data-dense tables. Reusable local UI primitives will own buttons, cards, badges, progress, tables, and responsive navigation. Recharts will handle analytics visualizations.

Copying a complete dashboard template was considered but rejected because it would import unrelated dependencies and make it harder to align the five references into one coherent product language.

### Organize the UI by domain feature

Routes will cover `/progress`, `/students`, `/classes`, `/attendance`, and `/analytics`, with `/` redirecting to `/progress`. Domain-facing components live in corresponding feature directories and share shell primitives. Server components perform initial reads; client components are limited to interactions such as filters, pagination, attendance toggles, and mobile navigation.

### Put all fixtures behind an asynchronous repository contract

Typed entities and fixtures live under `frontend/src/server/data/mock`, while page-oriented repository interfaces expose queries such as progress overview, student list, class list, attendance sheet, and analytics. Components receive view models and never import fixture arrays.

An in-memory synchronous import was considered but rejected because it encourages fixture coupling and makes a later network transition visible throughout the component tree.

### Model relationships before persistence

Fixtures will include organizations, profiles/roles, teachers, students, classes, enrollments, attendance sessions/records, assessments/results, and lesson progress. Stable string UUID-like IDs and `organizationId` ownership enable join validation and map directly to future PostgreSQL relations.

Derived totals are calculated from fixtures where practical instead of maintained as unrelated constants. Page-specific query functions may return denormalized view models, matching the eventual SQL JOIN or database-view output.

### Stage Supabase connection as a later change

The follow-up sequence is: review fixture entities, design SQL schema, create migrations and indexes, configure Supabase Auth identity mapping, add organization memberships and roles, write and test RLS policies, implement server-side repositories, then switch the repository composition root through configuration. Browser code will not receive a service-role key.

## Risks / Trade-offs

- [Five pages make the first slice broad] → Reuse one shell and primitives; keep first-version actions intentionally limited to filters and mock attendance changes.
- [Mock data may hide database query constraints] → Preserve normalized IDs, tenant ownership, and repository-level denormalized outputs; add relationship integrity tests.
- [A full-stack Next.js folder may be confused with a standalone frontend] → Document `src/server` as server-only and import `server-only` in persistence modules.
- [Reference images are desktop-first] → Define mobile behavior explicitly and verify common desktop and mobile widths during implementation.
- [Supabase RLS can change query behavior] → Treat RLS and SQL integration as a separate reviewed change with policy tests before replacing mocks.

## Migration Plan

1. Initialize the Next.js application inside `frontend/` and keep the empty `backend/` placeholder intact.
2. Add domain entities, relational fixtures, repository contracts, and mock implementations.
3. Build shared UI primitives and the responsive administration shell.
4. Add the five routes and validate states, filters, pagination, and charts.
5. Verify type checks, automated tests, production build, and responsive rendering.
6. In a subsequent OpenSpec change, add Supabase schema/RLS and switch repository bindings incrementally; rollback remains selecting the mock binding.
