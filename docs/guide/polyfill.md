# Polyfill

WebMCP (`document.modelContext.registerTool`) is Chrome-only (canary, origin trial, `document.modelContext` not `navigator.modelContext`). Others get `status:'unsupported'` (mutually exclusive with `registered`).

## For production cross-browser — use the real polyfill

```bash
npm i @mcp-b/webmcp-polyfill && import '@mcp-b/webmcp-polyfill'
```

`@mcp-b/webmcp-polyfill` has ~6k weekly downloads and full transport. `simple-webmcp` is complementary — it authors capabilities, the polyfill is the runtime.

## Dev / testing shim

```ts
import 'simple-webmcp/dev-polyfill'; // or 'simple-webmcp/testing' or legacy 'simple-webmcp/polyfill'
import { installPolyfill, isPolyfilled } from 'simple-webmcp/polyfill';
installPolyfill(); // in-memory registerTool/listTools/invokeTool only
```

* `simple-webmcp/polyfill` is now documented as **dev/testing shim**, not an interoperability polyfill. Prefer `dev-polyfill`/`testing` aliases for clarity.
* Keeps `isWebMCPSupported()` / `getModelContext()` shielding spec churn; core detects existing `modelContext` and no-ops.
* Separate entry `1.74KB` raw so non-Chrome dev pays nothing in prod Chrome.
