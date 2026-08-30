---
title: React — useWebMCP, Scope & WebMCPProvider | WebMCP SDK
description: Expose WebMCP tools from React with useWebMCP, Scope, and WebMCPProvider. Lifecycle via AbortSignal, StrictMode-safe, route-level via Next.js layout.
---

# React

```tsx
'use client';
import { webmcp } from 'simple-webmcp';
import { useWebMCP, Scope } from 'simple-webmcp/react';
```

For vanilla usage, see [Getting Started](/getting-started). For API types, see [Reference — React](/reference/react). For browser support, see [Browser Support](/guide/browser-support).

## `useWebMCP` — optional wrapper

`useWebMCP` accepts **either** a wrapped `WebMCPTool` **or a raw function** — raw is auto-wrapped and visible for the component's lifetime:

```tsx
// 1-line: wrap + register while mounted, still callable
export function Page() {
  const searchTool = useWebMCP(search, { description: 'Search customers' });
  // searchTool({query:'alice'}) still works
  // searchTool.registered, searchTool.status also available
  return null;
}

// equivalent verbose (still supported):
const tool = webmcp(search, { description: 'Search' });
const { supported, registered, error, status } = useWebMCP(tool);

// alias — same as useWebMCP(fn, opts)
import { useTool } from 'simple-webmcp/react';
const tool2 = useTool(search, { description: 'Search' });
```

* Registers via `registry.register(contract, {signal})` (async `Promise<void>` per WebMCP spec).
* Unregisters on unmount via `AbortSignal` — mirrors the [Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api).
* Deduped for StrictMode double-mount.
* `enabled:false` → inert.
* For `useWebMCP(tool)` (already wrapped) returns `{supported,registered,error,status}` for backward compat; for `useWebMCP(fn, opts)` returns `WebMCPTool & status` so you get callable + state in one.

## `Scope`

```tsx
export function Layout({ children }: { children: React.ReactNode }) {
  return <Scope tools={[searchTool, updateTool]}>{children}</Scope>;
}
```

Mounted = exposed. In Next.js `app/layout.tsx` this naturally gives **route-level** scope. `Scope` is in `simple-webmcp/react`, not `next` — React subtree, not route API.

## `WebMCPProvider` — scoped hooks (tenant, analytics)

```tsx
import { WebMCPProvider } from 'simple-webmcp/react';

export function DashboardLayout({children, tenantId}:{tenantId:string, children:React.ReactNode}){
  return (
    <WebMCPProvider hooks={{
      before: [({input})=>({ input:{...(input as any), tenantId}})],
      after:  [({output})=> console.log('[hook:after]', output)],
      error:  [({error})=> console.warn(error)],
    }}>
      <Scope tools={[searchTool]}>{children}</Scope>
    </WebMCPProvider>
  );
}
```

Nesting merges: outer→inner. Global `webmcp.configure` still outermost. See [Guide — Hooks](/guide/hooks) and [Analytics Step-by-Step](/guide/analytics/step-by-step) for the lifecycle.

## Patterns

* Page-level tool: `useWebMCP` in page component.
* Shared tools: `Scope` in layout.
* Scoped hooks/tenant: `WebMCPProvider` in layout (see above).
* Global: `webmcp.global(fn, opts)` (or `webmcp(fn,{global:true})`) — no hook needed, but prefer Scoped for least privilege.

## See also

- [Getting Started](/getting-started) — 30-second start
- [Guide — Hooks](/guide/hooks) — hook ordering and HITL
- [Guide — Schema](/guide/schema) — fields and Zod
- [Analytics — Overview](/guide/analytics/) — track invocations
- [Reference — React](/reference/react) — types for `useWebMCP` / `Scope`
- [Browser Support](/guide/browser-support) — Chrome, Firefox, Safari
- [Demo](/demo) — shopping cart with live `Scope`
- [External: Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) · [External: Next.js App Router](https://nextjs.org/docs/app)
