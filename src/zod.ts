/**
 * simple-webmcp/zod — optional Zod → JSON Schema converter
 * Importing this registers a global converter so `webmcp(fn, {schema: z.object(...)})`
 * and per-field `fields: {query: z.string()}` just work without manual conversion.
 *
 * Usage:
 *   import 'simple-webmcp/zod'; // side-effect — enables Zod in core
 *   import { zodToJsonSchema } from 'simple-webmcp/zod'; // or manual convert
 *
 * Keep this separate from core to hit 3KB gz target (core no Zod).
 */

import type { JsonSchema } from './types.js';
import { registerZodConverter } from './internal/schema.js';

function convertZodDef(z: any): JsonSchema {
  const def = z._def ?? z.def ?? z._zod?.def ?? null;
  const typeName: string | undefined = def?.typeName ?? z._zod?.traits?.type ?? z.typeName ?? undefined;
  const ctor = z.constructor?.name || '';

  if (typeName === 'ZodOptional' || ctor === 'ZodOptional') {
    const inner = z.unwrap?.() ?? def?.innerType ?? def?.type ?? null;
    if (inner) return convertZodDef(inner);
  }
  if (typeName === 'ZodDefault' || ctor === 'ZodDefault') {
    const inner = def?.innerType ?? z._def?.innerType ?? null;
    const json = inner ? convertZodDef(inner) : ({ type: 'string' } as JsonSchema);
    const defVal = typeof def?.defaultValue === 'function' ? def.defaultValue() : def?.defaultValue;
    if (defVal !== undefined) (json as any).default = defVal;
    return json;
  }
  if (typeName === 'ZodNullable' || ctor === 'ZodNullable') {
    const inner = def?.innerType ?? null;
    const json = inner ? convertZodDef(inner) : ({ type: 'string' } as JsonSchema);
    return json;
  }
  if (typeName === 'ZodEffects' || ctor === 'ZodEffects') {
    const inner = def?.schema ?? null;
    if (inner) return convertZodDef(inner);
  }

  if (typeName === 'ZodString' || ctor === 'ZodString') {
    const j: JsonSchema = { type: 'string' };
    if (def?.checks) {
      for (const c of def.checks) {
        if (c.kind === 'min') j.minLength = c.value;
        if (c.kind === 'max') j.maxLength = c.value;
        if (c.kind === 'regex') j.pattern = c.regex?.source;
        if (c.kind === 'email') j.format = 'email';
        if (c.kind === 'url') j.format = 'uri';
        if (c.kind === 'uuid') j.format = 'uuid';
      }
    }
    if (z.description) j.description = z.description;
    else if (def?.description) j.description = def.description;
    return j;
  }
  if (typeName === 'ZodNumber' || ctor === 'ZodNumber') {
    const j: JsonSchema = { type: 'number' };
    if (def?.checks) {
      for (const c of def.checks) {
        if (c.kind === 'min') j.minimum = c.value;
        if (c.kind === 'max') j.maximum = c.value;
        if (c.kind === 'int') j.type = 'integer';
      }
    }
    if (z.description) j.description = z.description;
    return j;
  }
  if (typeName === 'ZodBoolean' || ctor === 'ZodBoolean') return { type: 'boolean' };
  if (typeName === 'ZodBigInt' || ctor === 'ZodBigInt') return { type: 'integer' };
  if (typeName === 'ZodDate' || ctor === 'ZodDate') return { type: 'string', format: 'date-time' };
  if (typeName === 'ZodEnum' || ctor === 'ZodEnum') {
    const values = def?.values ?? z._def?.values ?? z.options ?? [];
    return { type: 'string', enum: values };
  }
  if (typeName === 'ZodNativeEnum' || ctor === 'ZodNativeEnum') {
    const values = def?.values ? Object.values(def.values) : [];
    return { type: 'string', enum: values };
  }
  if (typeName === 'ZodLiteral' || ctor === 'ZodLiteral') {
    const val = def?.value ?? z.value;
    return { enum: [val] };
  }
  if (typeName === 'ZodArray' || ctor === 'ZodArray') {
    const inner = def?.type ?? def?.element ?? null;
    const items = inner ? convertZodDef(inner) : ({ type: 'string' } as JsonSchema);
    return { type: 'array', items };
  }
  if (typeName === 'ZodObject' || ctor === 'ZodObject') {
    let shape: Record<string, any> | undefined;
    try {
      shape = typeof z.shape === 'object' ? z.shape : def?.shape?.() ?? def?.shape ?? z._def?.shape?.() ?? undefined;
      if (typeof shape === 'function') shape = shape();
    } catch {}
    if (!shape) shape = def?.shape ?? {};
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(shape as Record<string, any>)) {
      const propJson = convertZodDef(v);
      properties[k] = propJson;
      const isOpt = (v as any)?._def?.typeName === 'ZodOptional' || (v as any)?.isOptional?.() === true;
      if (!isOpt) required.push(k);
      const desc = (v as any)?.description ?? (v as any)?._def?.description;
      if (desc && !properties[k].description) properties[k].description = desc;
    }
    const j: JsonSchema = { type: 'object', properties, required: required.length ? required : undefined, additionalProperties: false };
    return j;
  }
  if (typeName === 'ZodRecord' || ctor === 'ZodRecord') {
    return { type: 'object', additionalProperties: true };
  }
  if (typeName === 'ZodUnion' || ctor === 'ZodUnion') {
    const opts = def?.options ?? def?.types ?? [];
    return { anyOf: (opts as any[]).map((o) => convertZodDef(o)) };
  }
  if (typeName === 'ZodDiscriminatedUnion' || ctor === 'ZodDiscriminatedUnion') {
    const opts = def?.options ?? [];
    return { anyOf: (opts as any[]).map((o) => convertZodDef(o)) };
  }
  if (typeName === 'ZodIntersection' || ctor === 'ZodIntersection') {
    const left = def?.left ?? null;
    const right = def?.right ?? null;
    const all = [left, right].filter(Boolean).map((o) => convertZodDef(o));
    return { allOf: all };
  }

  return { type: 'string' };
}

export function zodLikeToJsonSchema(schema: unknown): JsonSchema | null {
  const anyS = schema as any;
  if (!anyS || typeof anyS !== 'object') return null;
  const hasZodMarker = '_def' in anyS || '_zod' in anyS;
  if (!hasZodMarker) return null;
  try {
    return convertZodDef(anyS);
  } catch {
    return null;
  }
}

// Register globally so core `standardSchemaToJsonSchema` picks it up
registerZodConverter(zodLikeToJsonSchema);

// Also export helpers for manual use
export { convertZodDef };
export const zodToJsonSchema = zodLikeToJsonSchema;
export default zodLikeToJsonSchema;
