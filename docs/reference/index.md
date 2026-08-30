---
title: Core — webmcp() | WebMCP SDK
description: webmcp(fn) API — wrap any function as a WebMCP tool. Options, ToolContract, registration lifecycle, hooks, and errors.
---

# Core — `webmcp()`

```ts
import { webmcp } from 'simple-webmcp';

function webmcp<F extends (...args:any)=>any>(fn: F, options?: WebMCPOptions<F>): WebMCPTool<F>;
namespace webmcp { function global<F>(fn:F, opts?: Omit<WebMCPOptions<F>,'global'>): WebMCPTool<F>; }
```

For a 30-second start, see [Getting Started](/getting-started). For schema details, see [Schema & Inference](/guide/schema).

## `WebMCPOptions`

```ts
type FieldDef = Partial<JsonSchema>;
type WebMCPOptions<F> = {
  name?: string; // default fn.name → snake_case
  description?: string; // or JSDoc / warn
  schema?: JsonSchema | StandardSchemaV1; // whole, wins — main source of truth
  fields?: Record<string, FieldDef | StandardSchemaV1>; // patch, enhances inferred
  annotations?: Record<string,unknown> & {readOnlyHint?, destructiveHint?, openWorldHint?, title?};
  scope?: 'global'|'scoped'|'manual'; global?: boolean;
  enabled?: boolean; // default true
  strict?: boolean; // throw on low-confidence runtime inference
  hooks?: WebMCPHooks<F>; // before/after/error/denied — agent execute only
};
```

## `WebMCPTool`

```ts
type WebMCPTool<F> = F & {
  readonly __webmcpBrand: true;
  readonly tool: ToolContract; readonly definition: ToolContract;
  register(opts?:{signal?:AbortSignal}): Promise<()=>void>;
  unregister(): void;
  readonly status: 'unregistered'|'registering'|'registered'|'unsupported'|'unregistering'|'error';
  readonly registration: Promise<void>|null;
  isRegistered(): boolean;
};
type ToolContract = { name:string; description:string; inputSchema:JsonSchema; annotations?:Record<string,unknown> };
```

Framework-agnostic core with React adapter. Hierarchy: `schema` whole → inferred (runtime best-effort, optional build-time) → `fields` patch → metadata. See [Schema & Inference](/guide/schema).

`register()` is async per the [Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) (`document.modelContext.registerTool`); the hook maps to `AbortSignal`. `status:'unsupported'` is mutually exclusive with `'registered'` — check `isWebMCPSupported()` (see [Browser Support](/guide/browser-support)).

## Hooks (global / scoped / tool)

```ts
webmcp(fn, {
  hooks: {
    before: [addTenant, requireApproval], // ({input, metadata})=>{input} | {action:'deny'}
    after:  [redact],                     // ({input, output})=>{output}
    error:  [trackError],                 // observational
    denied: [trackDenied],                // runs after deny
  }
});
webmcp.configure({ hooks:{ before:[trackInvocation] }}); // global
// React scoped: <WebMCPProvider hooks={{before:[...]}}>
```

See [Guide — Hooks](/guide/hooks) and [Reference — Hooks](/reference/hooks) for ordering (`global→scoped→tool` before, `tool→scoped→global` after) and HITL. For observability, see [Analytics — Overview](/guide/analytics/) and [Step-by-Step](/guide/analytics/step-by-step).

## Utilities

```ts
import { isWebMCPSupported, getModelContext, toSnakeCase, registry, getRegistry } from 'simple-webmcp';
```

## Errors

```ts
import { SimpleWebMCPError, NotSupportedError, NotAllowedError, RegistrationError, ValidationError, ConfigurationError } from 'simple-webmcp';
```

Each has `code` + `cause` + `toJSON()`. `NotAllowedError` maps to Permissions Policy `NotAllowedError`. See [Reference — Errors & Registry](/reference/errors).

## See also

- [Getting Started](/getting-started)
- [Guide — Hooks](/guide/hooks)
- [Reference — Hooks](/reference/hooks)
- [Reference — Errors](/reference/errors)
- [Schema & Inference](/guide/schema)
- [External: Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
