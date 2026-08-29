# Contributing — simple-webmcp

Thanks for contributing! This doc covers local dev, semver, and releasing.

## Setup

```bash
git clone https://github.com/emingure/simple-webmcp.git
cd simple-webmcp
npm ci
npm test          # vitest jsdom — 44 tests
npm run build     # tsup ESM+CJS+DTS
npm run docs:dev  # VitePress
```

## Semver

We follow **Semantic Versioning** (0.y.z → 1.0.0 stable):

* **PATCH** — fix, docs, types: `fix: registry unsupported` → `0.1.0 → 0.1.1`
* **MINOR** — feat: `feat: add useTool` → `0.1.0 → 0.2.0` (before 1.0, minor can be breaking)
* **MAJOR** — `feat!:` or `BREAKING CHANGE:` → `0.1.0 → 1.0.0`

Use **Conventional Commits** so changelogs are accurate. See `RELEASING.md`.

## Changesets (PRs)

If your PR should bump version, run:

```bash
npx changeset
# select patch/minor/major, write summary
git add .changeset/*.md && git commit -m "feat: add X"
```

No changeset needed for docs-only or `chore:`.

On `push` to `main`, the **Changesets** workflow opens a “Version Packages” PR that aggregates changesets, bumps `package.json`, and updates `CHANGELOG.md`. Merging it auto-publishes.

## Commit style

```
feat(react): add useTool alias
fix(registry): make unsupported vs registered exclusive
docs: rewrite hero to agent-ready
chore: update deps
feat!: rename global option
```

## Tests & docs

* Add tests in `tests/` — follow `callable-wrapper`, `react`, `scope` patterns.
* Update `docs/` if API changes; `npm run docs:build` must pass.

## Release

See `RELEASING.md` — maintainers only. TL;DR:

* Contributor PR: `npx changeset` → merge Version PR.
* Hotfix: `npm run release:manual:patch` → tag → GitHub Release workflow publishes.
