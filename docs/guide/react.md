# React

```tsx
'use client';
import { webmcp } from 'simple-webmcp';
import { useWebMCP, Scope } from 'simple-webmcp/react';
```

## `useWebMCP` — now optional wrapper

`useWebMCP` accepts **either** a wrapped `WebMCPTool` **or a raw function** — raw is auto-wrapped and visible for the component's lifetime. This is the 1-line ergonomic requested:

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
* Unregisters on unmount via `AbortSignal` — mirrors spec.
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

Nesting merges: outer→inner. Global `webmcp.configure` still outermost.

## Patterns

* Page-level tool: `useWebMCP` in page component.
* Shared tools: `Scope` in layout.
* Scoped hooks/tenant: `WebMCPProvider` in layout (see above).
* Global: `webmcp.global(fn, opts)` (or `webmcp(fn,{global:true})`) — no hook needed, but prefer Scoped for least privilege.
