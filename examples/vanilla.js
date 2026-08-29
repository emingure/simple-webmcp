// Vanilla JS example — no framework, works with Vite/Webpack plain JS/TS
import { webmcp } from 'simple-webmcp';
import 'simple-webmcp/polyfill'; // dev: enables modelContext in non-Chrome

async function searchCustomers({ query, limit = 20 }) {
  // simulate DB
  const all = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ];
  return all.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
}

// Function stays callable
console.log(await searchCustomers({ query: 'al' })); // [{id:'1', name:'Alice'}]

// Wrap — still callable, but also a tool
export const searchTool = webmcp(searchCustomers, {
  description: 'Search customers in current account',
  fields: {
    query: { description: 'Name, email, or ID' },
    limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Max results' },
  },
});

// Still call original signature
console.log(await searchTool({ query: 'bob' }));

// Register globally (or use useWebMCP in React)
await searchTool.register();
console.log('registered', searchTool.status, searchTool.isRegistered());

// Unregister when done
searchTool.unregister();
