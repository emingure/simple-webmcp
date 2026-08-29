# Vanilla JS

No framework — Vite / plain JS/TS.

```js
// vanilla.js
import { webmcp } from 'simple-webmcp';
import 'simple-webmcp/polyfill'; // dev: enables modelContext in non-Chrome

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
await searchTool.register();
console.log('registered', searchTool.status);
searchTool.unregister();
```

Source: `examples/vanilla.js`
