---
title: Getting Started — WebMCP SDK for JavaScript & React
description: Install simple-webmcp, wrap your first function with webmcp(fn), register via vanilla or React useWebMCP/Scope. Zod, hooks, and browser support in 30 seconds.
---

# Getting Started

> **Prerequisites:** Node 18+, any modern bundler (Vite, Next.js, etc.). WebMCP is native in Chrome Canary (origin trial) — other browsers use the production polyfill or the dev shim. See [Browser Support](/guide/browser-support).

## Install

```bash
npm i simple-webmcp
# pnpm add simple-webmcp
# yarn add simple-webmcp
# React is optional peer only if you use simple-webmcp/react
```

Repo: [github.com/emingure/simple-webmcp](https://github.com/emingure/simple-webmcp) · npm: [simple-webmcp](https://www.npmjs.com/package/simple-webmcp)

## 30-second start

### Vanilla — global or manual

```ts
import { webmcp } from 'simple-webmcp';

async function addToCart({ productId, quantity }: { productId: string; quantity: number }) {
  cart.push({ productId, quantity });
  return { ok: true };
}

export const tool = webmcp(addToCart, {
  description: 'Add product to shopping cart',
  fields: {
    productId: { description: 'Product ID' },
    quantity: { type: 'integer', minimum: 1 },
  },
});

// still callable
await tool({ productId: 'p_1', quantity: 2 });

// global (registers on import, client only)
webmcp.global(addToCart, { description: '...' });
// or
webmcp(addToCart, { description: '..', global: true });

// manual — anywhere
await tool.register(); // => document.modelContext.registerTool(...)
tool.unregister();
```

Browser API is [`document.modelContext.registerTool`](https://developer.chrome.com/docs/ai/webmcp/imperative-api) — `simple-webmcp` keeps you on `webmcp(fn)` while the platform evolves.

### React — page / layout scope (1-line optional wrapper)

```tsx
'use client';
import { useWebMCP, Scope } from 'simple-webmcp/react';
// or useTool alias
import { useTool } from 'simple-webmcp/react';

// 1-line: define + wrap + register while mounted (recommended)
export function Page() {
  const searchTool = useWebMCP(searchCustomers, { description: 'Search customers' });
  // also: const searchTool = useTool(searchCustomers, { description: '...' });
  // searchTool({query:'a'}) still callable
  return <SearchUI />;
}

// verbose 2-line still works:
import { webmcp } from 'simple-webmcp';
const searchTool2 = webmcp(searchCustomers, { description: 'Search' });
export function Page2() {
  useWebMCP(searchTool2); // mounted = exposed (AbortSignal)
  return <SearchUI />;
}

// route-level via layout (Next.js app/layout.tsx naturally gives route scope)
export function Layout({ children }: { children: React.ReactNode }) {
  const t = useWebMCP(searchCustomers, { description: 'Search' }); // or pre-wrapped tool
  return <Scope tools={[t]}>{children}</Scope>;
}
```

See [React guide](/guide/react) and [Reference — React](/reference/react) for `useWebMCP` options and `Scope`.

### Zod / StandardSchema

```ts
import { z } from 'zod';
import 'simple-webmcp/zod'; // enables Zod → JSON conversion (keeps core lean)

webmcp(fn, { description: '…', schema: z.object({ query: z.string().min(1) }) });
webmcp(fn, { fields: { query: z.string().describe('Name or email') } });
```

> `schema` (whole) establishes contract; `fields` patches it. See [Schema](/guide/schema).

### Browser support (Firefox / Safari)

WebMCP is Chrome-only today (`document.modelContext`). For production cross-browser, use the real polyfill [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill). For dev only:

```ts
import 'simple-webmcp/dev-polyfill'; // no-op in Chrome with native, in-memory shim elsewhere
```

See [Browser Support & Polyfill](/guide/browser-support).

## Hierarchy

```
schema (whole StandardSchema/JSON) → inferred (runtime best-effort, optional build-time) → fields patch → metadata (name/desc/annotations)
```

Prefer `fn({query, limit})` single object param — best inference. `strict:true` makes low-confidence inference throw. See [Schema & Inference](/guide/schema).

### Hooks (global / scoped / tool)

```ts
// global — analytics once
webmcp.configure({ hooks:{ before:[track], after:[trackResult], error:[report] }});

// tool — HITL approval
webmcp(checkout, { hooks:{ before:[async ({input})=>{
  const ok = await confirm(`Approve £${total}?`);
  if(!ok) return {action:'deny', message:'User declined'};
}]}});

// React scoped — tenant
<WebMCPProvider hooks={{ before:[({input})=>({input:{...input, tenantId}})] }}>
  <Scope tools={[tool]}>{children}</Scope>
</WebMCPProvider>
```

Hooks wrap only the agent path — `tool({input})` stays pure. See [Guide — Hooks](/guide/hooks) and [Analytics Step-by-Step](/guide/analytics/step-by-step).

## Next steps

* [Schema & Inference](/guide/schema) — fields, Zod, runtime vs build
* [React](/guide/react) — `useWebMCP`, `Scope`, `WebMCPProvider`
* [Hooks](/guide/hooks) — `before/after/error/denied`, HITL demo
* [Analytics — Overview](/guide/analytics/) — PostHog, Sentry, GA4
* [Analytics — Step-by-Step](/guide/analytics/step-by-step) — 4-step setup
* [Browser Support](/guide/browser-support) — Chrome, Firefox, Safari, polyfill
* [Reference — Core](/reference/) — `webmcp()` options, `register()` lifecycle
* [Inspect](/guide/inspect) — `listTools`, `invokeTool`, `<Inspector>`
* [Demo](/demo) — shopping cart + Hooks & HITL log
