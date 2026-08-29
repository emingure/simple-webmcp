# Next.js Fixture — Server Action Spike (0.3 gate)

This fixture validates `webmcp.server(action)` reference survival through Next.js 16 App Router + Turbopack.

**Required before shipping `simple-webmcp/next` `server()`**

Structure to create:

```
fixtures/next-app/
  app/
    actions.ts        // 'use server' exports
    tools.ts          // webmcp.server(action)
    page.tsx          // Server Component
  components/
    ClientRegistrar.tsx // 'use client' + useWebMCP
  next.config.js
```

**Test checklist (run manually):**

1. `npm run build` succeeds with both client+server compiles
2. Browser receives `tool.tool.inputSchema` (TS/JSDoc inferred)
3. `document.modelContext` registers tool (via polyfill or native)
4. Agent invoke → Server Action executes → result returns (validate `getSession()` not bypassed)
5. Unmount layout → tool unregistered (AbortSignal)

Until this passes, `simple-webmcp/next` exports `server()` as throwing `NotImplemented` to avoid false promise.

See plan review §1 and §24.
