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
  schema?: JsonSchema | StandardSchemaV1; // whole, wins — main source of truth
  fields?: Record<string, FieldDef | StandardSchemaV1>; // patch, enhances inferred
  annotations?: Record<string,unknown> & {readOnlyHint?, destructiveHint?, openWorldHint?, title?};
  scope?: 'global'|'scoped'|'manual'; global?: boolean;
  enabled?: boolean; // default true
  strict?: boolean; // throw on low-confidence runtime inference
  // outputSchema?: kept internally, not in 0.1 marketing — browser does not enforce it
};
```

## `WebMCPTool`

```ts
type WebMCPTool<F> = F & {
  __webmcpBrand: true;
  tool: ToolContract; definition: ToolContract;
  register(opts?:{signal?:AbortSignal}): Promise<()=>void>;
  unregister(): void;
  status: 'unregistered'|'registering'|'registered'|'unsupported'|'unregistering'|'error';
  registration: Promise<void>|null;
  isRegistered(): boolean;
};
type ToolContract = { name:string; description:string; inputSchema:JsonSchema; annotations?:Record<string,unknown> };
```

**Framework-agnostic core. React adapter included. More adapters coming.** Hierarchy: `schema` whole → inferred (runtime best-effort 0.1 / `unplugin` 0.2) → `fields` patch → metadata.

`register()` is async per WebMCP spec (`document.modelContext.registerTool`); hook maps to `AbortSignal`. `status:'unsupported'` is mutually exclusive with `'registered'` — check `isWebMCPSupported()`.

## Utilities

```ts
import { isWebMCPSupported, getModelContext, toSnakeCase, registry, getRegistry } from 'simple-webmcp';
```

## Errors

```ts
import { SimpleWebMCPError, NotSupportedError, NotAllowedError, RegistrationError, ValidationError, ConfigurationError } from 'simple-webmcp';
```

Each has `code` + `cause` + `toJSON()`. `NotAllowedError` maps Permissions Policy `NotAllowedError`.
