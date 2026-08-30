---
title: GA4 (gtag) — WebMCP Analytics | simple-webmcp
description: Step-by-step — send WebMCP tool events to Google Analytics 4 via gtag. before/after/error/denied hooks with duration support.
head:
  - - meta
    - name: keywords
      content: WebMCP GA4, Google Analytics 4 WebMCP, gtag WebMCP events
---

# GA4 (gtag) — WebMCP Analytics

> Track `webmcp_invoked` / `succeeded` / `error` / `denied` with `gtag('event', …)` via hooks. See [Analytics Overview](/guide/analytics/) and [Step-by-Step](/guide/analytics/step-by-step).

For hook lifecycle, see [Guide — Hooks](/guide/hooks). For types, see [Reference — Hooks](/reference/hooks).

## When to use

GA4 for marketing attribution and top-level `gtag` events per tool invocation.

External: [GA4 gtag docs](https://developers.google.com/analytics/devguides/collection/ga4) · [GA4 — Measure events](https://developers.google.com/analytics/devguides/collection/ga4/tag-guide)

## Step-by-step

### Step 1 — Install gtag

Add to your HTML or via `gtag.js`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date()); gtag('config', 'G-XXXX');
</script>
```

Type helper (TS): `declare function gtag(cmd:string, action:string, params?:Record<string,unknown>): void;`

### Step 2 — Configure hooks once (global)

```ts
import { webmcp } from 'simple-webmcp';

webmcp.configure({
  hooks: {
    before: [({tool, metadata})=>{
      metadata.start = Date.now();
      gtag('event','webmcp_invoked', { tool: tool.tool.name });
    }],
    after: [({tool, metadata})=>{
      gtag('event','webmcp_succeeded', { tool: tool.tool.name, duration_ms: Date.now()-(metadata.start as number) });
    }],
    error: [({tool})=> gtag('event','webmcp_error', { tool: tool.tool.name })],
    denied: [({tool})=> gtag('event','webmcp_denied', { tool: tool.tool.name })],
  }
});
```

For durations: set `metadata.start` in `before`, compute in `after`. Hooks are observational for `error`/`denied` — throws are swallowed.

### Step 3 — Verify in the demo

1. `npm run docs:dev` → open [/demo](/demo) with GA4 DebugView (`gtag('config', 'G-XXXX', {debug_mode:true})`).
2. **Inspect → Invoke** `add_to_cart` → check Realtime → `webmcp_invoked` → `webmcp_succeeded` with `duration_ms`.
3. Toggle **Require approval for checkout** → **Deny** → verify `webmcp_denied`.
4. Force an error (tool that throws) → verify `webmcp_error`.

### Step 4 — Production notes

- **PII:** Don't send raw `input` as params — GA4 params are limited and PII-sensitive. Send `tool` + `duration` only, or hashed IDs.
- **Consent:** Gate `gtag` behind consent mode (`gtag('consent', …)`) if required.
- **Tenant:** Use `WebMCPProvider` to add `tenantId` as event param — see [React](/guide/react).

## Cross links

- **Step-by-Step:** [Generic 4-step](/guide/analytics/step-by-step)
- **Overview:** [Analytics](/guide/analytics/)
- **Guides:** [Hooks](/guide/hooks) · [React](/guide/react)
- **Reference:** [Hooks](/reference/hooks)
- **Demo:** [/demo](/demo)
- **External:** [GA4 gtag](https://developers.google.com/analytics/devguides/collection/ga4) · [GA4 — Events](https://developers.google.com/analytics/devguides/collection/ga4/tag-guide)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No events in DebugView | Ensure `gtag` is on `window` before `webmcp.configure`; check `G-XXXX` and `debug_mode` |
| `duration_ms` missing | Set `metadata.start` in `before`; read same `metadata` in `after` |
| `denied` not firing | Only when `before` returns `{action:'deny'}` — see [Hooks — Before](/guide/hooks#before--mutate-input-or-deny) |

## See also

- [PostHog](/guide/analytics/posthog)
- [Sentry](/guide/analytics/sentry)
- [Reference — Hooks](/reference/hooks)
