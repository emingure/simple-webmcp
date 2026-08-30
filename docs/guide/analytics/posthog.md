---
title: PostHog — WebMCP Analytics | simple-webmcp
description: Step-by-step — send WebMCP tool invocations, successes, denials & errors to PostHog via hooks. Copy-paste before/after/error hooks with duration and tenant support.
head:
  - - meta
    - name: keywords
      content: WebMCP PostHog, Model Context Protocol analytics, agent tool tracking PostHog
---

# PostHog — WebMCP Analytics

> Track every `before → after/error/denied` with `webmcp.configure`. One snippet covers all tools. See [Analytics Overview](/guide/analytics/) and [Step-by-Step](/guide/analytics/step-by-step).

For hook lifecycle, see [Guide — Hooks](/guide/hooks). For types, see [Reference — Hooks](/reference/hooks).

## When to use

PostHog for product analytics — capture `webmcp.invoked` / `succeeded` / `failed` / `denied` + `duration` + `tenantId` for all tools.

External: [PostHog JS docs](https://posthog.com/docs/libraries/js) · [posthog-js on npm](https://www.npmjs.com/package/posthog-js)

## Step-by-step

### Step 1 — Install & init PostHog

```bash
npm i posthog-js
```

In your app entry (e.g. `main.tsx` or `app/layout.tsx`):

```ts
import posthog from 'posthog-js';
posthog.init('phc_...', { api_host: 'https://us.i.posthog.com', capture_pageview: true });
```

See [PostHog — Install JS](https://posthog.com/docs/libraries/js#installation).

### Step 2 — Configure hooks once (global)

```ts
import { webmcp } from 'simple-webmcp';
import posthog from 'posthog-js';

webmcp.configure({
  hooks: {
    before: [({tool, input, invocationId, metadata})=>{
      metadata.start = Date.now();
      posthog.capture('webmcp.invoked', { tool: tool.tool.name, invocationId, input });
    }],
    after: [({tool, invocationId, metadata})=>{
      posthog.capture('webmcp.succeeded', {
        tool: tool.tool.name,
        invocationId,
        duration_ms: Date.now()-(metadata.start as number)
      });
    }],
    error: [({tool, error, invocationId})=>{
      posthog.capture('webmcp.failed', { tool: tool.tool.name, invocationId, error: String(error) });
    }],
    denied: [({tool, reason, code, invocationId})=>{
      posthog.capture('webmcp.denied', { tool: tool.tool.name, invocationId, reason, code });
    }],
  }
});
```

Hooks wrap only the agent path — `tool({input})` stays pure. `invocationId` is `crypto.randomUUID()` per invocation; `metadata` is the shared bag per call.

### Step 3 — Verify in the demo

1. `npm run docs:dev` → open [/demo](/demo).
2. **Inspect → Invoke** `add_to_cart` with `{"productId":"keyboard","quantity":1}` → check **Hooks & HITL** card and `console [webmcp:hook]`.
3. Toggle **Require approval for checkout** → **Invoke checkout** → **Deny** → verify `webmcp.denied` with `code:USER_DENIED` in PostHog Activity.
4. Toggle approval off → Invoke checkout → verify `webmcp.succeeded` with `duration_ms`.

### Step 4 — Production notes

- **PII:** Redact `input` before `capture` — e.g. strip `email`/`token` in `before` or `after`. See [Hooks — After](/guide/hooks#after--transform-output).
- **Sampling:** `if (Math.random() > 0.1) return` inside hooks for cost control.
- **Tenant:** Use scoped provider to add `tenantId`:

  ```tsx
  import { WebMCPProvider } from 'simple-webmcp/react';
  <WebMCPProvider hooks={{ before:[({input})=>({input:{...(input as any), tenantId}})] }}>
    <Scope tools={[tool]}>{children}</Scope>
  </WebMCPProvider>
  ```

  See [React — WebMCPProvider](/guide/react#webmcpprovider--scoped-hooks-tenant-analytics) and [Analytics Overview](/guide/analytics/).

## Cross links

- **Step-by-Step:** [Generic 4-step](/guide/analytics/step-by-step)
- **Overview:** [Analytics](/guide/analytics/)
- **Guides:** [Hooks lifecycle](/guide/hooks#lifecycle--ordering) · [React](/guide/react) · [Schema](/guide/schema) · [Browser Support](/guide/browser-support)
- **Reference:** [Hooks](/reference/hooks) — `BeforeContext` etc.
- **Demo:** [/demo](/demo) — live hook log
- **External:** [PostHog JS Docs](https://posthog.com/docs/libraries/js) · [posthog-js npm](https://www.npmjs.com/package/posthog-js)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No events in PostHog | Ensure `webmcp.configure` runs **before** `tool.register()` / `useWebMCP` mount; check `posthog.has_opted_in_capturing()` |
| `duration_ms` missing | `before` must set `metadata.start`; `after` reads same `metadata` object per invocation |
| `input` too large | Redact PII and truncate arrays before `capture` |

## See also

- [Sentry](/guide/analytics/sentry) — errors + performance
- [GA4](/guide/analytics/ga4) — `gtag` events
- [Reference — Hooks](/reference/hooks)
