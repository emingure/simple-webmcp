---
title: React — useWebMCP / Scope | WebMCP SDK
description: useWebMCP and Scope API — register WebMCP tools from React with AbortSignal lifecycle, StrictMode-safe.
---

# Reference — React `useWebMCP` / `Scope`

```ts
import { useWebMCP, Scope } from 'simple-webmcp/react'; // 'use client'
```

For guide usage, see [React guide](/guide/react). For hooks, see [Guide — Hooks](/guide/hooks).

## `useWebMCP` / `useTool`

```ts
// wrapped tool (existing)
function useWebMCP<F>(tool: WebMCPTool<F>, opts?:{enabled?:boolean}): {
  supported: boolean; registered: boolean; error: Error|null;
  isPolyfilled: boolean; status: 'unregistered'|'registering'|'registered'|'error'|'unsupported';
};
// raw function — auto-wraps, 1-line
function useWebMCP<F>(fn: F, opts?: WebMCPOptions<F> & {enabled?:boolean}): WebMCPTool<F> & {
  supported: boolean; registered: boolean; error: Error|null;
  isPolyfilled: boolean; status: 'unregistered'|'registering'|'registered'|'error'|'unsupported';
};
const useTool = useWebMCP; // alias

// 1-line usage:
const tool = useWebMCP(search, { description: 'Search' }); // callable + status
const tool2 = useTool(search, { description: 'Search' });
```

* When given `WebMCPTool`, returns status object (backward compat).
* When given raw `fn`, auto-calls `webmcp(fn, opts)` via `useMemo` (deps on `name`/`description`/`schema`/`fields`…) then registers; returns `WebMCPTool & status` so one variable is both callable (`tool({query})`) and state (`tool.registered`).
* Async `tool.register({signal: controller.signal})` + cleanup `controller.abort()`.
* Dedup via `registry` (StrictMode).
* `enabled:false` inert.

## `Scope`

```tsx
import { Scope } from 'simple-webmcp/react';

<Scope tools={[a,b]} enabled>{children}</Scope>
```

## `WebMCPProvider` — scoped hooks

```tsx
import { WebMCPProvider } from 'simple-webmcp/react'; // 'use client'

<WebMCPProvider hooks={{ before:[addTenant], after:[redact] }}>
  <Scope tools={[checkoutTool]}>{children}</Scope>
</WebMCPProvider>
```

- `hooks` same shape as `webmcp(fn,{hooks})` — before/after/error/denied arrays.
- Nesting merges additively (`[...parent.before, ...own.before]`).
- Merge order: `before: global→scoped→tool`, `after: tool→scoped→global`.
- Also exports `WebMCPHooksContext`, `useWebMCPHooksContext()`.

See [Reference — Hooks](/reference/hooks).

Renders N `useWebMCP` registrars; mounted = exposed. Place in `app/layout.tsx` for route-level scope. See [React guide](/guide/react) and [Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api).

## Testing

```ts
import { registry } from 'simple-webmcp';
registry.list(); // [{name, status}]
```

Mock `document.modelContext.registerTool` in tests (see `tests/react.test.tsx`).

## See also

- [Guide — React](/guide/react)
- [Guide — Hooks](/guide/hooks)
- [Guide — Browser Support](/guide/browser-support)
- [Reference — Hooks](/reference/hooks)
- [External: Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
