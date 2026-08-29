import type { JsonSchema, ModelContextLike } from '../types.js';

/**
 * Convert camelCase / PascalCase to snake_case for tool naming.
 * searchCustomers → search_customers
 * SearchCustomers → search_customers
 */
export function toSnakeCase(name: string): string {
  if (!name) return 'anonymous_tool';
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'anonymous_tool';
}

/**
 * Totally minimal doc extraction — best effort.
 * Full JSDoc inference is build-time. Runtime we just note presence.
 */
export function getFunctionName(fn: Function): string {
  return (fn as any).displayName || fn.name || '';
}

/**
 * Check if WebMCP is supported (native or polyfilled)
 */
export function isWebMCPSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const docAny = document as any;
  return !!docAny.modelContext && typeof docAny.modelContext.registerTool === 'function';
}

export function getModelContext(): ModelContextLike | null {
  if (typeof document === 'undefined') return null;
  const docAny = document as any;
  if (docAny.modelContext && typeof docAny.modelContext.registerTool === 'function') {
    return docAny.modelContext as ModelContextLike;
  }
  return null;
}

/**
 * Heuristic check if value looks like JSON Schema (vs StandardSchema)
 */
export function looksLikeJsonSchema(value: unknown): value is JsonSchema {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  // JSON Schema typically has `type` at top, no `~standard`
  if ('~standard' in obj) return false;
  // Has type or properties or $ref etc
  return (
    'type' in obj ||
    'properties' in obj ||
    '$ref' in obj ||
    'anyOf' in obj ||
    'oneOf' in obj ||
    'allOf' in obj ||
    'enum' in obj
  );
}

/**
 * Check if value is StandardSchema
 */
export function isStandardSchema(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    '~standard' in (value as any) &&
    (value as any)['~standard']?.validate != null &&
    typeof (value as any)['~standard'].validate === 'function'
  );
}

/**
 * Cheap JSDoc/description fallback — runtime can't parse JSDoc,
 * but we check if fn has __webmcpDescription attached by build plugin or manual.
 */
export function getDescription(fn: Function, override?: string): string {
  if (override != null) return override;
  const anyFn = fn as any;
  if (typeof anyFn.__webmcpDescription === 'string') return anyFn.__webmcpDescription;
  // No JSDoc at runtime — return empty and warn elsewhere
  return '';
}

let warnedNoDesc = false;
export function warnNoDescription(fn: Function) {
  if (warnedNoDesc) return;
  // Only warn once per page load
  warnedNoDesc = true;
  if (typeof console !== 'undefined' && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      `[simple-webmcp] tool "${getFunctionName(fn) || 'anonymous'}" has no description. Add \`description:"..."\` or JSDoc. See https://github.com/emingure/simple-webmcp`,
    );
  } else if (typeof console !== 'undefined') {
    // In browser dev, also warn once
    // eslint-disable-next-line no-console
    console.warn(`[simple-webmcp] tool "${getFunctionName(fn) || 'anonymous'}" has no description.`);
  }
}
