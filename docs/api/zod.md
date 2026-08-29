# Zod Adapter — `simple-webmcp/zod`

```ts
import 'simple-webmcp/zod'; // registers converter globally
import { zodToJsonSchema, convertZodDef } from 'simple-webmcp/zod';
```

* `zodToJsonSchema(schema)` → `JsonSchema|null` (checks `_def`/`_zod`).
* `convertZodDef(z)` → `JsonSchema` (internal).
* Handles `ZodString` (min/max/regex/email/url/uuid), `ZodNumber` (min/max/int), `ZodBoolean`, `ZodEnum`, `ZodObject` (shape, optional detection), `ZodArray`, `ZodUnion`, etc.

Without import, core falls back to `{type:'string'}` placeholder for `StandardSchema` fields and `inferred` for whole `schema`.

```ts
import { webmcp } from 'simple-webmcp';
import 'simple-webmcp/zod';
import { z } from 'zod';
webmcp(fn, { schema: z.object({ query: z.string() }) }); // → JSON Schema via adapter
```

Keep core lean — `dist/zod.js` `5.32KB` gz `1.40KB` separate.
