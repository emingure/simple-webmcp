# Core — `webmcp()`

```ts
import { webmcp } from 'simple-webmcp';

function webmcp<F extends (...args:any)=>any>(fn: F, options?: WebMCPOptions<F>): WebMCPTool<F>;
namespace webmcp { function global<F>(fn:F, opts?: Omit<WebMCPOptions<F>,'global'>): WebMCPTool<F>; }
```

## `WebMCPOptions`

```ts
type FieldDef = Partial<JsonSchema>;
type WebMCPOptions<F> = {
  name?: string; // default fn.name → snake_case
  description?: string; // or JSDoc / warn
  schema?: JsonSchema | StandardSchemaV1; // whole, wins
  outputSchema?: JsonSchema | StandardSchemaV1;
  fields?: Record<string, FieldDef | StandardSchemaV1>; // patch
  annotations?: Record<string,unknown> & {readOnlyHint?, destructiveHint?, openWorldHint?, title?};
  scope?: 'global'|'scoped'|'manual'; global?: boolean;
  enabled?: boolean; // default true
  strict?: boolean; // throw on low-confidence inference
};
```

## `WebMCPTool`

```ts
type WebMCPTool<F> = F & {
  __webmcpBrand: true;
  tool: ToolContract; definition: ToolContract;
  register(opts?:{signal?:AbortSignal}): Promise<()=>void>;
  unregister(): void;
  status: 'unregistered'|'registering'|'registered'|'unregistering'|'error';
  registration: Promise<void>|null;
  isRegistered(): boolean;
};
type ToolContract = { name:string; description:string; inputSchema:JsonSchema; outputSchema?:JsonSchema; annotations?:Record<string,unknown> };
```

Hierarchy: `schema` whole → inferred (runtime 0.1 / `unplugin` 0.2) → `fields` patch → metadata.

`register()` is async per WebMCP spec; hook maps to `AbortSignal`. `status` not `isRegistered()` alone (async pending).

## Utilities

```ts
import { isWebMCPSupported, getModelContext, toSnakeCase, registry, getRegistry } from 'simple-webmcp';
```

## Errors

```ts
import { SimpleWebMCPError, NotSupportedError, NotAllowedError, RegistrationError, ValidationError, ConfigurationError } from 'simple-webmcp';
```

Each has `code` + `cause` + `toJSON()`. `NotAllowedError` maps Permissions Policy `NotAllowedError`.
