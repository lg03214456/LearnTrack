# UI and Naming Rules

Use these rules for React routes, components, forms, styling, and user interactions.

## Component responsibilities

- Route files compose the page and request data through repository interfaces.
- Feature components own domain-specific presentation and interaction.
- Shared UI components remain domain-neutral.
- Extract a component for a distinct responsibility, repeated behavior, or independently testable interaction—not only to shorten a file.

## State and derived values

- Keep the minimum source state; compute filtered lists, totals, and labels from it.
- Do not store the same fact in multiple state variables.
- Keep query parameters as the source of truth when navigation or sharing must preserve filters or tabs.
- Use view models for repeated formatting or status mapping.

## Naming and formatting

- Components and types: `PascalCase`.
- Variables, functions, and hooks: `camelCase`; hooks start with `use`.
- Constants: `UPPER_SNAKE_CASE` only for genuine constants.
- Event handlers describe intent, such as `handleArchiveClass`.
- Boolean names read as questions, such as `isArchived` or `canEdit`.
- Let Prettier own layout. Do not hand-format around it.

## Interaction quality

- Preserve visible features unless the request explicitly removes them.
- Every interactive icon needs an accessible name.
- Inputs need labels or equivalent accessible names.
- Keyboard focus must remain visible and interactions must not depend on hover alone.
- Prefer inline validation near the field; do not use a toast for routine filtering or navigation feedback.
- Avoid nested scrolling regions unless the content truly needs an independent viewport.
