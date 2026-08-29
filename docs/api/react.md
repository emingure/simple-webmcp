# React — `useWebMCP` / `Scope`

```ts
import { useWebMCP, Scope } from 'simple-webmcp/react'; // 'use client'
```

## `useWebMCP` / `useTool`

```ts
// wrapped tool (existing)
function useWebMCP<F>(tool: WebMCPTool<F>, opts?:{enabled?:boolean}): {
  supported: boolean; registered: boolean; error: Error|null;
  isPolyfilled: boolean; status: 'unregistered'|'registering'|'registered'|'error'|'unsupported';
};
// raw function — auto-wraps, 1-line (new)
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

Renders N `useWebMCP` registrars; mounted = exposed. Place in `app/layout.tsx` for route-level scope.

## Testing

```ts
import { registry } from 'simple-webmcp';
registry.list(); // [{name, status}]
```
Mock `document.modelContext.registerTool` in tests (see `tests/react.test.tsx`).
