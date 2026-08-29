# Zod & StandardSchema

Core is `6.26KB gz` without Zod; Zod is opt-in to keep lean.

## Enable

```ts
import 'simple-webmcp/zod'; // side-effect registers Zod → JSON converter
import { z } from 'zod';
import { webmcp } from 'simple-webmcp';

webmcp(fn, { schema: z.object({ query: z.string().min(1) }) });
webmcp(fn, { fields: { query: z.string().describe('Name') } });
```

Without the side-effect import, StandardSchema `schema` falls back to inferred/runtime placeholder and per-field Zod falls back to `{type:'string'}` — tests still pass but less accurate.

## Helpers

```ts
import { zodToJsonSchema, convertZodDef } from 'simple-webmcp/zod';
zodToJsonSchema(z.string().describe('x')); // → {type:'string', description:'x'}
```

Supports `ZodString` (checks min/max/regex/email/url/uuid), `ZodNumber` (min/max/int), `ZodEnum`, `ZodArray`, `ZodObject`, `ZodOptional/Default/Nullable/Effects`, unions etc. Valibot/ArkType via StandardSchema `validate` will pass through when converter not matched (fallback).

## Whole vs per-field

```ts
// whole
webmcp(fn, { schema: z.object({ a: z.string(), b: z.number().optional() }) });
// per-field
webmcp(fn, { fields: { a: z.string(), b: z.number() } });
```

Whole `schema` wins; `fields` patches descriptions/min/max.
