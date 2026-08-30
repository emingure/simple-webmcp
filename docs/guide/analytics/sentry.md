---
title: Sentry — WebMCP Errors & Performance | simple-webmcp
description: Step-by-step — report WebMCP tool errors to Sentry and trace performance with spans via hooks. before/after/error/denied hooks.
head:
  - - meta
    - name: keywords
      content: WebMCP Sentry, Model Context Protocol error tracking, Sentry WebMCP hooks
---

# Sentry — WebMCP Errors & Performance

> One `webmcp.configure` for errors + performance. Hooks wrap only the agent path. See [Analytics Overview](/guide/analytics/) and [Step-by-Step](/guide/analytics/step-by-step).

For hook lifecycle, see [Guide — Hooks](/guide/hooks). For types, see [Reference — Hooks](/reference/hooks).

## When to use

Sentry for error reporting and performance — `captureException` on `error`, `startInactiveSpan` on `before`/`after`, `addBreadcrumb` on `denied`.

External: [Sentry Browser docs](https://docs.sentry.io/platforms/javascript/) · [@sentry/browser on npm](https://www.npmjs.com/package/@sentry/browser)

## Step-by-step

### Step 1 — Install & init Sentry

```bash
npm i @sentry/browser
```

```ts
import * as Sentry from '@sentry/browser';
Sentry.init({ dsn: 'https://...@o123.ingest.sentry.io/456', tracesSampleRate: 0.1 });
```

See [Sentry — Install Browser JS](https://docs.sentry.io/platforms/javascript/install/).

### Step 2 — Configure hooks once (global)

```ts
import * as Sentry from '@sentry/browser';
import { webmcp } from 'simple-webmcp';

webmcp.configure({
  hooks: {
    before: [({tool, invocationId, metadata})=>{
      metadata.sentrySpan = Sentry.startInactiveSpan({ name: `webmcp:${tool.tool.name}`, op: 'webmcp.execute' });
      Sentry.addBreadcrumb({ category:'webmcp', message:`invoked ${tool.tool.name} #${invocationId.slice(0,8)}`, level:'info' });
    }],
    after: [({metadata})=>{
      (metadata.sentrySpan as any)?.end();
    }],
    error: [({tool, error, input})=>{
      Sentry.captureException(error, { tags:{ tool: tool.tool.name }, extra:{ input } });
      ((Sentry as any).getCurrentScope?.().getSpan?.() as any)?.end?.();
    }],
    denied: [({tool, reason})=>{
      Sentry.addBreadcrumb({ category:'webmcp', message:`denied ${tool.tool.name}: ${reason}`, level:'info' });
    }],
  }
});
```

`error` and `denied` are observational — throwing inside them is swallowed (see [Hooks — Error](/guide/hooks#error--observational)).

### Step 3 — Verify in the demo

1. `npm run docs:dev` → open [/demo](/demo).
2. **Inspect → Invoke checkout** → approve → check Sentry Performance → `webmcp:checkout` span.
3. Add a tool that throws → Invoke → check Sentry Issues → `captureException` with `tool` tag.
4. Toggle **Require approval for checkout** → **Deny** → check Breadcrumbs → `denied checkout`.

### Step 4 — Production notes

- **Sample rate:** `tracesSampleRate` or `tracesSampler` for spans; avoid 100% in production.
- **PII:** Don't attach raw `input` with `email`/`token` to `extra` — redact first (see [Hooks — After](/guide/hooks#after--transform-output)).
- **Tenant:** Enrich `tags` with `tenantId` via `WebMCPProvider` scoped `before` — see [React](/guide/react).

## Cross links

- **Step-by-Step:** [Generic 4-step](/guide/analytics/step-by-step)
- **Overview:** [Analytics](/guide/analytics/)
- **Guides:** [Hooks](/guide/hooks) · [React](/guide/react) · [Inspect](/guide/inspect)
- **Reference:** [Hooks](/reference/hooks) · [Errors](/reference/errors)
- **Demo:** [/demo](/demo)
- **External:** [Sentry Browser](https://docs.sentry.io/platforms/javascript/) · [@sentry/browser](https://www.npmjs.com/package/@sentry/browser)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No span in Performance | Ensure `metadata.sentrySpan` is set in `before` and `.end()` in `after`; check `tracesSampleRate` |
| Duplicate errors | Don't `captureException` in both `error` hook and `fn` — use hook only |
| Missing `denied` | `denied` runs only when `before` returns `{action:'deny'}` — see [Hooks — Before](/guide/hooks#before--mutate-input-or-deny) |

## See also

- [PostHog](/guide/analytics/posthog)
- [GA4](/guide/analytics/ga4)
- [Reference — Hooks](/reference/hooks)
