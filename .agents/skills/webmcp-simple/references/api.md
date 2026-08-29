# API Reference — simple-webmcp 0.1

## Core

```ts
import { webmcp } from 'simple-webmcp';

function webmcp<F extends (...args:any)=>any>(fn: F, options?: WebMCPOptions<F>): WebMCPTool<F>
namespace webmcp { function global<F>(fn:F, opts?: Omit<WebMCPOptions<F>,'global'>): WebMCPTool<F> }

type WebMCPTool<F> = F & {
  __webmcpBrand: true;
  tool: ToolContract; definition: ToolContract;
  register(opts?: {signal?:AbortSignal}): Promise<()=>void>;
  unregister(): void;
  status: 'unregistered'|'registering'|'registered'|'unregistering'|'error';
  registration: Promise<void>|null;
  isRegistered(): boolean;
}

type WebMCPOptions<F> = {
  name?: string; description?: string;
  schema?: JsonSchema | StandardSchemaV1; // whole contract (Zod, Valibot etc or JSON)
  outputSchema?: JsonSchema | StandardSchemaV1;
  fields?: Record<string, FieldDef|StandardSchemaV1>; // FieldDef = Partial<JsonSchema>
  annotations?: Record<string,unknown> & {readOnlyHint?, destructiveHint?, openWorldHint?, title?}
  scope?: 'global'|'scoped'|'manual'; global?: boolean; enabled?: boolean; strict?: boolean;
}

type ToolContract = { name:string; description:string; inputSchema:JsonSchema; outputSchema?:JsonSchema; annotations?:Record<string,unknown> }
```

Hierarchy: `schema` (whole) → inferred (runtime 0.1 / build 0.2) → `fields` patch → metadata.

`fields` example:

```ts
fields: {
  query: { description:'Name or email' },
  limit: { type:'integer', minimum:1, maximum:50 }
  // or per-field Zod: query: z.string().describe('...')
}
```

Errors: `SimpleWebMCPError` → `NotSupportedError`, `NotAllowedError` (Permissions Policy), `RegistrationError`, `ValidationError`, `ConfigurationError` — each `code` + `cause`.

Utils:

```ts
import { isWebMCPSupported, getModelContext, toSnakeCase, registry } from 'simple-webmcp';
```

## React

```ts
import { useWebMCP, Scope } from 'simple-webmcp/react'; // 'use client'

function useWebMCP<F>(tool: WebMCPTool<F>, opts?:{enabled?:boolean}): {supported:boolean; registered:boolean; error:Error|null; isPolyfilled:boolean; status:string}
function Scope({tools, enabled, children}: {tools:WebMCPTool<any>[]; enabled?:boolean; children?:React.ReactNode}): JSX.Element
```

## Polyfill

```ts
import 'simple-webmcp/polyfill'; // auto
import { installPolyfill, isPolyfilled } from 'simple-webmcp/polyfill';
```

## Next (experimental, 0.3)

```ts
// after spike passes
import { webmcp } from 'simple-webmcp/next';
const tool = webmcp.server(action, opts); // action is 'use server' fn
```

Not in 0.1 — do not depend yet.
