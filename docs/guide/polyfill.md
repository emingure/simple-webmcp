# Polyfill

WebMCP (`document.modelContext.registerTool`) is Chrome-only (origin trial). Others get `NotSupportedError` / no-op.

## Adapter

```ts
import 'simple-webmcp/polyfill'; // auto — installs thin in-memory shim if native missing
import { installPolyfill, isPolyfilled } from 'simple-webmcp/polyfill';
installPolyfill(); // programmatic, idempotent
isPolyfilled(); // true if shim active
```

* Keeps `isWebMCPSupported()` / `getModelContext()` shielding spec churn.
* For full MCP transport (cross-origin, tools policy), install `@mcp-b/global` before core — core detects existing `modelContext` and no-ops.

`simple-webmcp/polyfill` is separate entry `1.74KB` raw so non-Chrome dev pays nothing in prod Chrome.
