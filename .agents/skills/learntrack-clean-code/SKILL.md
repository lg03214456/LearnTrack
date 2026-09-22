---
name: learntrack-clean-code
description: Apply LearnTrack-specific maintainability rules when creating, changing, refactoring, or reviewing project code. Route to focused references for architecture, UI, permissions, and verification. Do not use for product planning or documentation-only work.
---

# LearnTrack Clean Code

Keep changes easy to locate, test, and replace without loading every project rule into context.

## Workflow

1. Preserve the user's scope and inspect the existing implementation before editing.
2. Read only the references that match the change:
   - Data flow, repositories, services, mocks, providers, domain models, or module boundaries: [architecture-and-data.md](references/architecture-and-data.md)
   - React routes, components, forms, styling, naming, or accessibility: [ui-and-naming.md](references/ui-and-naming.md)
   - Authentication, roles, permissions, organization scope, mutations, or RLS: [security-and-actions.md](references/security-and-actions.md)
   - Before handing off any code change: [testing-and-completion.md](references/testing-and-completion.md)
3. Use [docs/codemap.md](../../../docs/codemap.md) only as the module index. Follow its link to the affected feature map; do not read unrelated feature maps.
4. Use [docs/engineering-standards.md](../../../docs/engineering-standards.md) only when a rule is ambiguous, the user requests a standards review, or the focused references do not cover the case.
5. Prefer the smallest coherent change. Do not add speculative abstractions or dependencies.

## Non-negotiable boundaries

- UI pages and components do not import mock data, server actions, or storage clients directly.
- Pages read and write through the feature repository interface; providers choose the implementation.
- Browser code never imports server-only modules.
- Authorization is enforced in the data or server boundary, not only by hiding UI controls.
- Keep unrelated user changes intact.

When a change spans multiple categories, read the union of the relevant references once.
