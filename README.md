# Make your existing functions agent-ready

`simple-webmcp` turns ordinary JavaScript and TypeScript functions into WebMCP tools without creating a second tool layer.

```ts
import { webmcp } from 'simple-webmcp';

async function searchCustomers({ query, limit = 20 }: { query: string; limit?: number }) {
  return customers.filter(c => c.name.includes(query)).slice(0, limit);
}

const search = webmcp(searchCustomers);
```

That's it. Your function stays callable:

```ts
await search({ query: 'alice' });
```

And can be exposed to WebMCP:

```ts
import { useWebMCP } from 'simple-webmcp/react';

function CustomersPage() {
  const tool = useWebMCP(search, { description: 'Search customers' });
  // visible while mounted — unregisters on unmount (AbortSignal)
  return <CustomersUI />;
}
```

**Framework-agnostic core. React adapter included.** Works with vanilla JS, TypeScript, Vite — Next.js support remains experimental until proven.

> **One function. Two interfaces.** Human code `search(input)` and agent `search(input)` — same capability.
>
> **Write the function once. Expose it to humans and agents.**

**Docs:** https://emingure.github.io/simple-webmcp/ · **Live Demo:** [Try the shopping cart demo →](https://emingure.github.io/simple-webmcp/demo/) *(see `examples/demo`)* · **npm:** `simple-webmcp`

---

## Why simple-webmcp?

Most WebMCP integrations force a second layer:

```text
Existing app logic
  ↓
Define tool metadata (name, description, inputSchema)
  ↓
Define execute wrapper
  ↓
Call registerTool()
  ↓
Manage lifecycle (AbortSignal, StrictMode, SSR)
```

`simple-webmcp` collapses it:

```text
Existing function
  ↓
webmcp(existingFunction)
  ↓
Done — keep your API, types, and business logic
```

Use **raw `document.modelContext.registerTool()`** when you want total control over `getTools()` / `executeTool()` / `toolchange` / `exposedTo` — the browser imperative API ([Chrome Docs](https://developer.chrome.com/docs/ai/webmcp/imperative-api)). Use **`simple-webmcp`** when you already have `addToCart`, `searchCustomers`, `updateCustomer` and want them agent-callable without duplicating schema and lifecycle.

**Focused on tool authoring and lifecycle** — not a full WebMCP SDK. The browser provides `getTools`, `executeTool`, `exposedTo` etc.; we provide the tiny application layer on top and stay stable while WebMCP evolves underneath.

## Before / After

**Without — raw WebMCP:**

```ts
document.modelContext.registerTool({
  name: 'add_to_cart',
  description: 'Add a product to the shopping cart',
  inputSchema: {
    type: 'object',
    properties: {
      productId: { type: 'string', description: 'Product ID' },
      quantity: { type: 'number', minimum: 1 }
    },
    required: ['productId', 'quantity']
  },
  execute: ({ productId, quantity }) => addToCart(productId, quantity)
}, { signal });
```

**With — function-first:**

```ts
import { webmcp } from 'simple-webmcp';

const addToCartTool = webmcp(addToCart, {
  description: 'Add a product to the shopping cart'
});

// same function, same app — one line
await addToCartTool({ productId: 'p_123', quantity: 2 }); // human
// agent calls same tool via WebMCP when <CartPage> is mounted
```

**Same function. Same application. One line.** No duplicated business logic.

For e-commerce, SaaS dashboards, booking, CRM, forms, internal tools — where `addToCart`, `searchCustomers`, `createInvoice` already exist and suddenly need to be agent-callable.

## Install

```bash
npm i simple-webmcp
# React is optional peer only if you use simple-webmcp/react
```

## Quick Start

### Vanilla — manual or global

```ts
import { webmcp } from 'simple-webmcp';

export const tool = webmcp(addToCart, {
  description: 'Add product to shopping cart',
  fields: { productId: { description: 'Product ID' }, quantity: { type: 'integer', minimum: 1 } }
});

await tool({ productId: 'p_1', quantity: 2 }); // human
await tool.register(); // expose — uses document.modelContext (Chrome canary)
tool.unregister();

// global (registers on import, client only) — prefer scoped for least privilege
webmcp.global(addToCart, { description: '...' });
```

### React — 1-line (recommended)

```tsx
'use client';
import { useWebMCP } from 'simple-webmcp/react'; // alias: useTool

export function ProductPage() {
  const tool = useWebMCP(addToCart, { description: 'Add product to cart' });
  // tool is callable + has tool.registered / tool.status
  return <Product />;
}
```

Verbose 2-line still works: `const t = webmcp(fn); useWebMCP(t)`. Layout-level: `<Scope tools={[search, update]}>{children}</Scope>` — naturally gives route-level scope in Next.js `app/layout.tsx`.

`register()` is `async` (`Promise<() => void>`) per current `webmcp-types`; hook maps to `AbortSignal` and dedupes StrictMode. `status` is `'unregistered'|'registering'|'registered'|'unsupported'|'error'` — `supported` and `registered` are mutually exclusive (unsupported never claims registered).

## Customize only what you need

```ts
const search = webmcp(searchCustomers, {
  description: 'Search customers by name or email',
  fields: {
    query: { description: 'Customer name, email, or ID' },
    limit: { type: 'integer', minimum: 1, maximum: 50 }
  }
});
```

**Enhance inferred schemas without rewriting them.** `fields` is a patch over the base schema (`Partial<JsonSchema>` or per-field `StandardSchema`). Whole `schema` establishes the contract; `fields` decorates it.

```ts
// Zod — requires side-effect (keeps core 6.26KB gz lean)
import { z } from 'zod';
import 'simple-webmcp/zod';
webmcp(fn, { schema: z.object({ query: z.string().min(1) }) });
webmcp(fn, { fields: { query: z.string().describe('Name') } });
```

## How inference works

**Infer what JavaScript can know at runtime. Get richer TypeScript/JSDoc inference with the optional build plugin.**

*Runtime* — best-effort, `confidence:'low'`: parameter names, defaults, destructured keys (`{query, limit=20}` → `query` required, `limit` optional `default:20`), some primitives from literal defaults. `function search(query: string)` alone becomes `{properties:{query:{}}}` — we warn and need `fields`/`schema` or `strict:true` throws.

*Build* — optional `simple-webmcp/unplugin` (Vite/Webpack) reads TypeScript types + JSDoc before erasure. Same `webmcp(fn)` call, richer `inputSchema`, no code change.

Progressive:

```
webmcp(fn)
  ↓ add description
  ↓ add field metadata (fields)
  ↓ provide a schema (Zod)
  ↓ opt into build-time TS/JSDoc inference
```

Start with one function.

## Comparison

|  | simple-webmcp | raw WebMCP (`document.modelContext`) | `usewebmcp` | `@mcp-b/react-webmcp` |
|---|---|---|---|---|
| Existing function stays callable | ✅ | ❌ | ❌ | ❌ |
| `webmcp(fn)` — function-first | ✅ | — | — | — |
| Metadata patching | ✅ | Manual `registerTool` | Manual | Manual |
| `fields` patch | ✅ | ❌ | ❌ | ❌ |
| React lifecycle (`AbortSignal`, StrictMode) | ✅ | Manual | ✅ | ✅ |
| Full MCP ecosystem / `getTools` etc | — (authoring) | ✅ Browser API | — | ✅ |
| Weekly downloads | new | n/a (browser) | — | ~6k |
| Focus | Function-first DX | Native API | React hooks | MCP ecosystem |

> **simple-webmcp + MCP-B are complementary.** `simple-webmcp` authors capabilities; MCP-B / native WebMCP is the runtime. For real cross-browser WebMCP (Firefox/Safari), use the dedicated `@mcp-b/webmcp-polyfill` (~6k weekly):
> ```bash
> npm i @mcp-b/webmcp-polyfill && import '@mcp-b/webmcp-polyfill'
> ```
> `simple-webmcp/polyfill` is a **dev/testing shim** (in-memory `registerTool`/`listTools`/`invokeTool`, not full transport) — prefer `simple-webmcp/dev-polyfill` or `simple-webmcp/testing` in tests/Storybook. Native `document.modelContext` (not `navigator.modelContext`) is detected first.

## Live Demo

**Shopping Cart:** MacBook £1,299 / Keyboard £99 / [Checkout] — agent says *“Add a keyboard to my cart”* → `add_to_cart` via WebMCP, UI updates. Chrome's docs point to demos + inspector extension for this flow.

**Admin Dashboard (e-commerce/CRM):** `search_customers`, `get_customer`, `update_customer`, `create_invoice` — ordinary functions `const tools = [webmcp(search), webmcp(get), webmcp(update)]` exposed from the active component only. See `examples/demo/` and https://emingure.github.io/simple-webmcp/demo/.

## API

See `.agents/skills/webmcp-simple/references/api.md`.

**Core:** `webmcp(fn, opts)` → `WebMCPTool` (callable + `tool`/`definition`/`register`/`status`), `webmcp.global`, `isWebMCPSupported()`, `registry.list()`. Errors: `NotSupportedError` (`unsupported` status, mutually exclusive with `registered`), `NotAllowedError`, `RegistrationError`, `ConfigurationError`.

**React:** `useWebMCP(fn, opts)` / `useWebMCP(tool)` → `WebMCPTool & status` / `status`, `useTool` alias, `<Scope tools>`.

**Zod:** `import 'simple-webmcp/zod'` then `schema`/`fields` accept Zod/StandardSchema.

WebMCP today is `document.modelContext` (Chrome canary, origin trial). This package tracks the spec — your app stays on the tiny `webmcp(fn)` API while we absorb browser changes.

## Development

```bash
npm run build      # tsup ESM+CJS+DTS (core 6.26KB gz, zod 1.40KB separate)
npm test           # vitest jsdom — 47 tests
npm run typecheck
npm run docs:dev   # VitePress
```

## Versioning

Follows [Semantic Versioning](https://semver.org/). See [`CHANGELOG.md`](./CHANGELOG.md) for the current `0.2.0` notes and [`RELEASING.md`](./RELEASING.md) for the release process. No future roadmap is promised here — track GitHub issues/discussions for what's next.

## Skills (Agent)

This package ships `.agents/skills/webmcp-simple/SKILL.md` for auto-discovery by OpenCode/Claude — the agent becomes distribution: *“Make this function WebMCP callable”* → `webmcp(fn)` instead of raw `registerTool`.

## License

MIT — Copyright © 2026 Muhammed Emin Gure (https://github.com/emingure)
