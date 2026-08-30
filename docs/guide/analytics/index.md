---
title: Analytics & Observability — WebMCP Hooks | simple-webmcp
description: Track every WebMCP tool invocation with PostHog, Sentry, GA4 via hooks. Overview, choose your provider, one snippet for all tools.
---

# Analytics & Observability — via Hooks

Hooks are the single integration point for analytics, error reporting, and product metrics. One `webmcp.configure` or `<WebMCPProvider>` covers every tool; tool-level hooks add HITL specifics.

> **Demo:** Open [/demo](/demo) → **Hooks & HITL** card and `console` (`[webmcp:hook]`). Toggle HITL and **Inspect → Invoke checkout** to see `before → after/error/denied` flows live.

## The pattern — 4 hooks, one place

```ts
import { webmcp } from 'simple-webmcp';

// global — once, covers every tool
webmcp.configure({
  hooks: {
    before: [trackInvocation],
    after:  [trackResult],
    error:  [trackError],
    denied: [trackDenied],
  }
});
```

Each hook receives `{invocationId, tool, contract, input/output/error, signal, metadata}`. Use `metadata` to pass `start` time or `requestId` from `before` to `after`.

```ts
const trackInvocation: BeforeHook<any> = ({invocationId, tool, input, metadata}) => {
  metadata.start = performance.now();
  // send to your analytics — see providers below
};
const trackResult: AfterHook<any> = ({invocationId, tool, metadata}) => {
  const duration = Math.round(performance.now() - (metadata.start as number));
  // track success with duration
};
```

`error` / `denied` are observational — throwing inside them is swallowed (see [Hooks](/guide/hooks)).

## Choose your provider — step-by-step guides

| Provider | Use case | Guide |
|----------|----------|-------|
| **PostHog** | Product analytics, feature flags | [PostHog — step-by-step](/guide/analytics/posthog) |
| **Sentry** | Error tracking + performance spans | [Sentry — step-by-step](/guide/analytics/sentry) |
| **Google Analytics 4** | `gtag` events, marketing attribution | [GA4 — step-by-step](/guide/analytics/ga4) |

> **New to hooks?** Start with [Step-by-Step Setup](/guide/analytics/step-by-step) — 4 steps, generic, copy-paste ready. Then pick a provider above.

All providers use the same hook shape; swap the `capture`/`track` call. Each provider guide links to its official docs:

- [PostHog JS docs](https://posthog.com/docs/libraries/js) · [Mixpanel docs](https://docs.mixpanel.com/) · [GA4 gtag docs](https://developers.google.com/analytics/devguides/collection/ga4) · [Sentry browser docs](https://docs.sentry.io/platforms/javascript/)

## Quick preview — PostHog + Sentry + GA4 in one place

```ts
import posthog from 'posthog-js';
import * as Sentry from '@sentry/browser';
import { webmcp } from 'simple-webmcp';

webmcp.configure({
  hooks: {
    before: [
      ({tool, input, invocationId, metadata})=>{
        metadata.start = Date.now();
        posthog.capture('webmcp.invoked', { tool: tool.tool.name, invocationId });
        gtag?.('event','webmcp_invoked', { tool: tool.tool.name });
      }
    ],
    after: [({tool, invocationId, metadata})=>{
      posthog.capture('webmcp.succeeded', { tool: tool.tool.name, invocationId, duration: Date.now()-(metadata.start as number) });
    }],
    error: [({tool, error})=>{
      Sentry.captureException(error, { tags:{ tool: tool.tool.name }});
      posthog.capture('webmcp.failed', { tool: tool.tool.name, error: String(error) });
    }],
    denied: [({tool, reason, code})=>{
      posthog.capture('webmcp.denied', { tool: tool.tool.name, reason, code });
      Sentry.addBreadcrumb({ category:'webmcp', message:`denied ${tool.tool.name}: ${reason}`, level:'info' });
    }],
  }
});
```

For full per-provider setup (install, init, verify, prod notes), open the guides above. For hook lifecycle & ordering, see [Guide — Hooks](/guide/hooks).

## React scoped — tenant or route analytics

```tsx
// per-route tenant enrichment + analytics
import { WebMCPProvider } from 'simple-webmcp/react';

function TenantLayout({tenantId, children}:{tenantId:string, children:React.ReactNode}){
  return (
    <WebMCPProvider hooks={{
      before: [({input, metadata})=>{
        metadata.tenantId = tenantId;
        return { input: {...(input as any), tenantId} };
      }],
      after: [({tool, metadata})=>{
        // tenant-scoped event
        posthog.capture('webmcp.succeeded', { tool: tool.tool.name, tenantId });
      }]
    }}>
      {children}
    </WebMCPProvider>
  );
}
```

Scoped `before` mutates `input` for every tool in the subtree; provider nesting merges additively. See [React guide](/guide/react).

## HITL-denied vs error — track separately

- `error`: `fn` threw or hook threw — operational failure.
- `denied`: `before` returned `{action:'deny'}` — human/business said no (approval modal, policy, rate limit as deny).

Track them separately — `denied` rate is your HITL friction metric; `error` rate is reliability. See [`before` returning deny](/guide/hooks#before--mutate-input-or-deny).

## Console + demo log

During development, also log to console (the [demo](/demo) does):

```ts
before: [({tool, invocationId, input})=> console.log(`[webmcp:hook] before ${tool.tool.name} #${invocationId.slice(0,8)}`, input)],
after:  [({tool, output})=> console.log(`[webmcp:hook] after ${tool.tool.name}`, output)],
error:  [({tool, error})=> console.warn(`[webmcp:hook] error ${tool.tool.name}`, error)],
denied: [({tool, reason})=> console.warn(`[webmcp:hook] denied ${tool.tool.name}`, reason)],
```

Open DevTools → Console while using **Inspect → Invoke** in the [demo](/demo).

## See also

- [Step-by-Step Setup](/guide/analytics/step-by-step) — generic 4-step
- [PostHog](/guide/analytics/posthog) · [Sentry](/guide/analytics/sentry) · [GA4](/guide/analytics/ga4)
- [Guide — Hooks](/guide/hooks) — lifecycle, ordering, HITL
- [Reference — Hooks](/reference/hooks) — types
- [Demo](/demo) — live hook log
- [External: PostHog](https://posthog.com/docs/libraries/js) · [External: Sentry](https://docs.sentry.io) · [External: GA4 gtag](https://developers.google.com/analytics/devguides/collection/ga4)
