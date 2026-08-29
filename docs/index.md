---
layout: home

hero:
  name: simple-webmcp
  text: Make your existing functions agent-ready
  tagline: Wrap a JS/TS function with webmcp(fn). Keep your API — add a WebMCP capability on top. One function. Two interfaces.
  image:
    src: /logo.svg
    alt: simple-webmcp
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Try Live Demo
      link: /demo/
    - theme: alt
      text: View on GitHub
      link: https://github.com/emingure/simple-webmcp

features:
  - icon: 🎯
    title: Function-first
    details: Existing function stays callable. <code>await search({query})</code> and agent <code>search({query})</code> — same capability.
  - icon: 🧩
    title: Enhance, don't rewrite
    details: <code>fields</code> patches inferred schema — add descriptions/min/max without rewriting JSON Schema.
  - icon: 🔌
    title: Framework-agnostic core
    details: Core has no React dep. React adapter included — <code>useWebMCP(fn)</code> maps to <code>AbortSignal</code>.
  - icon: 🪶
    title: Lean & stable
    details: Core 6.26KB gz. Stay on <code>webmcp(fn)</code> while WebMCP evolves underneath.
  - icon: 🔒
    title: Honest inference
    details: Runtime knows param names + defaults (low-confidence). Richer TS/JSDoc via optional build plugin.
  - icon: 🤖
    title: Agent skill
    details: Ships <code>.agents/skills/webmcp-simple</code> — agent becomes distribution.
---

## One function. Two interfaces.

```ts
import { webmcp } from 'simple-webmcp';

async function searchCustomers({ query, limit = 20 }: { query: string; limit?: number }) {
  return customers.filter(c => c.name.includes(query)).slice(0, limit);
}

const search = webmcp(searchCustomers);
```

Human:

```ts
await search({ query: 'alice' });
```

Agent (when mounted):

```ts
import { useWebMCP } from 'simple-webmcp/react';
function Page() {
  const tool = useWebMCP(search, { description: 'Search customers' });
  return <UI />;
}
```

Customize only what you need:

```ts
const search2 = webmcp(searchCustomers, {
  description: 'Search customers by name or email',
  fields: { query: { description: 'Name, email, or ID' } }
});
```

Progressive adoption: `webmcp(fn)` → add `description` → `fields` → `schema` (Zod) → build-time inference. For real cross-browser WebMCP use `@mcp-b/webmcp-polyfill`; `simple-webmcp/dev-polyfill` is for tests.

<div class="tip custom-block" style="padding-top: 8px">

**v0.1 is validated** — `webmcp()`, `useWebMCP()`, `Scope`, `polyfill`, 42 tests. `unplugin` (0.2) and `webmcp.server()` for Next.js (0.3) are deferred behind spike.

</div>
