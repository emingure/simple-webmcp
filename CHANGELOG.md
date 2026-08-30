# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-08-30

### Added
- `hooks` — `before` / `after` / `error` / `denied` lifecycle hooks for `webmcp(fn, {hooks})` — state-based, no chain abstraction — `src/hooks/types.ts:1`, `src/hooks/engine.ts:1`, `src/hooks/config.ts:1` (`invocationId` `crypto.randomUUID` || fallback, `metadata` mutable bag, cooperative `AbortSignal`, safe observers)
- Global hooks via `webmcp.configure({hooks})` / `configureWebMCP` / `getGlobalHooks` / `resetGlobalHooks` — `src/hooks/config.ts:1` singleton `__simpleWebmcp_hooks`, double-wrap concat — `src/webmcp.ts:8`
- Scoped hooks via `<WebMCPProvider hooks>` — `src/hooks/provider.tsx:1` (`WebMCPHooksContext`, nesting merges additively, `before: global→scoped→tool`, `after: tool→scoped→global`) — `src/react/useWebMCP.ts:7`, `src/react/index.ts:1`
- `WebMCPOptions.hooks` and `WebMCPTool.__hooks/__scopeHooks/__activeSignal` — `src/types.ts:68` (`AfterContext` typed `Awaited<ReturnType<F>>`)
- Demo **Hooks & HITL** — `examples/demo/index.html:1` (global `trackInvocation/trackResult/trackError/trackDenied` + `addRequestMeta`/`redactCheckoutAfter`, tool-level `requireApproval` async modal for `checkout` with `action:'deny'`, hook log UI + `console [webmcp:hook]`, `Test deny`/`Test error` buttons) — synced `docs/public/demo/index.html`
- Docs: `docs/guide/hooks.md:1` (lifecycle, ordering, HITL, tenant/auth patterns), `docs/api/hooks.md:1` (contexts, `WebMCPHooks`, `mergeHooksOrdered`, `createHookedExecute`), `docs/guide/analytics.md:1` (PostHog, Mixpanel, Amplitude, GA4, Segment, Sentry, Datadog, Vercel, Plausible, React tenant)
- Tests: `tests/hooks.test.ts:1` (15 tests: before/after chain, deny, error swallow, metadata, direct-call bypass, global ordering, merge, validation after before, abort) + `tests/hooks-react.test.tsx:1` (5 tests: provider ordering, nesting, scoped mutate, scoped deny, raw fn with provider) — 67 total
- `src/internal/normalize.ts:43` (`normalizeError` now handles `DOMException.message`)

### Changed
- `src/webmcp.ts` — `validate` now via `standard['~standard'].validate` and `ValidationError`
- `docs/.vitepress/config.ts:8` — sidebar adds *Hooks* + *Analytics*; `docs/api/index.md`, `docs/api/react.md`, `docs/guide/react.md`, `docs/demo.md`, `docs/getting-started.md`, `README.md` mention hooks
- Core `+~0.8KB gz` (`6.26KB gz` → `~7.1KB`)

### Fixed
- `denied` now returns `{isError:true, content:[{text:'Denied: …'}]}` and runs `denied[]` without `after` — `src/hooks/engine.ts:119`
- `error` hooks swallow throws and never recurse — `src/hooks/engine.ts:31`

## [0.2.0] - 2026-08-29

### Added
- `useWebMCP(fn, opts)` / `useTool` 1-line overload — wrap + register while mounted, returns `WebMCPTool & status` (optional, `useWebMCP(tool)` still works) — `src/react/useWebMCP.ts:20`
- `simple-webmcp/zod` as separate entry (5.32KB, keeps core 6.26KB gz lean) — `src/zod.ts:1`, `src/internal/schema.ts:1` now uses global converter
- `simple-webmcp/inspect` core API — `listTools()`, `listToolsAsync()`, `getTool()`, `invokeTool()`, `onToolsChanged()`, `isSupported()` — `src/inspect.ts:1` (merges `registry` + `document.modelContext.getTools()`)
- `simple-webmcp/devtools` React `Inspector` — `src/devtools/Inspector.tsx:1` (tool list, inputSchema, invoke, status)
- `simple-webmcp/dev-polyfill` and `simple-webmcp/testing` aliases for dev shim — `src/dev-polyfill.ts:1`, `src/testing.ts:1`, `tsup.config.ts:1`
- Live demo with **Inspect** panel — `examples/demo/index.html:1` (shopping cart + inspect, CDN fallback), `docs/public/demo/index.html`, `docs/demo.md:1` iframe, `docs/guide/inspect.md:1`, `docs/api/inspect.md:1`, VitePress `ignoreDeadLinks`
- Release process with semver + changelogs — `RELEASING.md:1`, `CONTRIBUTING.md:1`, `.changeset/config.json:1` (Changesets + `@changesets/changelog-github`), `.github/workflows/release.yml:1` (tag `v*` → npm provenance + GitHub Release), `.github/workflows/changesets.yml:1`
- Docs: VitePress site `docs/` repositioned hero to “Make your existing functions agent-ready”, before/after, competitor table, honest inference, framework-agnostic core wording
- Package now `emingure/simple-webmcp` — `package.json:1` author, repo, `LICENSE`, `src/internal/utils.ts:97` warn link, skills moved to `.agents/skills` for auto-discovery (`package.json:1` `files:[".agents/skills"]`)
- `registry` now stores `contract` + `execute` for inspect, global singleton `__simpleWebmcpRegistry` for cross-entry sharing — `src/internal/registry.ts:1`
- `examples/demo` + `docs/public/demo` static demo, `fixtures/next-app` spike placeholder, `.github/workflows/docs.yml:1` Pages

### Changed
- `registry`: `supported` vs `registered` mutually exclusive — `status:'unsupported'` instead of false `registered` when `document.modelContext` missing — `src/internal/registry.ts:53`, `src/webmcp.ts:142`, `src/types.ts:128` (`RegistrationStatus` + `unsupported`)
- `polyfill`: documented as **dev/testing shim**, not interoperability polyfill — recommend `@mcp-b/webmcp-polyfill` for real cross-browser — `src/polyfill.ts:1`, `docs/guide/polyfill.md:1`, `.agents/skills/webmcp-simple/SKILL.md:1`
- `README.md` + `docs/index.md` hero to “Make your existing functions agent-ready” (`One function. Two interfaces.`), Why, before/after `add_to_cart`, competitor table, complementary MCP-B positioning
- `docs/api/index.md:1` — `outputSchema` kept internally but not marketed; `status` now includes `unsupported`

### Fixed
- `useWebMCP` raw function now auto-wraps via `webmcp()` with stable `useMemo` deps (was warn/error) — `src/react/useWebMCP.ts:20`
- `react` tests — mock `document` now patches `modelContext` without wiping `document.body` (jsdom) — `tests/react.test.tsx:1`, `tests/scope.test.tsx:1`
- `registration` test — polyfill path now expects `unsupported` — `tests/registration.test.ts:98`
- Added `tests/inspect.test.ts:1` (3 tests) for `listTools`/`invokeTool`

## [0.1.0] - 2026-08-29

### Added
- Core `webmcp(fn, opts)` — callable wrapper, `webmcp.global()` alias
- Hierarchy `schema` (whole StandardSchema/JSON) > inferred (runtime) > `fields` patch (`Partial<JsonSchema>` | per-field StandardSchema) > metadata
- `FieldDef` simplified to `Partial<JsonSchema>` per review
- Single `schema` alias (not `schema`/`inputSchema` both), `annotations` extensible `Record<string,unknown>`
- Async `register(): Promise<()=>void>` + `status` per WebMCP spec (AbortSignal lifecycle)
- React `useWebMCP(tool,{enabled})` + `<Scope tools>` in `simple-webmcp/react` (route-level via layout)
- Polyfill adapter `simple-webmcp/polyfill` (not hard-coded)
- Lean core: `sideEffects:false`, `peer react` optional, `tsup` ESM+CJS+DTS, `exports` subpaths
- Tests: callable-wrapper, schema-merge, fields-patch, standard-schema, registration, normalize, react (StrictMode), scope — 42 tests
- Skills: `.agents/skills/webmcp-simple/SKILL.md` + `references/{api.md,recipes.md}` (auto-discovered)
- Examples: `vanilla.js`, `with-react.tsx`, `with-zod.ts`
- Build + CI ready (not yet published)

### Deferred
- 0.2 `unplugin` TS/JSDoc inference (Vite/Webpack)
- 0.3 `webmcp.server()` Next.js — experimental, requires `fixtures/next-app` spike vs Turbopack default
- 0.4 `bind()`, DevTools overlay, CLI `inspect`

### Fixed per review
- Hierarchy inverted → corrected, `fields` is patch
- `webmcp.server()` made spike, not promised
- Next compiler removed from 0.1 (Turbopack)
- `Scope` moved to react, not next
- Polyfill not hard-coded, no `/__webmcp.json` in 0.1

[Unreleased]: https://github.com/emingure/simple-webmcp/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/emingure/simple-webmcp/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/emingure/simple-webmcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/emingure/simple-webmcp/releases/tag/v0.1.0
