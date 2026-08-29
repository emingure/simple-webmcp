# Getting Started

## Install

```bash
npm i simple-webmcp
# React is optional peer only if you use simple-webmcp/react
npm i react@^18  # if you use useWebMCP / Scope
```

Repo: [github.com/emingure/simple-webmcp](https://github.com/emingure/simple-webmcp)

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

### Zod / StandardSchema

```ts
import { z } from 'zod';
import 'simple-webmcp/zod'; // enables Zod → JSON conversion (keeps core lean)

webmcp(fn, { description: '…', schema: z.object({ query: z.string().min(1) }) });
webmcp(fn, { fields: { query: z.string().describe('Name or email') } });
```

> `schema` (whole) establishes contract; `fields` patches it. See [Schema](/guide/schema).

### Polyfill (Firefox / Safari)

WebMCP is Chrome-only today (`document.modelContext`). For dev or cross-browser:

```ts
import 'simple-webmcp/polyfill'; // no-op in Chrome with native
```

## Hierarchy (corrected)

```
schema (whole StandardSchema/JSON) → inferred (runtime 0.1, build TS/JSDoc 0.2) → fields patch → metadata (name/desc/annotations)
```

Prefer `fn({query, limit})` single object param — best inference. `strict:true` makes low-confidence inference throw.

## Next steps

* [Schema & Inference](/guide/schema) — fields, Zod, runtime vs build
* [React](/guide/react) — `useWebMCP`, `Scope`, StrictMode
* [API](/api/) — `webmcp()` options, `register()` lifecycle
