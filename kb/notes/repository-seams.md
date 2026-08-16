---
title: Repository seams
type: concept
tags:
  - architecture
  - dependencies
  - repositories
repository_scopes:
  - AGENTS.md
  - package.json
---

# Repository seams

Sweet Cookie is an upstream-derived TypeScript and pnpm workspace. Its package identity, pnpm command surface, directory layout, and public behavior are compatibility seams that keep upstream review and rebasing practical. Hraness governance stays in additive Markdown and agent-skill paths instead of changing those build contracts.

Wrench consumes Sweet Cookie through an immutable codeload commit. Keep that dependency across a released or full-commit boundary. Do not replace it with a sibling path, Git submodule, or coordinated `main` workflow. A consumer tests the exact artifact it declares.

The extension and cookie implementations remain owned here. Extract a new shared package only after two concrete consumers need the same stable, product-neutral interface. Preserve readable regression examples for browser behavior and add property tests when a parser, encoding, path rule, ordering rule, or round trip has a general law.

## Related

The normative rules remain in the root `AGENTS.md`. [[documentation-ownership|Documentation ownership]] explains how those rules relate to executable contracts and this pull-based context.

