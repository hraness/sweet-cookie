<!-- kb:context scopes/repository--cdb4ee2aea69 -->
# Contents

- `packages/core/` – the public `@steipete/sweet-cookie` library, CLI, browser integrations, and tests.
- `apps/extension/` – the browser extension and its isolated build and tests.
- `docs/` – current architecture and protocol documentation.
- `kb/` – authored repository rationale, evidence, synthesis, and plans.
- `.agents/skills/` – reusable cross-repository KB and phased-execution workflows.
- `WRITING.md` and `STYLE.md` – internal and public prose contracts.
- `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml` – the upstream-compatible pnpm workspace and frozen dependency graph.
- `portfolio-inventory.json` – repository-owned public component metadata for the Hraness portfolio federation.

# Guidelines

- Keep this Hraness fork thin and upstream-rebase-friendly. Preserve the public `@steipete/sweet-cookie` identity, pnpm 11 command surface, and directory shape. Release Hraness source only through immutable Git tags and GitHub Releases. Treat npm 0.4.1 as distinct historical upstream evidence, and do not publish to npm without separate authorization and verified package-owner access.
- Keep the root shim, core manifest, and portfolio component name and version exact. Leave `publications` empty while the Hraness source is Git/GitHub-only.
- Follow `WRITING.md` for internal prose and `STYLE.md` for public prose. Keep mandatory rules in the closest `AGENTS.md`, current procedures in `docs/`, executable contracts in types and tests, and pull-based rationale and plans in `kb/`.
- Apply unreasonably robust programming when agent work is cheap. Model invalid states out of existence, parse foreign values from `unknown`, pair readable regression examples with property tests for general laws, and preserve exact browser-specific evidence.
- Deliver changes to `main` through a current-head pull request. Keep the stable `Required` CI job green, resolve every review thread, and serialize merges. Human approval stays optional while one regular maintainer would otherwise self-review. Never force-push or bypass the gate.
- Pin Hraness dependencies to reviewed immutable releases or full commits. Never connect repositories with sibling paths, Git submodules, or coordinated `main` assumptions.
- Extract a shared package only after two concrete consumers need the same stable interface. Keep every shared package product-neutral and keep extension composition and browser-specific policy here.
- For UI work, consume shared design-kit or `@hraness/ui` primitives only at immutable versions; keep product composition and the local visual contract in the owning product.
- Use the official, unmodified Nebula Sans Book and Bold cuts for ordinary extension-popup text. Keep cookie names, values, and previews on the explicit monospace role, and ship the font license and provenance with the built extension.
- Freeze shared interfaces before parallel lanes begin. Give manifests, lockfiles, generated files, and other convergence surfaces one owner while lanes edit disjoint paths.
- Keep root product skills, when added, under `skills/`; `.agents/skills/` contains the portable repository baseline.
- Do not change package manifests or locks for KB tooling. Run `bunx --bun github:hraness/kb#v0.15.1 refresh --root kb`, `bunx --bun github:hraness/kb#v0.15.1 check --root kb`, and `bunx --bun github:hraness/kb#v0.15.1 agents check --root kb --repo .` directly.
- Run `pnpm check`, `pnpm build`, `pnpm test`, and `pnpm test:bun` before handing off source changes.

<!-- hra-local-efficiency:start -->
- Treat the user's request to change this repository as standing authorization for routine task-owned commits, pushes, pull requests, merges, releases, deployments, and production verification after the repository's required validation, review, identity, and rollout gates pass. Do not ask for another confirmation at each delivery step.
- Use the repository's documented delivery workflow and preserve every runtime-enforced approval, branch protection, environment rule, safety policy, and final gate. Ask for user input only when delivery needs a material product decision, missing credentials or authority, an irreversibly destructive action outside task scope, or resolution of a release failure that cannot be handled safely and autonomously.
- Prefer short-lived repository workload identities such as OIDC trusted publishing, GitHub Apps, and narrowly scoped machine identities. Do not add long-lived personal tokens, weaken two-factor authentication, or bypass provider controls to eliminate an interactive prompt. Batch unavoidable human-gated production promotions into intentional stable releases while agents publish validated prerelease or beta channels through workload identities when the repository supports them.
- Preserve useful reasoning fan-out, but avoid unnecessary checkout fan-out. Prefer subagents in the current task for bounded research, review, diagnosis, and focused checks when they can safely share one working tree; create a separate task or worktree only for independently deliverable divergent edits, an isolated verification tree, or a different execution environment.
- Give each expensive focused validation command and external wait one owner. The integration owner reviews that evidence and runs the repository-required aggregate or final gate once after convergence. Reuse evidence only for the exact Git tree, command, lockfiles, toolchain, relevant environment, and validity period, and never to skip a required final integration, merge, release, deployment, or production-verification gate.
- On Hraness development machines, use `$hra-local-efficiency` and the installed host scheduler for heavyweight top-level commands when available. Keep ordinary work in the compute lane; give authenticated browser/dev-server/Chromium work one `browser-auth` owner and Mac-only validation one `mac-native` owner.
- When a CI or policy gate scans complete Git history, check out the exact governed SHA and fetch only the fully qualified governed refs before scanning. Preserve the complete-history gate and reject unexpected refs instead of importing unrelated concurrent heads.
- At closeout, record applicable branch, PR, check, merge, release, deployment, and production evidence. Archive only conclusively finished tasks, never from silence alone, and reclaim only freshly revalidated clean merged worktrees through the guarded exact-path flow.
<!-- hra-local-efficiency:end -->
