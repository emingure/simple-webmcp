# Hooks — `before` / `after` / `error` / `denied`

> **One hook API, three scopes.** Function-first, state-based, no chain abstraction. `before` mutates `input` as it flows, `after` mutates `output`, `error` observes failures, `denied` handles HITL rejections. All logs go to console + visible hook log in the demo.

Hooks wrap **only the agent `execute` path** (`document.modelContext.registerTool` → `execute`). Direct human calls `tool({input})` stay pure — `search({query:'alice'})` never triggers hooks.

*Demo: open [/demo](/demo) → **Hooks & HITL** card. Toggle “Require approval for checkout”, then **Inspect → Invoke checkout**. Watch hook log + `console` (`[webmcp:hook]`) and the approval modal.*

## Quick start

```ts
import { webmcp } from 'simple-webmcp';

async function deleteUser({id}:{id:string}){ /* … */ }

// tool-level — arrays, order matters
const tool = webmcp(deleteUser, {
  description: 'Delete a user',
  hooks: {
    before: [addTenant, requireApproval],   // input flows: addTenant → requireApproval → fn
    after:  [redactResult],
    error:  [trackError],
    denied: [trackDenied],
  }
});

// global — every tool inherits
import { webmcp } from 'simple-webmcp';
webmcp.configure({
  hooks: {
    before: [trackInvocation],
    after:  [trackResult],
    error:  [reportError],
    denied: [trackDenied],
  }
});

// React scoped — provider nests, merges additively
import { WebMCPProvider } from 'simple-webmcp/react';
<WebMCPProvider hooks={{ before: [addTenantContext] }}>
  <Scope tools={[tool]}>{children}</Scope>
</WebMCPProvider>
```

## Lifecycle & ordering

```
input
  ↓
global.before[] → scoped.before[] → tool.before[]   // outer→inner
  ↓ validate (StandardSchema after enrichment)
  ↓ fn(input) — your function
  ↓
tool.after[] → scoped.after[] → global.after[]       // inner→outer (onion)
  ↓ normalizeResult → agent receives content
```

On **deny** (`before` returns `{action:'deny'}`): run `denied[]` (tool→scoped→global), return `{isError:true, content:[{text:'Denied: …'}]}` — `after` never runs. On **throw** (fn or hook): run `error[]` (tool→scoped→global) as **safe observer** (throws inside `error` are swallowed, never recurse), return `normalizeError`.

`signal` (`AbortSignal` from registry) is cooperative — `if (signal.aborted)` short-circuit returns abort error; `fn` must honor `signal` itself if it wants interruptible work. `metadata: Record<string,unknown>` is a mutable shared bag for the whole invocation (`metadata.start = performance.now()` in `before`, read in `after`).

`invocationId` is `crypto.randomUUID()` when available, else `webmcp_${Date.now()}_${counter}_${rand}` fallback.

## Before — mutate input, or deny

```ts
const addTenant: BeforeHook<typeof deleteUser> = ({input, metadata}) => {
  metadata.tenantId = 'tenant_123';          // shared bag
  return { input: { ...(input as any), tenantId: 'tenant_123' } };
};

const requireApproval: BeforeHook<typeof checkout> = async ({input, tool, signal}) => {
  // HITL — show modal, await human
  const approved = await showApprovalModal({ tool, input }); // your UI
  if (!approved) {
    return { action: 'deny', message: 'User declined checkout', code: 'USER_DENIED' };
  }
  // continue — don't return, or return {input} to enrich
};
```

- Return `void` → continue.
- Return `{input: enriched}` → next `before` sees enriched input.
- Return `{action:'deny', message, code}` → stop, run `denied[]`, agent gets `Denied: …` (`isError:true`).
- Throw → treat as error (run `error[]`).

No `action:'continue'` ceremony. For checkout in the demo, toggle **Require approval for checkout** to see deny/approve flows in hook log.

## After — transform output

```ts
const redact: AfterHook<typeof checkout> = ({output}) => {
  // output is Awaited<ReturnType<F>> — typed
  if (output?.order?.email) {
    return { output: { ...output, order: { ...output.order, email: output.order.email.replace(/(.).+@/, '$1***@') } } };
  }
};
```

- Return `void` → keep output.
- Return `{output: newOutput}` → next `after` sees new output.
- Throw → run `error[]`, agent gets `Error: …`.

After hooks receive raw `output` *before* `normalizeResult`, then final output is normalized to `{content:[{type:'text',…}]}`.

## Error — observational

```ts
const trackError: ErrorHook<typeof deleteUser> = ({error, input, tool, invocationId}) => {
  console.warn('[hook:error]', tool.tool.name, error);
  // send to Sentry / analytics — don't throw
};
```

- Return `void` only. Throwing inside `error` is swallowed, second `error` still runs.
- No recovery in v1 (`{recover}` deferred) — return value is ignored.

## Denied — HITL analytics

```ts
const trackDenied: DeniedHook<typeof checkout> = ({reason, code, input}) => {
  analytics.track('webmcp.denied', { code, reason, input });
};
```

Only runs when a `before` returned `action:'deny'`. Useful to distinguish “agent called tool but human said no” from success/error.

## Tool vs global vs scoped

```ts
// global — config singleton (like zod converter), accumulated via concat
webmcp.configure({ hooks:{ before:[a] }});
webmcp.configure({ hooks:{ before:[b] }}); // => [a,b]
webmcp.configure({ hooks:{ before:[c] }, replace:true }); // => [c]

// tool — re-wrapping concats, not replaces
const t1 = webmcp(fn, { hooks:{ before:[a] }});
const t2 = webmcp(t1, { hooks:{ before:[b] }}); // before=[a,b]

// scoped — provider merges additively; nesting accumulates
<WebMCPProvider hooks={{before:[outer]}}>
  <WebMCPProvider hooks={{before:[inner]}}>
    <Scope tools={[t2]} /> {/* before = [outer, inner] + global + tool */}
  </WebMCPProvider>
</WebMCPProvider>
```

Clear global in tests: `import { resetGlobalHooks } from 'simple-webmcp'; resetGlobalHooks();`.

## Direct calls are not hooked

```ts
const tool = webmcp(fn, { hooks:{ before:[enrich] }});
await tool({query:'hi'});          // human → no hooks, raw fn
await invokeTool('search', {query:'hi'}); // agent → hooks run
```

If you need the same enrichment for human calls, call the function directly or share a helper.

## Patterns

- **Tenant enrichment:** `before` returns `{input: {...input, tenantId}}`.
- **AuthZ:** `before` checks permissions, returns `deny` if not allowed.
- **Approval (HITL):** `before` awaits modal/confirm, returns `deny` on cancel — see demo `requireApproval`.
- **Redaction:** `after` returns `{output: redacted}`.
- **Timing:** `before` sets `metadata.start = performance.now()`, `after` reads `metadata.start`.
- **Abort:** check `signal.aborted` inside long-running `before`; return deny or throw.

## See also

- [API — Hooks](/api/hooks) — type reference
- [Guide — Analytics](/guide/analytics) — PostHog/Mixpanel/GA4/Segment/Sentry examples
- [Demo — Shopping cart + hook log](/demo) — live `before/after/error/denied` with console ` [webmcp:hook]`
