# simple-webmcp

> Turn any JS/TS function into a WebMCP tool — `webmcp(fn)` stays callable, auto-registers with React lifecycle or globally. Minimal, typed, framework-agnostic.

```ts
import { webmcp } from 'simple-webmcp';

async function searchCustomers({ query, limit = 20 }: { query: string; limit?: number }) {
  return customers.filter(c => c.name.includes(query)).slice(0, limit);
}

// One line — same function, now also a tool
export const searchTool = webmcp(searchCustomers, {
  description: 'Search customers in current account',
  fields: { query: { description: 'Name, email, or ID' } },
});

await searchTool({ query: 'alice' }); // still just a function
await searchTool.register(); // => document.modelContext.registerTool(...)
// or React: useWebMCP(searchTool) → mounted = exposed
```

Works with plain JS, TS, React, Vite… (Next.js Server Actions experimental 0.3). Open source, lean (`sideEffects:false`, core no React dep).

**Docs:** https://emingure.github.io/simple-webmcp/ (via GitHub Pages)

## Install

```bash
npm i simple-webmcp
# React is optional peer (≥18) only if you import simple-webmcp/react
# Repo: https://github.com/emingure/simple-webmcp
```

## Quick Start

| Need | Code |
|------|------|
| Vanilla — global | `webmcp(fn,{description, global:true})` or `await tool.register()` |
| Vanilla — manual | `tool.register()` / `tool.unregister()` |
| React — page | `useWebMCP(tool)` while component mounted |
| React — layout / route | `<Scope tools={[a,b]}>{children}</Scope>` |
| Rate-limited / disabled | `webmcp(fn,{enabled:false})` |
| Polyfill (Firefox/Safari) | `import 'simple-webmcp/polyfill'` |

## Schema

Hierarchy **corrected per review**: `schema` (whole) → inferred (runtime 0.1 / build 0.2 TS/JSDoc) → `fields` patch → metadata override.

```ts
// prefer single object param fn({query, limit}) for best inference
webmcp(fn, { description:'…', fields:{ query:{description:'…'}, limit:{type:'integer', maximum:50} } });

// whole Zod / StandardSchema — requires `simple-webmcp/zod` side-effect (keeps core lean)
import { z } from 'zod';
import 'simple-webmcp/zod'; // enables Zod → JSON Schema in core
webmcp(fn, { description:'…', schema: z.object({ query: z.string().min(1) }) });

// per-field mix — same import enables it
webmcp(fn, { fields:{ query: z.string().describe('…'), limit:{type:'integer'} } });

// JSON Schema directly
webmcp(fn, { schema:{type:'object', properties:{query:{type:'string'}}, required:['query']} });
```

`fields` is a **patch** (`Partial<JsonSchema>` or per-field `StandardSchema`) — annotates, does not silently replace core type. Provide `strict:true` to make ambiguous runtime inference throw instead of warn.

## React

```tsx
'use client';
import { webmcp } from 'simple-webmcp';
import { useWebMCP, Scope } from 'simple-webmcp/react';

const tool = webmcp(fn, { description:'…' });

export function Page() {
  const { supported, registered, error } = useWebMCP(tool);
  return null; // exposed while mounted — maps to AbortSignal
}

// layout-level route scope (Next.js app/layout.tsx naturally gives route scope)
<Scope tools={[toolA, toolB]}>{children}</Scope>
```

## Polyfill

`simple-webmcp/polyfill` is an adapter entry (not hard-coded to one impl). It installs a thin in-memory shim if `document.modelContext` missing, shielding spec churn. For full MCP transport, install `@mcp-b/global` before.

```ts
import 'simple-webmcp/polyfill';
import { installPolyfill } from 'simple-webmcp/polyfill'; // programmatic
```

## API

See `.agents/skills/webmcp-simple/references/api.md` and examples `examples/`.

### Core

- `webmcp(fn, opts)` → `WebMCPTool<F>` (callable + `tool/definition/register/unregister/status`)
- `webmcp.global(fn, opts)` alias
- `isWebMCPSupported()`, `toSnakeCase`, `registry.list()/clear()`
- Errors: `NotSupportedError`, `NotAllowedError` (Permissions Policy), `RegistrationError`, `ValidationError`, `ConfigurationError`

### React

- `useWebMCP(tool, {enabled})`
- `<Scope tools>`

### Errors & Lifecycle

`register()` is async `Promise<()=>void>` per current WebMCP types. `status: 'unregistered'|'registering'|'registered'|'unregistering'|'error'`. Use `tool.status` / `tool.isRegistered()`; hook exposes `supported/registered/error`.

## Development

```bash
npm run build      # tsup ESM+CJS+DTS
npm test           # vitest jsdom
npm run typecheck
```

## Versioning

- **0.1** — `webmcp()` + `useWebMCP` + `Scope` + runtime fallback + polyfill adapter + tests (this release)
- **0.2** — `simple-webmcp/unplugin` TS/JSDoc build inference (Vite/Webpack)
- **0.3** — `simple-webmcp/next` `webmcp.server()` — experimental, gated behind working `fixtures/next-app` spike (verifies Server Action reference survival)
- **0.4** — `webmcp.bind()`, DevTools, CLI

## Skills (Agent)

This package ships `.agents/skills/webmcp-simple/SKILL.md` for auto-discovery by OpenCode/Claude. No install needed — agents discover via `.agents/skills/`.

## License

MIT
