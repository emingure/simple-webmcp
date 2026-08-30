/**
 * Minimal JSON Schema type used for WebMCP input/output schemas.
 * We keep it loose (Partial) to avoid hard dependency on a specific draft.
 */
export type JsonSchema = {
  type?: string;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  additionalProperties?: boolean | JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
  // allow extension
  [key: string]: unknown;
};

/**
 * Standard Schema spec v1 (subset) — https://github.com/standard-schema/standard-schema
 * We support any object that exposes `~standard`.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => { value: Output } | { issues: Array<{ message: string; path?: (string | number)[] }> };
    readonly types?: {
      readonly input: Input;
      readonly output: Output;
    };
  };
}

// Per-field definition — either a partial JSON Schema or a StandardSchema for that field.
// Corrected per review §5: don't reinvent, use Partial<JsonSchema>.
// Per decision "both": whole `schema` + per-field StandardSchema supported.
export type FieldDef = Partial<JsonSchema>;
export type FieldDefOrSchema = FieldDef | StandardSchemaV1;

// WebMCP annotations — extensible record per §7
export type WebMCPAnnotations = Record<string, unknown> & {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  openWorldHint?: boolean;
  title?: string;
};

// Tool contract — what is registered with document.modelContext
export type ToolContract = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: WebMCPAnnotations;
};

// Forward-declare hooks type to avoid circular import at runtime (type-only)
import type { WebMCPHooks } from './hooks/types.js';

// Options for webmcp(fn, opts)
// Corrected per §6: single `schema` + `outputSchema`, no `inputSchema` alias.
// Hierarchy (§4 fix): 1. schema → 2. inferred → 3. fields patch → 4. metadata
export type WebMCPOptions<F extends (...args: any) => any> = {
  /** Override tool name. Default: fn.name → snake_case */
  name?: string;
  /** Override description. Default: JSDoc or '' + dev warn */
  description?: string;
  /**
   * Whole input schema — StandardSchema (Zod, Valibot, ArkType, etc) or JSON Schema.
   * When provided, this establishes the contract. `fields` then patches it.
   */
  schema?: JsonSchema | StandardSchemaV1;
  /** Same as `schema` internal alias is not needed externally — deprecated */
  /** Output schema (optional, not validated v0.1) */
  outputSchema?: JsonSchema | StandardSchemaV1;
  /**
   * Per-field patch — most useful for adding descriptions/min/max without rewriting whole schema.
   * Values can be Partial<JsonSchema> or StandardSchema (per-field Zod).
   */
  fields?: Record<string, FieldDefOrSchema>;
  /** Annotations forwarded to WebMCP (readOnlyHint, etc) — extensible */
  annotations?: WebMCPAnnotations;
  /** Scope — global registers immediately, scoped requires useWebMCP, manual requires explicit register() */
  scope?: 'global' | 'scoped' | 'manual';
  /** Alias for scope='global' */
  global?: boolean;
  /** Enable/disable registration (default true) */
  enabled?: boolean;
  /** If true, ambiguous inference throws instead of warn */
  strict?: boolean;
  /** Lifecycle hooks — before/after/error/denied (agent execute only, not direct call) */
  hooks?: WebMCPHooks<F>;
  /**
   * Legacy internal — not public in 0.1. Prefer single object param fn(input).
   * Kept for internal use by .bind() defer candidate.
   */
  // argMode?: 'object' | 'spread' | 'auto'
};

// Callable tool returned by webmcp(fn, opts)
// Keeps callable identity per thesis (§21) — F & additional props.
export type WebMCPTool<F extends (...args: any) => any> = F & {
  readonly __webmcpBrand: true;
  readonly tool: ToolContract;
  readonly definition: ToolContract;
  /** Async register — returns unregister fn */
  register: (opts?: { signal?: AbortSignal }) => Promise<() => void>;
  /** Unregister (sync convenience) */
  unregister: () => void;
  /** Current status */
  readonly status: RegistrationStatus;
  /** Promise for pending registration */
  readonly registration: Promise<void> | null;
  isRegistered: () => boolean;
  // internal: original fn
  readonly __fn: F;
  // internal: standard schemas for validation if provided
  readonly __standardSchema?: StandardSchemaV1;
  readonly __outputStandardSchema?: StandardSchemaV1;
  // internal: hooks (tool-level) and merged scoped hooks
  readonly __hooks?: WebMCPHooks<F>;
  readonly __webmcpOptions?: WebMCPOptions<F>;
  readonly __activeSignal?: AbortSignal;
  readonly __scopeHooks?: WebMCPHooks<any>;
};

export type RegistrationStatus = 'unregistered' | 'registering' | 'registered' | 'unregistering' | 'error' | 'unsupported';

// Global registry shape for modelContext
// We intentionally use `any` for document to avoid lib.dom hard dep.
export type ModelContextLike = {
  registerTool: (
    def: { name: string; description?: string; inputSchema?: JsonSchema; outputSchema?: JsonSchema; annotations?: WebMCPAnnotations; execute: (args: unknown, ctx?: unknown) => unknown },
    opts?: { signal?: AbortSignal },
  ) => Promise<void>;
};

// Infer helper — used internally
export type InferOptions = {
  strict?: boolean;
};
