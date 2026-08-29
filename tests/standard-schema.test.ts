import { describe, it, expect } from 'vitest';
import { webmcp } from '../src/index.js';
import '../src/zod.js'; // enables Zod → JSON conversion (side-effect). Without this, core falls back to {type:'string'} placeholder.

// Minimal StandardSchema mock helpers — like Zod/Valibot without importing real lib.
// Real libs implement `~standard.validate`.

function makeStringSchema(describe?: string) {
  return {
    '~standard': {
      version: 1 as const,
      vendor: 'test',
      validate: (v: unknown) => (typeof v === 'string' ? { value: v as string } : { issues: [{ message: 'not string' }] }),
    },
    _def: { typeName: 'ZodString', description: describe },
    description: describe,
    // marker for zodLike check
    _zod: { traits: { type: 'string' } },
  } as any;
}

function makeZodStringLike() {
  return {
    '~standard': {
      version: 1 as const,
      vendor: 'zod',
      validate: (v: unknown) => (typeof v === 'string' ? { value: v as string } : { issues: [{ message: 'expected string' }] }),
    },
    _def: { typeName: 'ZodString', checks: [] },
    description: undefined,
    _zod: undefined,
  } as any;
}

function makeZodObjectLike() {
  // Simulate ZodObject with shape
  const querySchema = {
    _def: { typeName: 'ZodString', description: 'query desc' },
    description: 'query desc',
  };
  const limitSchema = {
    _def: { typeName: 'ZodNumber' },
  };
  return {
    '~standard': {
      version: 1 as const,
      vendor: 'zod',
      validate: (v: unknown) => ({ value: v as any }),
    },
    _def: {
      typeName: 'ZodObject',
      shape: () => ({ query: querySchema, limit: limitSchema }),
    },
  } as any;
}

describe('standard-schema', () => {
  it('per-field StandardSchema (zod-like) converts to json', () => {
    async function search({ query }: { query: string }) {}
    const zStr = makeZodStringLike();
    const tool = webmcp(search as any, {
      description: 'Search',
      fields: {
        query: zStr,
      },
    });
    // Should have converted to {type:'string'}
    expect(tool.tool.inputSchema.properties?.query).toMatchObject({ type: 'string' });
  });

  it('whole schema as StandardSchema (zod object) is kept', () => {
    async function search(input: any) {}
    const zodObj = makeZodObjectLike();
    const tool = webmcp(search as any, {
      description: 'Search',
      schema: zodObj,
    });
    // ZodObject should convert to object with properties
    expect(tool.tool.inputSchema.type).toBe('object');
    expect(tool.tool.inputSchema.properties?.query).toBeDefined();
  });

  it('fields patch can mix json and StandardSchema', () => {
    async function fn({ query, limit }: { query: string; limit?: number }) {}
    const zStr = makeZodStringLike();
    const tool = webmcp(fn as any, {
      description: 'd',
      fields: {
        query: zStr, // StandardSchema
        limit: { type: 'integer', minimum: 1, maximum: 50 }, // FieldDef
      },
    });
    expect(tool.tool.inputSchema.properties?.query).toMatchObject({ type: 'string' });
    expect(tool.tool.inputSchema.properties?.limit).toMatchObject({ type: 'integer', maximum: 50 });
  });

  it('json schema passthrough unchanged', () => {
    function fn({ a }: { a: string }) {}
    const json = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] };
    const tool = webmcp(fn as any, { description: 'd', schema: json as any });
    expect(tool.tool.inputSchema).toEqual(json);
  });
});
