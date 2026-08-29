# Inspect

`simple-webmcp` now ships inspect tools so you can see the same tools agents see — without an LLM.

## Programmatic — `simple-webmcp/inspect`

```ts
import { listTools, invokeTool, onToolsChanged, isSupported } from 'simple-webmcp/inspect';

// list registry + native getTools()
listTools(); // -> {name, description, inputSchema, status, source}[]

// async variant that awaits modelContext.getTools()
import { listToolsAsync } from 'simple-webmcp/inspect';
await listToolsAsync();

// invoke same path an agent would
await invokeTool('add_to_cart', { productId: 'keyboard', quantity: 1 });

// subscribe to toolchange (Chrome) or poll fallback
const off = onToolsChanged((tools) => console.log(tools));
off();
```

* `listTools()` merges `registry.list()` (our wrapper) and `document.modelContext.getTools()` / `listTools()` if native.
* `invokeTool(name, args)` tries `modelContext.executeTool` / `invokeTool` / `callTool`, then `registry` fallback and shim `_tools`.
* Works with `simple-webmcp/dev-polyfill` shim in dev (in-memory).

## React — `simple-webmcp/devtools`

```tsx
import { Inspector } from 'simple-webmcp/devtools';

export function DevPanel() {
  return <Inspector defaultOpen />;
}
```

`Inspector` is `'use client'`, shows:

* WebMCP `supported` vs `unsupported` (dev shim)
* Each tool: `name`, `description`, `status` (`registered`/`unsupported`), `source`, `inputSchema` (collapsible), `annotations`
* Per-tool **Invoke** with JSON textarea, example prefilled from `inputSchema`, result / error display
* Polls via `onToolsChanged`

Import from `simple-webmcp/devtools` — separate entry `16KB` raw, not in core. Use only in dev.

## Demo — shopping cart

The interactive demo at [`/demo/`](/demo/) and [`/demo/index.html`](/demo/index.html) (static `examples/demo` + `docs/public/demo`) wires:

```ts
const addToCartTool = webmcp(addToCart, { description: 'Add product', fields: {...} });
await addToCartTool.register();
```

The **Inspect** panel below lists `add_to_cart` via `simple-webmcp/inspect` and lets you invoke with `{"productId":"keyboard","quantity":1}` — same as the agent.

Try `npm run docs:dev` → open `/demo/` (http://localhost:5173/simple-webmcp/demo/) and open the Inspect card.
