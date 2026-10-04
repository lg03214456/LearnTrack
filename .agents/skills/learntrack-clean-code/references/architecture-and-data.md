# Architecture and Data Rules

Use these rules for modules, domain models, repositories, services, providers, mocks, and persistence.

## Dependency direction

Keep dependencies moving inward:

Reads and writes use separate entry paths while sharing domain contracts:

`read route/page -> repository interface -> repository implementation -> data source`

`feature UI -> typed Server Action -> service -> repository interface -> repository implementation -> data source`

- Feature UI may depend on contracts, view models, and repository interfaces.
- Services depend on repository interfaces, not concrete Mock or Supabase stores.
- Repository implementations must not depend on UI, services, or server actions.
- Mock repositories may depend on mock fixtures.
- Server actions authenticate, validate, authorize, and delegate; direct database access belongs in a
  repository implementation unless the action is itself a deliberately documented adapter boundary.
- Do not let pages or components select mock versus production storage.

## Feature shape

Add files under the owning feature before creating a new global abstraction:

- `types.ts`: API/domain contracts.
- `view-models.ts`: display-ready values and labels.
- `repository.ts`: interface used by UI.
- `*-repository.ts`: concrete adapter.
- `service.ts`: orchestration independent of React.
- `actions.ts`: server mutation/query boundary.
- `mock-data.ts`: fixtures used only by mock adapters or tests.

Names should reveal domain intent. Avoid generic `utils`, `helpers`, `data`, or `common` files unless their contents are truly cross-feature.

## Data correctness

- Define an authoritative source for counts, statuses, and progress; do not maintain competing totals.
- Validate identifiers and input ranges at server/action boundaries.
- Normalize persisted data before returning it to the UI.
- Model multi-to-many relationships explicitly; do not infer enrollment from labels or display text.
- Keep adapters replaceable so mock data can later be replaced with Supabase without changing page components.

For locating code, start at `docs/codemap.md` and open only the affected feature map.
