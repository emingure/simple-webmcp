# API — Hooks

```ts
import type {
  WebMCPHooks, BeforeHook, AfterHook, ErrorHook, DeniedHook,
  BeforeContext, AfterContext, ErrorContext, DeniedContext,
} from 'simple-webmcp';
import { webmcp, configureWebMCP, getGlobalHooks, resetGlobalHooks } from 'simple-webmcp';
import { WebMCPProvider } from 'simple-webmcp/react';
```

## `WebMCPHooks<F>`

```ts
type WebMCPHooks<F extends (...args:any)=>any> = {
  before?: BeforeHook<F>[]; // (ctx) => {input?} | {action:'deny', message?, code?} | void
  after?:  AfterHook<F>[];  // (ctx) => {output?} | void   (output: Awaited<ReturnType<F>>)
  error?:  ErrorHook<F>[];  // observational, void
  denied?: DeniedHook<F>[]; // observational, void — runs after deny
};
```

- All arrays, order matters. Hooks may be `async`.
- `F` ties `AfterContext.output` to `Awaited<ReturnType<F>>`. `input` is `unknown` in v1 (avoid coupling to inference); enrich freely.
- `before` returning `{action:'deny'}` stops chain, runs `denied[]`, returns `normalizeError`/`isError` to agent.

## Contexts

```ts
type HookBaseContext<F> = {
  invocationId: string; // crypto.randomUUID() || fallback webmcp_${ts}_${counter}_${rand}
  tool: WebMCPTool<F>;
  contract: ToolContract; // snapshot {name, description, inputSchema, …}
  signal: AbortSignal;    // registry AbortController signal, cooperative
  metadata: Record<string,unknown>; // mutable shared bag per invocation
};
type BeforeContext<F> = HookBaseContext<F> & { input: unknown };
type AfterContext<F>  = HookBaseContext<F> & { input: unknown; output: Awaited<ReturnType<F>> };
type ErrorContext<F>  = HookBaseContext<F> & { input: unknown; error: unknown };
type DeniedContext<F> = HookBaseContext<F> & { input: unknown; reason?: string; code?: string };
```

`metadata` is same reference across all hooks in one invocation — `before` can set `metadata.requestId`, `after`/`error`/`denied` can read it.

## Hook signatures

```ts
type BeforeHook<F> = (ctx: BeforeContext<F>) => MaybePromise<void | {input?:unknown} | {action:'deny', message?:string, code?:string}>;
type AfterHook<F>  = (ctx: AfterContext<F>)  => MaybePromise<void | {output?: Awaited<ReturnType<F>>}>;
type ErrorHook<F>  = (ctx: ErrorContext<F>)  => MaybePromise<void>;
type DeniedHook<F> = (ctx: DeniedContext<F>) => MaybePromise<void>;
type MaybePromise<T> = T | Promise<T>;
```

`error`/`denied` throws are swallowed; `before`/`after` throws trigger `error[]` then `normalizeError`.

## Global — `webmcp.configure`

```ts
webmcp.configure({ hooks:{ before:[...], after:[...], error:[...], denied:[...] }});
// accumulated: second configure concats unless replace:true
webmcp.configure({ hooks:{ before:[a] }});
webmcp.configure({ hooks:{ before:[b] }}); // => [a,b]
webmcp.configure({ hooks:{ before:[c] }, replace:true }); // => [c]

// named exports (same singleton)
import { configureWebMCP, getGlobalHooks, resetGlobalHooks } from 'simple-webmcp';
configureWebMCP({ hooks });
getGlobalHooks();   // current global hooks
resetGlobalHooks(); // clear — use in tests
```

Backed by `globalThis.__simpleWebmcp_hooks` (like `__simpleWebmcp_zodConverter`). `WebMCPOptions.hooks` also re-wraps via concat:

```ts
const t1 = webmcp(fn, { hooks:{ before:[a] }});
const t2 = webmcp(t1, { hooks:{ before:[b] }}); // t2.__hooks.before == [a,b]
```

## Scoped — `WebMCPProvider`

```ts
import { WebMCPProvider } from 'simple-webmcp/react'; // 'use client'

<WebMCPProvider hooks={{ before:[addTenant] }}>
  <WebMCPProvider hooks={{ before:[addRequestId] }}>{/* before=[addTenant, addRequestId] */}</WebMCPProvider>
</WebMCPProvider>

// also re-exported
import { WebMCPHooksContext, useWebMCPHooksContext } from 'simple-webmcp/react';
```

Nesting merges additively (`[...parent.before, ...own.before]`). Scoped hooks are stored per-tool as `__scopeHooks` at mount; `useWebMCP` reads context synchronously so first `register()` sees them. If same tool is mounted under two providers, last write wins — create separate tool instances for isolation.

## Merging utilities

```ts
import { mergeHooks, mergeHooksOrdered } from 'simple-webmcp';

mergeHooks(a,b); // concat a+b per phase
mergeHooksOrdered({ globalHooks, scopedHooks, toolHooks });
// => { before:[global,scoped,tool], after:[tool,scoped,global], error:[tool,scoped,global], denied:[tool,scoped,global] }
```

Used internally by `createHookedExecute`; exposed for testing/custom engines.

## Engine

```ts
import { createHookedExecute, genInvocationId } from 'simple-webmcp';

const execute = createHookedExecute(fn, tool, contract, {
  getHooks: () => mergeHooksOrdered({ globalHooks, scopedHooks, toolHooks }),
  validate: (input) => { // after before enrichment, before fn
    const r = standard['~standard'].validate(input);
    if ('issues' in r) throw new ValidationError(...);
  }
});
genInvocationId(); // crypto.randomUUID() || fallback
```

Engine is what `webmcp(fn)` installs as `registry.register(..., {execute})`. It handles `signal.aborted` cooperative short-circuit, `denied` isError, `error` safe observer, and final `normalizeResult`.

## Ordering summary

| phase | order | note |
|---|---|---|
| `before` | `global → scoped → tool` | enrichment outward→inward |
| `after` | `tool → scoped → global` | onion — tool closest to fn |
| `error`/`denied` | `tool → scoped → global` | tool-specific first |

## Notes

- Hooks only on agent path (`invokeTool`/`executeTool`). Direct `tool(input)` bypasses engine.
- `signal` abort during `fn` does not forcibly stop `fn` unless `fn` checks `signal.aborted`.
- Bundle: hooks add ~0.8KB gz to core (`6.26KB gz` → `~7.1KB`).
