---
title: Vanilla JS — WebMCP Example | simple-webmcp
description: Vanilla JS WebMCP example — wrap a function with webmcp(fn) and register without React. Vite-ready, Framework-agnostic.
---

# Vanilla JS

No framework — Vite / plain JS/TS. See [Getting Started](/getting-started) and [Schema](/guide/schema).

```js
// vanilla.js
import { webmcp } from 'simple-webmcp';
import 'simple-webmcp/dev-polyfill'; // dev only — enables modelContext in non-Chrome for local testing

async function searchCustomers({ query, limit = 20 }) {
  const all = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ];
  return all.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
}

// stays callable
console.log(await searchCustomers({ query: 'al' }));

// wrap — still callable, also a tool
export const searchTool = webmcp(searchCustomers, {
  description: 'Search customers in current account',
  fields: {
    query: { description: 'Name, email, or ID' },
    limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Max results' },
  },
});

console.log(await searchTool({ query: 'bob' }));
await searchTool.register(); // uses document.modelContext — see https://developer.chrome.com/docs/ai/webmcp/imperative-api
console.log('registered', searchTool.status);
searchTool.unregister();
```

For production cross-browser, use [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) — see [Browser Support](/guide/browser-support). For hook-based observability, see [Analytics Step-by-Step](/guide/analytics/step-by-step).

Source: `examples/vanilla.js` — see also [React example](./react) and [Schema guide](/guide/schema).
