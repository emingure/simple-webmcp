---
title: Live Demo — Shopping Cart & Hooks HITL | WebMCP SDK
description: Try the WebMCP shopping cart demo — add_to_cart via agent, Hooks HITL approval, Inspect panel. Live in Chrome or with dev polyfill.
---

# Live Demo

> **Try it:** The demo is a tiny shopping cart where `addToCart` is an existing function made agent-readable with one line. The **Inspect** panel below is `simple-webmcp/inspect` — same tools agents see. The new **Hooks & HITL** card logs every `before/after/error/denied` to screen and `console` (`[webmcp:hook]`).

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

## Hooks & HITL — see it in the demo

The demo now wires **global hooks** (every tool) and a **tool-level HITL hook** for `checkout`:

```ts
// global — logs every invocation (see Hooks & HITL card + console)
webmcp.configure({
  hooks: {
    before: [({tool, input, metadata})=>{ metadata.start=performance.now(); console.log('[hook:before]', tool.tool.name, input); }],
    after:  [({tool, output, metadata})=> console.log('[hook:after]', tool.tool.name, output, `${Math.round(performance.now()-metadata.start)}ms`)],
    error:  [({tool, error})=> console.warn('[hook:error]', tool.tool.name, error)],
    denied: [({tool, reason})=> console.warn('[hook:denied]', tool.tool.name, reason)],
  }
});

// tool-level — checkout asks for human approval via modal
const checkoutTool = webmcp(checkout, {
  description: 'Checkout cart',
  hooks: {
    before: [async ({tool, input})=>{
      const approved = await showApprovalModal({tool, input});
      if (!approved) return { action:'deny', message:'User declined checkout', code:'USER_DENIED' };
    }],
    after: [({output})=>({ output: redact(order=>order.email) })],
  }
});
```

- Toggle **Require approval for checkout** → **Inspect → Invoke checkout** → modal appears → **Deny** returns `Denied: User declined…` (`isError:true`) and `denied` hooks fire (hook log turns yellow).
- **Test deny / Test error** buttons also trigger the log without an agent.

See [Guide — Hooks](/guide/hooks) for the full lifecycle (`before` → `validate` → `fn` → `after` → `error/denied`).

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
npm run docs:dev # then open /demo/
```

---

**[Get Started →](/getting-started)** · **[Guide — Hooks](/guide/hooks)** · **[Inspect](/guide/inspect)** · **[GitHub](https://github.com/emingure/simple-webmcp)**
