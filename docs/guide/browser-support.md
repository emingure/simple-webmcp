---
title: Browser Support & Polyfill — Chrome, Firefox, Safari | WebMCP SDK
description: WebMCP is native in Chrome (document.modelContext). Firefox & Safari need a polyfill. Production @mcp-b/webmcp-polyfill vs dev shim, feature detection, and Permissions Policy.
---

# Browser Support & Polyfill

WebMCP (`document.modelContext.registerTool`) is Chrome-only today — Canary / origin trial, `document.modelContext` (not `navigator.modelContext`). Other browsers report `status:'unsupported'` (mutually exclusive with `registered`).

| Browser | Status | What to use |
|---------|--------|-------------|
| Chrome / Edge (Canary, origin trial) | Native `document.modelContext` | Nothing — works out of the box |
| Firefox | No native WebMCP | Production: [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) |
| Safari | No native WebMCP | Production: [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) |
| Other / SSR | — | `isWebMCPSupported()` guards; dev shim for tests |

Spec: [Chrome WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) · [Model Context Protocol](https://modelcontextprotocol.io).

## For production cross-browser — use the real polyfill

```bash
npm i @mcp-b/webmcp-polyfill && import '@mcp-b/webmcp-polyfill'
```

[`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) has 50k+ weekly downloads and full transport (53k+ as of August 2026). `simple-webmcp` is complementary — it authors capabilities, the polyfill is the runtime.

## Dev / testing shim

```ts
import 'simple-webmcp/dev-polyfill'; // or 'simple-webmcp/testing' or legacy 'simple-webmcp/polyfill'
import { installPolyfill, isPolyfilled } from 'simple-webmcp/polyfill';
installPolyfill(); // in-memory registerTool/listTools/invokeTool only
```

* `simple-webmcp/polyfill` is a **dev/testing shim**, not an interoperability polyfill. Prefer `dev-polyfill` / `testing` aliases for clarity.
* `isWebMCPSupported()` / `getModelContext()` shield spec churn; core detects existing `modelContext` and no-ops.
* Separate entry `1.74KB` raw so non-Chrome dev pays nothing in prod Chrome.

## Feature detection

```ts
import { isWebMCPSupported } from 'simple-webmcp';
if (!isWebMCPSupported()) {
  // hide Inspector, show "Chrome Canary required" message
}
```

`WebMCPTool.status` is `'unsupported'` when not supported — never `'registered'` at the same time.

## Permissions Policy

Some deployments restrict WebMCP via the `tools` [Permissions Policy](https://developer.chrome.com/docs/ai/webmcp/imperative-api#permissions_policy) — e.g. `Permissions-Policy: tools=(self)` or `<iframe allow="tools">`. Without delegation, `registerTool` in a cross-origin iframe throws `NotAllowedError` (`code: 'NOT_ALLOWED'`). See [Reference — Errors & Registry](/reference/errors).

## See also

- [Getting Started](/getting-started) — install & quick start
- [Guide — Inspect](/guide/inspect) — `isSupported` + devtools
- [Demo](/demo) — works with native Chrome or dev shim / production polyfill
- [Reference — Errors](/reference/errors) — `NotSupportedError`, `NotAllowedError`
- [External: Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [External: @mcp-b/webmcp-polyfill](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill)
