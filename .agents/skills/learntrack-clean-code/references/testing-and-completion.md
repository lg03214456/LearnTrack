# Testing and Completion Rules

Read this reference before handing off any code change.

## Proportional verification

Run checks from `frontend/`:

1. `pnpm format:check`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build` when routes, build configuration, dependencies, or server/client boundaries changed

If a check cannot run, report the exact command, failure, and remaining risk. Do not describe an unrun check as passing.

## Test focus

- Add or update tests for filtering, sorting, state transitions, authorization decisions, and data transformations.
- Prefer behavior assertions over implementation-detail assertions.
- For a bug fix, add a regression test when the failure can be reproduced reliably.
- Keep fixtures small and representative.

## Documentation

Update only the documentation affected by the change:

- Module location or route ownership: the relevant feature map linked by `docs/codemap.md`.
- UI-to-action flow: `docs/ui-backend-actions.md`.
- Architecture boundary or provider choice: `docs/system-architecture.md`.
- Supabase schema, auth, storage, or RLS: `frontend/docs/supabase-handoff.md`.
- Team-wide coding rule: `docs/engineering-standards.md` and, when needed, this skill's focused reference.

Summarize changed files, verification results, known limitations, and the next useful step.
