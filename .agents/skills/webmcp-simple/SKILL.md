---
name: simple-webmcp
description: Expose existing JS/TS functions as WebMCP agent tools with minimal boilerplate — function-first, works with vanilla JS, TS, React, Vite, Next.js. Use when the user wants to make functions callable by LLM agents via WebMCP (document.modelContext).
---

# simple-webmcp Skill

## When to use

Trigger this skill when the user wants to:
- Expose a JS/TS function to LLM / agentic tool calling via WebMCP
- Make `addToCart`, `searchCustomers`, `updateCustomer`, etc. available as `document.modelContext` tools
- Support plain JS, TypeScript, React (scoped lifecycle), or Next.js (server actions) without heavy boilerplate

Do **not** use for consuming external APIs — this skill is for *exposing* your own functions as tools.

## Quick Start

### 1. Vanilla / Vite — 1 line

```ts
import { webmcp } from 'simple-webmcp';

async function searchCustomers({ query, limit = 20 }: { query: string; limit?: number }) {
  return customers.filter(c => c.name.includes(query)).slice(0, limit);
}

// still callable as before, but also a WebMCP tool descriptor
export const searchTool = webmcp(searchCustomers, {
  description: 'Search customers in current account',
  fields: {
    query: { description: 'Name, email, or ID' },
    limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Max results' },
  },
});

// vanilla global register (outside React)
await searchTool.register(); // => document.modelContext.registerTool(...)
searchTool.unregister();

// still callable like original
await searchTool({ query: 'alice' });
```

### 2. React — component lifecycle

```tsx
'use client';
import { webmcp } from 'simple-webmcp';
import { useWebMCP, Scope } from 'simple-webmcp/react';

const addToCartTool = webmcp(addToCart, { description: 'Add product to cart' });

export function ProductPage() {
  // exposed only while component mounted — maps to AbortSignal
  useWebMCP(addToCartTool);
  return <div>...</div>;
}

// Or route/component subtree (also works for Next.js layouts)
export function CustomersLayout({ children }: { children: React.ReactNode }) {
  return <Scope tools={[searchTool]}>{children}</Scope>;
}
```

### 3. Zod / StandardSchema — per-field or whole

```ts
import { z } from 'zod';
import { webmcp } from 'simple-webmcp';

// whole schema
webmcp(fn, { description: '…', schema: z.object({ query: z.string().min(1), limit: z.number().max(50).optional() }) });

// per-field mix — Lean + Zod
webmcp(searchCustomers, {
  description: 'Search',
  fields: {
    query: z.string().describe('Name or email'),          // StandardSchema
    limit: { type: 'integer', minimum: 1, maximum: 50 },  // FieldDef (Partial<JsonSchema>)
  },
});
```

In all cases `schema` (whole) establishes contract; `fields` patches it (adds descriptions, min/max) but does not silently change core type.

### 4. Polyfill (non-Chrome)

```ts
// before importing tools — no-op in Chrome with native WebMCP
import 'simple-webmcp/polyfill';
// or programmatic: import { installPolyfill } from 'simple-webmcp/polyfill'; installPolyfill();
```

### 5. Global vs Scoped

```ts
import { webmcp } from 'simple-webmcp';
// scoped (default) — inert until useWebMCP or .register()
webmcp(fn, { description: '…' });
// global — registers on import (client only)
webmcp(fn, { description: '…', global: true });
webmcp.global(fn, { description: '…' }); // alias
```

## Progression Ladder (teach stepwise)

1. **Beginner:** `webmcp(fn)` done.
2. **Better desc:** `webmcp(fn, { description: '…' })`
3. **Field docs:** `webmcp(fn, { fields: { query: { description: '…' } } })`
4. **Full control:** `webmcp(fn, { schema: z.object({…}) })`
5. **Lifecycle:** `useWebMCP(tool)` / `<Scope tools>`

## Rules

- Always provide `description` (or JSDoc); warning if missing.
- Prefer single object param `fn({query, limit})` for tools — best inference. Multi-arg legacy deferred to `webmcp.bind` (0.4).
- Use `readOnlyHint`/`destructiveHint` in `annotations` for agent hints; annotations are extensible `Record<string,unknown>`.
- Registration is async: `await tool.register()` → `() => void` unregister. React hook handles AbortSignal.
- `strict:true` makes ambiguous runtime inference a build error instead of warn.

## Inference

- **Runtime** (0.1): param names + defaults → low-confidence `{type:'object'}` placeholder.
- **Build** (0.2 `simple-webmcp/unplugin` for Vite/Webpack): TS types + JSDoc before erasure. Same API.
- Never pretend `function search(query)` alone is fully known — warn if no type/schema/fields.

## Next.js Server Actions — experimental (0.3, requires spike)

Do not assume transparent bridge works yet. The spike must verify `webmcp.server(action)` reference survives server/client boundary. Until then, keep server tools as described in docs but behind experimental flag.

## References

- `references/api.md` — full API surface
- `references/recipes.md` — vanilla, React, Vite, Next patterns
- `references/build.md` — unplugin inference
