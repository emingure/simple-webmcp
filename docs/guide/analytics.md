# Analytics & Observability — via Hooks

Hooks are the single integration point for analytics, error reporting, and product metrics. One `webmcp.configure` or `WebMCPProvider` covers every tool; tool-level hooks add HITL/approval specifics.

> Demo: [/demo](/demo) logs every hook to the **Hooks & HITL** card and `console` (`[webmcp:hook]`). Toggle HITL and try **Inspect → Invoke checkout** to see `before → denied → error` flows.

## The pattern

```ts
import { webmcp } from 'simple-webmcp';

// global — once
webmcp.configure({
  hooks: {
    before: [trackInvocation],
    after:  [trackResult],
    error:  [trackError],
    denied: [trackDenied],
  }
});
```

Each hook receives `{invocationId, tool, contract, input/output/error, signal, metadata}`. Use `metadata` to pass timing/requestId from `before` to `after`.

```ts
const trackInvocation: BeforeHook<any> = ({invocationId, tool, input, metadata}) => {
  metadata.start = performance.now();
  // send to your analytics — see providers below
};
const trackResult: AfterHook<any> = ({invocationId, tool, input, output, metadata}) => {
  const duration = Math.round(performance.now() - (metadata.start as number));
  // track success with duration
};
```

`error`/`denied` are observational — throw inside them is swallowed.

## PostHog

```ts
import posthog from 'posthog-js';
import { webmcp } from 'simple-webmcp';

webmcp.configure({
  hooks: {
    before: [({tool, input, invocationId, metadata})=>{
      metadata.start = Date.now();
      posthog.capture('webmcp.invoked', { tool: tool.tool.name, invocationId, input });
    }],
    after: [({tool, invocationId, metadata})=>{
      posthog.capture('webmcp.succeeded', { tool: tool.tool.name, invocationId, duration: Date.now()-(metadata.start as number) });
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

## Mixpanel

```ts
import mixpanel from 'mixpanel-browser';
webmcp.configure({
  hooks: {
    before: [({tool, input})=> mixpanel.track('Tool Invoked', { tool: tool.tool.name, input })],
    after:  [({tool, output})=> mixpanel.track('Tool Succeeded', { tool: tool.tool.name })],
    error:  [({tool, error})=> mixpanel.track('Tool Failed', { tool: tool.tool.name, error: String(error) })],
    denied: [({tool, code})=> mixpanel.track('Tool Denied', { tool: tool.tool.name, code })],
  }
});
```

## Amplitude

```ts
import * as amplitude from '@amplitude/analytics-browser';
webmcp.configure({
  hooks: {
    before: [({tool})=> amplitude.track('webmcp:invoked', { tool: tool.tool.name })],
    after:  [({tool})=> amplitude.track('webmcp:succeeded', { tool: tool.tool.name })],
    error:  [({tool, error})=> amplitude.track('webmcp:error', { tool: tool.tool.name, error: String(error) })],
    denied: [({tool, reason})=> amplitude.track('webmcp:denied', { tool: tool.tool.name, reason })],
  }
});
```

## Google Analytics 4 (gtag)

```ts
webmcp.configure({
  hooks: {
    before: [({tool})=> gtag('event','webmcp_invoked', { tool: tool.tool.name })],
    after:  [({tool})=> gtag('event','webmcp_succeeded', { tool: tool.tool.name })],
    error:  [({tool})=> gtag('event','webmcp_error', { tool: tool.tool.name })],
    denied: [({tool})=> gtag('event','webmcp_denied', { tool: tool.tool.name })],
  }
});
```

If you need GA4 durations, set `metadata.start` in `before` and compute in `after`.

## Segment (analytics.js)

```ts
import { AnalyticsBrowser } from '@segment/analytics-next';
const analytics = new AnalyticsBrowser().load({ writeKey: '...' });
webmcp.configure({
  hooks: {
    before: [({tool, input})=> analytics.track('WebMCP Invoked', { tool: tool.tool.name, input })],
    after:  [({tool})=> analytics.track('WebMCP Succeeded', { tool: tool.tool.name })],
    error:  [({tool, error})=> analytics.track('WebMCP Failed', { tool: tool.tool.name, error: String(error) })],
    denied: [({tool})=> analytics.track('WebMCP Denied', { tool: tool.tool.name })],
  }
});
```

## Sentry (errors + performance)

```ts
import * as Sentry from '@sentry/browser';
webmcp.configure({
  hooks: {
    before: [({tool, invocationId, metadata})=>{
      metadata.sentrySpan = Sentry.startInactiveSpan({ name: `webmcp:${tool.tool.name}`, op: 'webmcp.execute' });
    }],
    after: [({metadata})=>{
      (metadata.sentrySpan as any)?.end();
    }],
    error: [({tool, error, input})=>{
      Sentry.captureException(error, { tags:{ tool: tool.tool.name }, extra:{ input } });
      (Sentry.getCurrentScope().getSpan() as any)?.end();
    }],
    denied: [({tool, reason})=>{
      Sentry.addBreadcrumb({ category:'webmcp', message:`denied ${tool.tool.name}: ${reason}`, level:'info' });
    }],
  }
});
```

## Datadog RUM / Real User Monitoring

```ts
import { datadogRum } from '@datadog/browser-rum';
webmcp.configure({
  hooks: {
    before: [({tool, input, metadata})=>{
      metadata.start = performance.now();
      datadogRum.addAction('webmcp.invoked', { tool: tool.tool.name, input });
    }],
    after: [({tool, metadata})=>{
      datadogRum.addAction('webmcp.succeeded', { tool: tool.tool.name, duration: Math.round(performance.now()-(metadata.start as number)) });
    }],
    error: [({tool, error})=>{
      datadogRum.addError(error as Error, { tool: tool.tool.name });
    }],
  }
});
```

## Vercel Analytics

```ts
import { track } from '@vercel/analytics';
webmcp.configure({
  hooks: {
    before: [({tool})=> track('webmcp_invoked', { tool: tool.tool.name })],
    after:  [({tool})=> track('webmcp_succeeded', { tool: tool.tool.name })],
    error:  [({tool})=> track('webmcp_error', { tool: tool.tool.name })],
    denied: [({tool})=> track('webmcp_denied', { tool: tool.tool.name })],
  }
});
```

## Plausible (privacy-friendly)

```ts
// plausible global is `window.plausible`
webmcp.configure({
  hooks: {
    before: [({tool})=> (window as any).plausible?.('webmcp:invoked', { props:{ tool: tool.tool.name } })],
    after:  [({tool})=> (window as any).plausible?.('webmcp:succeeded', { props:{ tool: tool.tool.name } })],
    denied: [({tool})=> (window as any).plausible?.('webmcp:denied', { props:{ tool: tool.tool.name } })],
  }
});
```

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
        // send tenant-scoped event
        analytics.track('webmcp.succeeded', { tool: tool.tool.name, tenantId });
      }]
    }}>
      {children}
    </WebMCPProvider>
  );
}
```

Scoped `before` mutates `input` for every tool in subtree; provider nesting merges additively.

## HITL-denied vs error — why both?

- `error`: `fn` threw or hook threw — operational failure.
- `denied`: `before` returned `{action:'deny'}` — human/business said no (approval modal, policy, rate limit as deny).
Track them separately — `denied` rate is your HITL friction metric; `error` rate is reliability.

See `docs/examples/demo` checkout `requireApproval` hook for a modal example (returns `deny` when user clicks **Deny**).

## Console + demo log

During development, also log to console (demo does):

```ts
before: [({tool, invocationId, input})=> console.log(`[webmcp:hook] before ${tool.tool.name} #${invocationId.slice(0,8)}`, input)],
after:  [({tool, output})=> console.log(`[webmcp:hook] after ${tool.tool.name}`, output)],
error:  [({tool, error})=> console.warn(`[webmcp:hook] error ${tool.tool.name}`, error)],
denied: [({tool, reason})=> console.warn(`[webmcp:hook] denied ${tool.tool.name}`, reason)],
```

Open DevTools → Console while using **Inspect → Invoke** in the demo.

## Testing hooks

```ts
import { resetGlobalHooks } from 'simple-webmcp';
import { registry } from 'simple-webmcp';

afterEach(()=>{ registry.clear(); resetGlobalHooks(); });

test('analytics', async ()=>{
  const spy = vi.fn();
  webmcp.configure({ hooks:{ after:[spy] }});
  const tool = webmcp(fn, {description:'d'});
  await tool.register();
  const exec = registry.get(tool.tool.name)!.execute!;
  await exec({a:1});
  expect(spy).toHaveBeenCalled();
});
```

See [Guide — Hooks](/guide/hooks) for lifecycle, ordering, and HITL details.
