---
title: Schema & Inference — Zod, StandardSchema & JSON Schema | WebMCP SDK
description: Define WebMCP input schemas with whole Zod/StandardSchema or per-field patches. Hierarchy, fields, whole schema, runtime inference, and Zod adapter.
---

# Schema & Inference

> **Source of truth:** `schema` (whole) → `inferred` (runtime best-effort, optional build-time) → `fields` patch → `metadata` (`name`/`description`/`annotations`). Learn [Browser Support](/guide/browser-support) and [Getting Started](/getting-started).

## Hierarchy

```
1. schema (whole) — Zod / Valibot / ArkType (StandardSchema) or raw JSON Schema
2. inferred — runtime best-effort or optional build-time (TypeScript types before erasure)
3. fields patch — Partial<JsonSchema> or per-field StandardSchema (e.g. Zod per field)
4. metadata — name, description, annotations
```

`fields` decorates, does not silently replace core type. Whole `schema` wins. See [`webmcp()` options](/reference/#webmcpoptions) and [Guide — Hooks](/guide/hooks) for validation timing (`before` → `validate` → `fn`).

## Field patch (`Partial<JsonSchema>`)

```ts
webmcp(search, {
  description: 'Search customers by name or email',
  fields: {
    query: { description: 'Name, email, or ID' },
    limit: { type: 'integer', minimum: 1, maximum: 50 },
  },
});
```

Use `required:false` to make added field optional:

```ts
fields: { note: { description: 'optional', required: false } as any }
```

## Whole vs per-field

```ts
// whole — JSON Schema
webmcp(fn, { schema: { type:'object', properties:{query:{type:'string'}}, required:['query'] } });

// whole — Zod (requires side-effect import)
import 'simple-webmcp/zod';
import { z } from 'zod';
webmcp(fn, { schema: z.object({ query: z.string().min(1) }) });

// per-field mix
webmcp(fn, { fields: { query: z.string().describe('Name'), limit: { type:'integer' } } });
```

StandardSchema is supported for any vendor exposing `~standard` — see [StandardSchema spec](https://github.com/standard-schema/standard-schema). For Zod details, see below.

## Inference — best-effort at runtime, richer at build

**Infer what JavaScript can know at runtime. Get richer TypeScript/JSDoc inference with the optional build plugin.**

### Runtime (`confidence:'low'`)

Honest about limits — it does **not** recover `query: string` magically. `TypeScript` is erased at runtime.

Parses `fn.toString()`:

* `async ({query, limit=20})` → `{query: {required}, limit: {default:20, optional}}` (type `string`/`number` only from literal defaults)
* `fn(query)` → `{query: {}}` — warn; need `fields`/`schema` or `strict:true` throws `ConfigurationError`.
* `function search(query: string)` → at runtime still `{query:{}}` — add `fields: {query:{description}}` or `schema`.

### Build-time — optional

A build plugin can read TypeScript types + JSDoc before erasure and emit richer `inputSchema` without code change — same `webmcp(fn)` call. Check the [changelog](https://github.com/emingure/simple-webmcp/blob/main/CHANGELOG.md) and GitHub discussions for current status; runtime inference works without it.

## Zod & StandardSchema adapter — `simple-webmcp/zod`

Core stays lean (~8KB gz) without Zod; Zod is opt-in to keep the bundle lean (~1.4KB gz separate).

### Enable

```ts
import 'simple-webmcp/zod'; // side-effect registers Zod → JSON converter globally
import { z } from 'zod';
import { webmcp } from 'simple-webmcp';

webmcp(fn, { schema: z.object({ query: z.string().min(1) }) });
webmcp(fn, { fields: { query: z.string().describe('Name') } });
```

Without the side-effect import, `StandardSchema` `schema` falls back to inferred/runtime placeholder and per-field Zod falls back to `{type:'string'}` — tests still pass but less accurate.

### Helpers

```ts
import { zodToJsonSchema, convertZodDef } from 'simple-webmcp/zod';
zodToJsonSchema(z.string().describe('x')); // → {type:'string', description:'x'}
```

Supports `ZodString` (checks `min`/`max`/`regex`/`email`/`url`/`uuid`), `ZodNumber` (`min`/`max`/`int`), `ZodBoolean`, `ZodEnum`, `ZodObject` (shape, optional detection), `ZodArray`, `ZodUnion`, `ZodOptional`/`Default`/`Nullable`/`Effects`, etc. `Valibot`/`ArkType` via `StandardSchema.validate` pass through when converter not matched (fallback).

### Whole vs per-field with Zod

```ts
// whole
webmcp(fn, { schema: z.object({ a: z.string(), b: z.number().optional() }) });
// per-field
webmcp(fn, { fields: { a: z.string(), b: z.number() } });
```

Whole `schema` wins; `fields` patches descriptions/`min`/`max`. Keep `dist/zod.js` (`5.32KB` raw, `1.40KB` gz) separate — import `simple-webmcp/zod` only where needed. See [Zod spec](https://zod.dev) and [Reference — Core](/reference/).

## Annotations

Extensible `Record<string,unknown>`:

```ts
webmcp(fn, { annotations: { readOnlyHint: true, destructiveHint: false, title: 'Search' } });
```

Annotations are forwarded to the WebMCP [`registerTool` definition](https://developer.chrome.com/docs/ai/webmcp/imperative-api) as hints for the agent.

## See also

- [Getting Started](/getting-started) — 30-second `webmcp(fn)` example
- [React](/guide/react) — `useWebMCP` and `Scope`
- [Hooks](/guide/hooks) — validation runs after `before` enrichment
- [Analytics Step-by-Step](/guide/analytics/step-by-step) — track invocations via hooks
- [Reference — Core](/reference/) — `WebMCPOptions` and `ToolContract`
- [Browser Support](/guide/browser-support) — Chrome, Firefox, Safari
- [External: StandardSchema](https://github.com/standard-schema/standard-schema) · [External: Zod](https://zod.dev) · [External: Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
