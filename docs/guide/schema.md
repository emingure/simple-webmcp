# Schema & Inference

## Hierarchy

```
1. schema (whole) — Zod / Valibot / ArkType (StandardSchema) or raw JSON Schema
2. inferred — runtime (0.1) or build TS/JSDoc (0.2 via simple-webmcp/unplugin)
3. fields patch — Partial<JsonSchema> or per-field StandardSchema
4. metadata — name, description, annotations
```

`fields` decorates, does not silently replace core type. Whole `schema` wins.

## Field patch (`Partial<JsonSchema>`)

```ts
webmcp(search, {
  description: 'Search',
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
// whole
webmcp(fn, { schema: { type:'object', properties:{query:{type:'string'}}, required:['query'] } });

// per-field mix
import 'simple-webmcp/zod';
import { z } from 'zod';
webmcp(fn, { fields: { query: z.string().describe('…'), limit: { type:'integer' } } });
```

## Inference — best-effort at runtime, richer at build

**Infer what JavaScript can know at runtime. Get richer TypeScript/JSDoc inference with the optional build plugin.**

### Runtime (0.1, `confidence:'low'`)

Honest about limits — it does **not** recover `query: string` magically. `TypeScript` is erased at runtime.

Parses `fn.toString()`:

* `async ({query, limit=20})` → `{query: {required}, limit: {default:20, optional}}` (type `string`/`number` only from literal defaults)
* `fn(query)` → `{query: {}}` — warn; need `fields`/`schema` or `strict:true` throws `ConfigurationError`.
* `function search(query: string)` → at runtime still `{query:{}}` — add `fields: {query:{description}}` or `schema`.

### Build (0.2, Vite/Webpack) — optional

`simple-webmcp/unplugin` (TS + JSDoc before erasure) → JSON Schema, same `webmcp(fn)` call, richer `inputSchema`, no code change. Validated pattern from `webmcp-nexus` (`ts-morph`). Not in 0.1 to avoid Turbopack coupling (Next 16 defaults to Turbopack).

## Annotations

Extensible `Record<string,unknown>`:

```ts
webmcp(fn, { annotations: { readOnlyHint: true, destructiveHint: false, title: 'Search' } });
```
