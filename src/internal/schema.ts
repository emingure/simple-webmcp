import type { JsonSchema, StandardSchemaV1, FieldDefOrSchema } from '../types.js';
import { isStandardSchema, looksLikeJsonSchema } from './utils.js';

// Global registry key for optional Zod converter (split to keep core lean, no hard dep)
const ZOD_CONVERTER_KEY = '__simpleWebmcp_zodConverter';

type ZodConverter = (schema: unknown) => JsonSchema | null;

export function registerZodConverter(fn: ZodConverter): void {
  (globalThis as any)[ZOD_CONVERTER_KEY] = fn;
}

function getZodConverter(): ZodConverter | null {
  return (globalThis as any)[ZOD_CONVERTER_KEY] ?? null;
}

function zodLikeToJsonSchema(schema: unknown): JsonSchema | null {
  const conv = getZodConverter();
  if (conv) {
    try {
      return conv(schema);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Convert a StandardSchema (maybe Zod) to JSON Schema for WebMCP registration.
 * If conversion fails, returns null → caller uses fallback.
 * Core knows only JSON; Zod support is provided via `import 'simple-webmcp/zod'` which registers converter.
 */
export function standardSchemaToJsonSchema(schema: StandardSchemaV1): JsonSchema | null {
  const zodJson = zodLikeToJsonSchema(schema as unknown);
  if (zodJson) return zodJson;
  return null;
}

/**
 * Convert any `schema` option (JSON Schema or StandardSchema) to JSON Schema.
 * Returns { json, standard } where standard is kept for runtime validation if needed.
 */
export function normalizeSchemaInput(
  schema: JsonSchema | StandardSchemaV1 | undefined | null,
): { json: JsonSchema | null; standard: StandardSchemaV1 | null } {
  if (!schema) return { json: null, standard: null };
  if (looksLikeJsonSchema(schema)) {
    return { json: schema as JsonSchema, standard: null };
  }
  if (isStandardSchema(schema)) {
    const std = schema as StandardSchemaV1;
    const json = standardSchemaToJsonSchema(std);
    return { json, standard: std };
  }
  // If it's a plain object that looks like Zod but without ~standard (older Zod), try convert via registered converter
  const maybeZodJson = zodLikeToJsonSchema(schema as unknown);
  if (maybeZodJson) return { json: maybeZodJson, standard: isStandardSchema(schema) ? (schema as StandardSchemaV1) : null };
  // Unknown — treat as JSON if it has properties, else null
  if (typeof schema === 'object' && schema !== null) {
    // Could be JSON schema without explicit type — treat as json
    return { json: schema as unknown as JsonSchema, standard: null };
  }
  return { json: null, standard: null };
}

/**
 * Convert a field definition (Partial<JsonSchema> | StandardSchema) to JsonSchema fragment.
 */
export function fieldDefToJsonSchema(field: FieldDefOrSchema): JsonSchema {
  if (!field) return {};
  if (isStandardSchema(field)) {
    const json = standardSchemaToJsonSchema(field as StandardSchemaV1);
    if (json) return json;
    // Fallback: unknown standard field → placeholder object
    return { type: 'string' };
  }
  // It's a FieldDef (Partial<JsonSchema>)
  return field as JsonSchema;
}

/**
 * Merge `fields` patch onto base schema per corrected hierarchy:
 * base = schema (whole) or inferred; fields decorates it.
 */
export function applyFieldsPatch(base: JsonSchema, fields?: Record<string, FieldDefOrSchema>): JsonSchema {
  if (!fields || Object.keys(fields).length === 0) return base;
  const result: JsonSchema = {
    ...base,
    properties: { ...(base.properties || {}) },
    required: [...(base.required || [])],
  };
  if (!result.properties) result.properties = {};
  if (!result.required) result.required = [];

  for (const [key, field] of Object.entries(fields)) {
    const isStd = isStandardSchema(field);
    if (isStd) {
      const json = standardSchemaToJsonSchema(field as StandardSchemaV1);
      const fragment = json ?? { type: 'string' };
      result.properties[key] = fragment;
      const anyField = field as any;
      const isOpt = anyField?._def?.typeName === 'ZodOptional' || anyField?.isOptional?.() === true;
      if (!isOpt) {
        if (!result.required.includes(key)) result.required.push(key);
      } else {
        result.required = result.required.filter((k) => k !== key);
      }
      const desc = anyField?.description ?? anyField?._def?.description;
      if (desc && !(result.properties[key] as any).description) (result.properties[key] as any).description = desc;
    } else {
      const patch = field as JsonSchema;
      const existing = (result.properties[key] as JsonSchema) || {};
      const merged: JsonSchema = { ...existing, ...patch };
      result.properties[key] = merged;
      if ('required' in patch) {
        const req = (patch as any).required;
        if (req === false) {
          result.required = result.required.filter((k) => k !== key);
          delete (merged as any).required;
        } else if (req === true) {
          if (!result.required.includes(key)) result.required.push(key);
          delete (merged as any).required;
        }
      } else {
        if (!(key in (base.properties || {})) && !(patch as any).required) {
          const hasDefault = 'default' in patch;
          if (!hasDefault && !result.required.includes(key)) result.required.push(key);
        }
      }
    }
  }

  if (result.required && result.required.length === 0) delete (result as any).required;
  return result;
}

/**
 * Build final inputSchema per hierarchy:
 * 1. whole schema (schema) if json available → base
 * 2. else inferred schema
 * 3. then fields patch
 */
export function buildFinalInputSchema(opts: {
  wholeSchema?: JsonSchema | StandardSchemaV1;
  inferred: JsonSchema;
  fields?: Record<string, FieldDefOrSchema>;
}): { json: JsonSchema; standard: StandardSchemaV1 | null } {
  const wholeNorm = normalizeSchemaInput(opts.wholeSchema);
  let baseJson: JsonSchema;
  let standard: StandardSchemaV1 | null = wholeNorm.standard;

  if (wholeNorm.json) {
    baseJson = wholeNorm.json;
  } else if (wholeNorm.standard && !wholeNorm.json) {
    baseJson = opts.inferred;
  } else {
    baseJson = opts.inferred;
  }

  if (!baseJson.type) baseJson.type = 'object';
  if (!baseJson.properties) baseJson.properties = {};
  if (baseJson.additionalProperties == null) baseJson.additionalProperties = false;

  const patched = applyFieldsPatch(baseJson, opts.fields);

  return { json: patched, standard };
}

/**
 * Normalize outputSchema similarly but without fields
 */
export function normalizeOutputSchema(schema?: JsonSchema | StandardSchemaV1): { json?: JsonSchema; standard?: StandardSchemaV1 } {
  if (!schema) return {};
  const norm = normalizeSchemaInput(schema);
  if (norm.json) return { json: norm.json, standard: norm.standard ?? undefined };
  if (norm.standard) return { standard: norm.standard };
  return {};
}
