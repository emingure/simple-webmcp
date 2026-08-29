# Live Demo

> **Try it:** The demo is a tiny shopping cart where `addToCart` is an existing function made agent-readable with one line. The **Inspect** panel below is `simple-webmcp/inspect` — same tools agents see.

<iframe src="/simple-webmcp/demo/index.html" style="width:100%;height:920px;border:1px solid var(--vp-c-divider);border-radius:12px" loading="lazy" title="Shopping cart demo + inspect"></iframe>

<div style="text-align:center;margin:8px 0;font-size:12px;color:var(--vp-c-text-2)"><a href="/simple-webmcp/demo/index.html" target="_blank">Open demo in new tab →</a> · Works with native Chrome WebMCP or <code>dev-polyfill</code> shim.</div>

## Shopping Cart

<div style="border:1px solid var(--vp-c-divider); border-radius:12px; padding:24px; margin:24px 0; background:var(--vp-c-bg-soft)">

**Products**

- **MacBook** — £1,299 <button>Checkout</button>
- **Keyboard** — £99 <button>Add to cart</button>

**Cart** — `add_to_cart` tool via WebMCP

```
Agent: “Add a keyboard to my cart.”
→ add_to_cart({ productId: 'keyboard', quantity: 1 })
→ { ok: true } — UI updates
```

*Chrome canary with WebMCP origin trial + inspector extension. In other browsers, uses `simple-webmcp/dev-polyfill` for local testing (in-memory, not real cross-browser). For production cross-browser, the demo also works with `@mcp-b/webmcp-polyfill`.*

</div>

## How it's built — one function

```ts
// app/cart.ts — your existing app logic, no rewrite
async function addToCart({ productId, quantity }: { productId: string; quantity: number }) {
  cart.push({ productId, quantity });
  return { ok: true, cart };
}

// expose — same function, one line
import { webmcp } from 'simple-webmcp';
const addToCartTool = webmcp(addToCart, { description: 'Add product to shopping cart' });

// React page — visible while mounted
import { useWebMCP } from 'simple-webmcp/react';
function CartPage() {
  const tool = useWebMCP(addToCartTool); // or useWebMCP(addToCart, {description})
  return <CartUI />;
}
```

Without `simple-webmcp`:

```ts
document.modelContext.registerTool({
  name: 'add_to_cart',
  description: 'Add a product...',
  inputSchema: { type:'object', properties:{ productId:{type:'string'}, quantity:{type:'number'}}, required:['productId','quantity']},
  execute: ({productId, quantity}) => addToCart({productId, quantity})
}, {signal});
```

**Same function. Same app. One line vs manual `inputSchema` + `execute` wrapper + lifecycle.**

## Admin dashboard (e-commerce/CRM)

Ordinary functions:

```ts
const searchCustomers = async (input) => db.search(input);
const getCustomer = async (input) => db.get(input);
const updateCustomer = async (input) => db.update(input);

const tools = [webmcp(searchCustomers), webmcp(getCustomer), webmcp(updateCustomer)];
```

From the active component only:

```tsx
function CustomersView() {
  const t = useWebMCP(searchCustomers, { description: 'Search customers' });
  return <Table />;
}
```

Component lifecycle = agent capability. Route hierarchy (`app/customers/layout.tsx` → `<Scope>`) naturally scopes tools.

## Run locally

```bash
# in repo
npm run build
# demo is static — open examples/demo/index.html or run docs
npm run docs:dev # http://localhost:5173/simple-webmcp/demo/
```

## Video

*15-second screen capture: agent says “Add a keyboard” → `add_to_cart` executes → cart updates.* Placeholder — record in Chrome canary with WebMCP inspector.

---

**[Get Started →](/getting-started)** · **[Why simple-webmcp? →](/#why-simple-webmcp)** · **[GitHub](https://github.com/emingure/simple-webmcp)**
