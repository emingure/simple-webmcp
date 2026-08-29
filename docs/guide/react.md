# React

```tsx
'use client';
import { webmcp } from 'simple-webmcp';
import { useWebMCP, Scope } from 'simple-webmcp/react';
```

## `useWebMCP`

```tsx
export function Page() {
  const tool = webmcp(search, { description: 'Search' });
  const { supported, registered, error, status } = useWebMCP(tool);
  // supported: has document.modelContext?
  // registered: now in registry?
  // status: 'unregistered'|'registering'|'registered'|'error'|'unsupported'
  return null;
}
```

* Registers via `registry.register(contract, {signal})` (async `Promise<void>` per WebMCP spec).
* Unregisters on unmount via `AbortSignal` — mirrors spec.
* Deduped for StrictMode double-mount.
* `enabled:false` → inert.
* Plain `fn` (not `webmcp(fn)`) warns and sets `error`.

## `Scope`

```tsx
export function Layout({ children }: { children: React.ReactNode }) {
  return <Scope tools={[searchTool, updateTool]}>{children}</Scope>;
}
```

Mounted = exposed. In Next.js `app/layout.tsx` this naturally gives **route-level** scope. `Scope` is in `simple-webmcp/react`, not `next` — React subtree, not route API.

## Patterns

* Page-level tool: `useWebMCP` in page component.
* Shared tools: `Scope` in layout.
* Global: `webmcp.global(fn, opts)` (or `webmcp(fn,{global:true})`) — no hook needed, but prefer Scoped for least privilege.
