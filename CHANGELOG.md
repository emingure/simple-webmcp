# Changelog

All notable changes to this project will be documented here.

## 0.1.0 - 2026-08-29

### Added
- Core `webmcp(fn, opts)` — callable wrapper, `webmcp.global()` alias
- Hierarchy `schema` (whole StandardSchema/JSON) > inferred (runtime) > `fields` patch (`Partial<JsonSchema>` | per-field StandardSchema) > metadata
- `FieldDef` simplified to `Partial<JsonSchema>` per review
- Single `schema` alias (not `schema`/`inputSchema` both), `annotations` extensible `Record<string,unknown>`
- Async `register(): Promise<()=>void>` + `status` + `isRegistered()` per WebMCP spec (AbortSignal lifecycle)
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
