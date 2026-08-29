# Recipes

## Vanilla JS (Vite, plain TS)

```ts
import { webmcp } from 'simple-webmcp';
import 'simple-webmcp/polyfill'; // dev only

export async function addToCart({ productId, quantity }: { productId: string; quantity: number }) {
  cart.push({ productId, quantity });
  return { ok: true };
}

export const addToCartTool = webmcp(addToCart, {
  description: 'Add product to shopping cart',
  fields: {
    productId: { description: 'Product ID' },
    quantity: { type: 'integer', minimum: 1 },
  },
  annotations: { readOnlyHint: false },
});

// outside React — register programmatically
await addToCartTool.register();
// still call directly
await addToCartTool({ productId: 'p_123', quantity: 2 });
```

## TypeScript + Zod (per-field)

```ts
import { z } from 'zod';
import { webmcp } from 'simple-webmcp';

async function searchCustomers({ query, limit }: { query: string; limit?: number }) {
  // ...
}

export const searchTool = webmcp(searchCustomers, {
  description: 'Search customers',
  fields: {
    query: z.string().min(1).describe('Name, email, or ID'),
    limit: z.number().int().min(1).max(50).optional().describe('Max results'),
  },
});
```

## Zod whole schema

```ts
webmcp(fn, { description: '…', schema: z.object({ query: z.string(), limit: z.number().optional() }) });
```

## React — page level

```tsx
'use client';
import { webmcp } from 'simple-webmcp';
import { useWebMCP } from 'simple-webmcp/react';

const searchTool = webmcp(searchCustomers, { description: 'Search' });

export function SearchPage() {
  useWebMCP(searchTool);
  return <SearchUI />;
}
```

## React — layout/route scope

```tsx
'use client';
import { Scope } from 'simple-webmcp/react';
import { searchTool, updateTool } from '@/lib/tools';

export function CustomersLayout({ children }: { children: React.ReactNode }) {
  // Tools exposed while layout mounted → natural route scope in Next.js layouts
  return <Scope tools={[searchTool, updateTool]}>{children}</Scope>;
}
```

## Global (entire app)

```ts
import { webmcp } from 'simple-webmcp';
webmcp.global(searchCustomers, { description: 'Global search' });
// or
webmcp(searchCustomers, { description: 'Search', global: true });
```

## Strict mode (warn vs error)

```ts
// default: dev warn if no type/schema/fields
webmcp(fnWithoutTypes, { description: '…' }); // warn

// strict: throw
webmcp(fnWithoutTypes, { description: '…', strict: true }); // throws ConfigurationError
```

## Inference tips

- Best: `async function fn({query, limit}:{query:string, limit?:number})` — runtime sees `query` required, `limit` optional default
- Better with build (0.2 `simple-webmcp/unplugin`): TS type + JSDoc `@param query ...` → full schema, no manual `fields`
- Fallback for plain JS: add `fields` or `schema` explicitly

## Global registry for tests

```ts
import { registry } from 'simple-webmcp';
registry.list(); // [{name, status}]
registry.clear();
```
