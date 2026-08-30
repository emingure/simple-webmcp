---
title: Inspect — listTools, invokeTool | WebMCP SDK
description: Inspect WebMCP tools — listTools, invokeTool, onToolsChanged, and the Inspector devtools component.
---

# Reference — Inspect `simple-webmcp/inspect` + `devtools`

```ts
import { listTools, listToolsAsync, getTool, invokeTool, onToolsChanged, isSupported } from 'simple-webmcp/inspect';
import { Inspector } from 'simple-webmcp/devtools'; // React
```

For guide usage, see [Inspect guide](/guide/inspect) and [Demo](/demo).

## `listTools(): InspectedTool[]`

Merges `registry.list()` and `document.modelContext.getTools()` / `listTools()`. Each entry:

```ts
type InspectedTool = ToolContract & { status: RegistrationStatus; registered: boolean; source: 'registry'|'modelContext'|'both' };
```

## `listToolsAsync(): Promise<InspectedTool[]>`

Awaits native `getTools()` if it returns a `Promise`.

## `getTool(name: string)`

Find by `name`.

## `invokeTool(name, args): Promise<unknown>`

Tries `modelContext.executeTool` / `invokeTool` / `callTool`, then `registry` stored `execute` (our wrapper), then shim `_tools`. Normalized via `wrapExecute` (string → `content`).

```ts
await invokeTool('add_to_cart', { productId: 'keyboard', quantity: 1 });
```

## `onToolsChanged(callback): () => void`

Subscribes to `toolchange` event if native, otherwise polls `registry` every 500ms.

## `isSupported(): boolean`

Wrapper around `isWebMCPSupported()`. See [Browser Support](/guide/browser-support).

## React `<Inspector>`

```tsx
import { Inspector } from 'simple-webmcp/devtools';
<Inspector defaultOpen filter={t => t.name.startsWith('search')} />
```

Lists tools, shows `inputSchema` collapsible, prefilled JSON from `inputSchema`, **Invoke** button, result/error. Use in dev only (`simple-webmcp/devtools` separate entry `16KB`).

See demo at [/demo/](/demo/) — same inspect panel embedded in shopping cart.

## See also

- [Guide — Inspect](/guide/inspect)
- [Guide — Hooks](/guide/hooks) — hook log in demo
- [Guide — Browser Support](/guide/browser-support)
- [External: Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
