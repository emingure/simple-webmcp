---
title: Analytics Step-by-Step — Add Observability to WebMCP Tools | simple-webmcp
description: 4-step guide to add analytics to any WebMCP tool — pick provider, configure hooks, verify in demo, ship to production. Works with PostHog, Sentry, GA4, any hook.
---

# Analytics — Step-by-Step Setup

Add observability to every WebMCP tool in **4 steps**. One `webmcp.configure` covers all tools — swap the provider SDK inside the hooks.

> **Prefer a provider recipe?** Jump to [PostHog](/guide/analytics/posthog), [Sentry](/guide/analytics/sentry), or [GA4](/guide/analytics/ga4). This page is the generic checklist.

For hook lifecycle (`before → validate → fn → after → error/denied`), see [Guide — Hooks](/guide/hooks). For API types, see [Reference — Hooks](/reference/hooks).

## Step 1 — Pick your provider

| Provider | Best for | Hook events |
|----------|----------|-------------|
| [PostHog](/guide/analytics/posthog) | Product analytics, session replay | `webmcp.invoked` / `succeeded` / `failed` / `denied` |
| [Sentry](/guide/analytics/sentry) | Errors + performance spans | `captureException` + `startInactiveSpan` |
| [GA4](/guide/analytics/ga4) | Marketing, `gtag` events | `webmcp_invoked` / `succeeded` / `error` / `denied` |

All use the same shape — choose one or combine.

External docs:
- [PostHog JS](https://posthog.com/docs/libraries/js)
- [Sentry Browser](https://docs.sentry.io/platforms/javascript/)
- [GA4 gtag](https://developers.google.com/analytics/devguides/collection/ga4)

## Step 2 — Configure hooks once (global)

Add **one** `webmcp.configure` in your app entry (e.g. `main.tsx` or `app/layout.tsx`):

```ts
import { webmcp } from 'simple-webmcp';

webmcp.configure({
  hooks: {
    before: [({tool, input, invocationId, metadata})=>{
      metadata.start = performance.now();
      // send "invoked" to your provider
      console.log('[hook:before]', tool.tool.name, invocationId, input);
    }],
    after: [({tool, invocationId, output, metadata})=>{
      const duration = Math.round(performance.now() - (metadata.start as number));
      console.log('[hook:after]', tool.tool.name, invocationId, duration + 'ms', output);
    }],
    error: [({tool, error, invocationId})=>{
      console.warn('[hook:error]', tool.tool.name, invocationId, error);
    }],
    denied: [({tool, reason, code, invocationId})=>{
      console.warn('[hook:denied]', tool.tool.name, invocationId, reason, code);
    }],
  }
});
```

Hooks wrap **only the agent `execute` path** — `tool({input})` stays pure. `metadata` is a shared bag for one invocation (`before` sets `start`, `after` reads it). `invocationId` is `crypto.randomUUID()` or fallback.

To scope by tenant/route, use `<WebMCPProvider>` instead — see [React guide](/guide/react).

## Step 3 — Verify in the demo

1. Run docs locally:

   ```bash
   npm run docs:dev
   # open /demo/
   ```

2. Open the **Hooks & HITL** card in the [demo](/demo). Toggle **Require approval for checkout** on/off.

3. Use **Inspect → Invoke checkout** → watch the hook log turn green (success) or yellow (denied). Open DevTools Console → `[webmcp:hook]` lines.

4. Check your provider dashboard (PostHog Activity, Sentry Issues, GA4 DebugView) — events should appear with `tool`, `invocationId`, `duration`.

If no events: ensure `webmcp.configure` runs **before** `tool.register()` / `useWebMCP` mount, and that the provider SDK is initialized.

## Step 4 — Production checklist

- **PII redaction:** Redact `input`/`output` before sending. Use an `after` hook to strip `email`/`token`. See pattern in [Hooks — After](/guide/hooks#after--transform-output).
- **Sampling:** For high volume, wrap hooks with `if (Math.random() > 0.1) return` or provider sampling.
- **Tenant / route:** Use `WebMCPProvider` to enrich `input` with `tenantId` — see [React — WebMCPProvider](/guide/react#webmcpprovider--scoped-hooks-tenant-analytics).
- **Durations:** Set `metadata.start` in `before`, compute in `after` (not `error`/`denied`).
- **Deny vs error:** Track `denied` (human said no) separately from `error` (operational failure). `denied` rate = HITL friction; `error` rate = reliability.
- **Testing:** In `vitest`, call `resetGlobalHooks()` and `registry.clear()` between tests — see [Reference — Hooks](/reference/hooks) for the singleton.

## Next

Pick a provider recipe:

- [PostHog — step-by-step](/guide/analytics/posthog) — `posthog.capture` with durations
- [Sentry — step-by-step](/guide/analytics/sentry) — `captureException` + spans
- [GA4 — step-by-step](/guide/analytics/ga4) — `gtag('event', …)`

Or return to [Analytics Overview](/guide/analytics/).

## See also

- [Guide — Hooks](/guide/hooks) — ordering `global→scoped→tool` / `tool→scoped→global`
- [Reference — Hooks](/reference/hooks) — `BeforeContext`, `AfterContext`, etc.
- [Demo](/demo) — live hook log + Inspect invoke
- [External: Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
