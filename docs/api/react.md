# React — `useWebMCP` / `Scope`

```ts
import { useWebMCP, Scope } from 'simple-webmcp/react'; // 'use client'
```

## `useWebMCP`

```ts
function useWebMCP<F>(tool: WebMCPTool<F>, opts?:{enabled?:boolean}): {
  supported: boolean; registered: boolean; error: Error|null;
  isPolyfilled: boolean; status: 'unregistered'|'registering'|'registered'|'error'|'unsupported';
};
```

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
