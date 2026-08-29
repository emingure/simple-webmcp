# React

```tsx
// with-react.tsx
'use client';
import React from 'react';
import { webmcp } from 'simple-webmcp';
import { useWebMCP, Scope } from 'simple-webmcp/react';

async function searchCustomers({ query, limit = 20 }: { query: string; limit?: number }) {
  return [{ id: '1', name: 'Alice' }].filter((c) => c.name.includes(query)).slice(0, limit);
}
async function addToCart({ productId, quantity }: { productId: string; quantity: number }) {
  return { ok: true, productId, quantity };
}

import { z } from 'zod'; // optional peer
export const searchTool = webmcp(searchCustomers, {
  description: 'Search customers',
  fields: {
    query: z.string().describe('Name or email'),
    limit: { type: 'integer', minimum: 1, maximum: 50 },
  },
});
export const addToCartTool = webmcp(addToCart, {
  description: 'Add product to cart',
  fields: {
    productId: { description: 'Product ID' },
    quantity: { type: 'integer', minimum: 1 },
  },
});

export function SearchPage() {
  useWebMCP(searchTool);
  return <div>Search is now available to the agent while this page is mounted.</div>;
}

export function ShopLayout({ children }: { children: React.ReactNode }) {
  return <Scope tools={[searchTool, addToCartTool]}>{children}</Scope>;
}
```

Source: `examples/with-react.tsx`

* `useWebMCP(tool)` → mounted = exposed (`AbortSignal`)
* `<Scope tools>` → layout / route-level scope
