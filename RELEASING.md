# Releasing — simple-webmcp

This package follows **Semantic Versioning** and **Keep a Changelog**. Two release paths are supported — pick one per release.

---

## Semver policy

* **0.y.z** — initial development. `0.1.0` is current. Breaking changes land as `0.MINOR` until `1.0.0`. After `1.0.0`:
  * **MAJOR** (`1.0.0 → 2.0.0`): breaking API — removed/renamed `webmcp` options, `register` signature change, `WebMCPTool` shape change.
  * **MINOR**: new feature — new export (`./zod`, `./react`), `useTool`, `fields` capability, `Scope`. No breaking.
  * **PATCH**: bug fix, docs, types, error wording, registry dedup. No API change.

Commit messages use **Conventional Commits** so changelogs and release notes stay accurate:

```
feat: add useTool alias for 1-line React           -> MINOR
fix: registry unsupported vs registered fix          -> PATCH
docs: update hero positioning                        -> PATCH (docs)
feat!: rename webmcp option `global` to `scope`       -> MAJOR (!)
```

---

## Prerequisites (once)

1. `NPM_TOKEN` in GitHub → Settings → Secrets and variables → Actions → New repository secret → `NPM_TOKEN` (npm → Access Tokens → Classic, Automation, or Granular with publish). Needed for `npm publish --provenance`.
2. `GITHUB_TOKEN` is auto-provided — no setup.
3. Install: `npm i` (gets `@changesets/cli`).

---

## Path A — Changesets (recommended for PRs)

Best when contributors add features. No manual `package.json` edit.

**1. In your feature PR, create a changeset:**

```bash
npx changeset
# ? bump: patch / minor / major
# ? summary: feat: add useTool ...
# creates .changeset/<random>.md
git add .changeset/*.md && git commit -m "feat: add useTool"
```

**2. Push PR → CI checks.** On `push` to `main`, `.github/workflows/changesets.yml` runs `changesets/action`:

* If changeset files exist, it opens/updates a **“chore(release): version packages”** PR that:
  * bumps `package.json` version,
  * updates `CHANGELOG.md` via `@changesets/changelog-github` (links to PR, repo `emingure/simple-webmcp`),
  * removes consumed `.changeset/*.md`.

**3. Review & merge** the Version Packages PR → workflow runs `npm run release` (`changeset publish`):

* `npm ci && npm run build && npm test`
* `npm publish --provenance --access public` (needs `NPM_TOKEN` + `id-token: write`)
* `gh release create` (auto via `createGithubReleases: true`) with changelog excerpt.

**When to use:** Any PR that should affect version. Docs-only PRs: no changeset needed (CI verifies build).

---

## Path B — Manual, tag-triggered (solo, fastest)

Best for a quick fix when you control `main`.

```bash
# 1. Ensure main is green
git checkout main && git pull
npm ci && npm run typecheck && npm test && npm run build

# 2. Bump, commit, tag, push (pick one)
npm run release:manual:patch   # 0.1.0 -> 0.1.1
npm run release:manual:minor   # 0.1.0 -> 0.2.0
npm run release:manual:major   # 0.1.0 -> 1.0.0
# each runs: npm version <level> -m 'chore(release): %s' && git push --follow-tags

# 3. GitHub Action .github/workflows/release.yml triggers on tag v*:
#  - verifies tag == package.json version
#  - npm publish --provenance
#  - extracts CHANGELOG.md section for that version
#  - softprops/action-gh-release creates GitHub Release (with generate_release_notes)

# 4. If CHANGELOG not yet updated, edit manually then:
git add CHANGELOG.md && git commit -m "docs(changelog): 0.1.1" && git push
```

**Manual changelog alternative:**

```bash
# Conventional Commits since last tag -> append to CHANGELOG.md
npm run changelog
# then edit, commit, push
```

---

## Changelog

`CHANGELOG.md` follows **Keep a Changelog** + **Common Changelog**:

```md
# Changelog
## [Unreleased]
## [0.1.1] - 2026-08-30
### Fixed
- registry: make supported/registered mutually exclusive
```

* Changesets auto-appends on `changeset version`; manual path: edit by hand or `npm run changelog`.
* Each release's notes are also the GitHub Release body.

---

## Pre-releases

```bash
npm version 0.2.0-0 -m 'chore(release): %s' && git push --follow-tags
# tag v0.2.0-0 -> workflow marks `prerelease: true` in GitHub Release
# or: npx changeset pre enter next && npx changeset version
```

Npm dist-tag stays `latest` unless you `npm publish --tag next`.

---

## Checklist before any release

- [ ] `npm run typecheck && npm test && npm run build` green
- [ ] `npm run docs:build` if docs changed
- [ ] `CHANGELOG.md` has `Unreleased` or version section
- [ ] `git status` clean, on `main`, `git pull` latest
- [ ] `NPM_TOKEN` valid (test `npm publish --dry-run`)

## Rollback

If publish succeeded but is bad:

```bash
npm deprecate simple-webmcp@0.1.1 "yanked — use 0.1.2"
# or unpublish only within 72h and if no dependents:
npm unpublish simple-webmcp@0.1.1
gh release delete v0.1.1 --yes && git push origin :v0.1.1 && git tag -d v0.1.1
```

## Secrets

* `NPM_TOKEN` — npm Access Token (Automation). Rotate in npm + GitHub Secrets if leaked.
* `GITHUB_TOKEN` — auto.

---

**TL;DR**

* PR with feature → `npx changeset` → merge Version Packages PR → auto publish.
* Solo hotfix → `npm run release:manual:patch` → tag → auto publish.
