---
layout: home

hero:
  name: simple-webmcp
  text: Turn any function into a WebMCP tool
  tagline: One line. Still callable. Typed, lean, framework-agnostic.
  image:
    src: /logo.svg
    alt: simple-webmcp
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/emingure/simple-webmcp

features:
  - icon: ⚡
    title: Function-first
    details: Wrap existing functions — no rewrite. <code>webmcp(fn)</code> stays callable, also exposes <code>tool.register()</code>.
  - icon: 🧩
    title: Fields as patch
    details: Add descriptions/min/max via <code>fields</code> without rewriting whole JSON Schema. Whole <code>schema</code> wins.
  - icon: 🔌
    title: React lifecycle
    details: <code>useWebMCP(tool)</code> + <code>&lt;Scope&gt;</code> map to <code>AbortSignal</code> — mounted = exposed.
  - icon: 🪶
    title: Lean core
    details: Core ESM 6.26KB gz, no React dep, Zod opt-in via <code>simple-webmcp/zod</code>.
  - icon: 🔒
    title: Typed errors
    details: <code>NotSupportedError / NotAllowedError / RegistrationError</code> with <code>code</code> + <code>cause</code>.
  - icon: 🤖
    title: Agent skill
    details: Ships <code>.agents/skills/webmcp-simple</code> for OpenCode / Claude auto-discovery.
---

## One-line demo

```ts
import { webmcp } from 'simple-webmcp';

async function searchCustomers({ query, limit = 20 }: { query: string; limit?: number }) {
  return customers.filter(c => c.name.includes(query)).slice(0, limit);
}

export const searchTool = webmcp(searchCustomers, {
  description: 'Search customers in current account',
  fields: { query: { description: 'Name, email, or ID' } },
});

// stays callable
await searchTool({ query: 'alice' });
// or agent-callable
await searchTool.register();
// React: useWebMCP(searchTool) while mounted
```

Works with plain JS, TS, React, Vite. Polyfill for non-Chrome via `import 'simple-webmcp/polyfill'`. Zod via `import 'simple-webmcp/zod'`.

<div class="tip custom-block" style="padding-top: 8px">

**v0.1 is validated** — `webmcp()`, `useWebMCP()`, `Scope`, `polyfill`, 42 tests. `unplugin` (0.2) and `webmcp.server()` for Next.js (0.3) are deferred behind spike.

</div>
