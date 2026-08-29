import { describe, it, expect } from 'vitest';
import { webmcp } from '../src/index.js';
import { applyFieldsPatch } from '../src/internal/schema.js';

describe('fields-patch', () => {
  it('merges FieldDef partial JsonSchema onto base', () => {
    const base = { type: 'object' as const, properties: { query: { type: 'string' as const } }, required: ['query'] };
    const patched = applyFieldsPatch(base as any, { query: { description: 'Customer name' } });
    expect(patched.properties?.query).toMatchObject({ type: 'string', description: 'Customer name' });
  });

  it('fields patch with type/min/max', () => {
    const base = { type: 'object', properties: {} as any, required: [] as any };
    const patched = applyFieldsPatch(base as any, { limit: { type: 'integer', minimum: 1, maximum: 50 } });
    expect(patched.properties?.limit).toMatchObject({ type: 'integer', minimum: 1, maximum: 50 });
    expect(patched.required).toContain('limit');
  });

  it('fields required false removes from required', () => {
    const base = { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } }, required: ['a', 'b'] };
    const patched = applyFieldsPatch(base as any, { b: { description: 'opt', required: false } as any });
    expect(patched.required).toEqual(['a']);
    expect((patched.properties?.b as any).required).toBeUndefined();
  });

  it('webmcp fields patch adds descriptions', () => {
    async function search({ query, limit }: { query: string; limit?: number }) {}
    const tool = webmcp(search as any, {
      description: 'Search',
      fields: {
        query: { description: 'Name or email' },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
    });
    expect(tool.tool.inputSchema.properties?.query).toMatchObject({ description: 'Name or email' });
    expect(tool.tool.inputSchema.properties?.limit).toMatchObject({ type: 'integer', minimum: 1, maximum: 50 });
  });

  it('fields with nested object', () => {
    function fn({ address }: { address?: { city: string; country: string } }) {}
    const tool = webmcp(fn as any, {
      description: 'd',
      fields: {
        address: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            country: { type: 'string' },
          },
          required: ['city', 'country'],
        } as any,
      },
    });
    expect(tool.tool.inputSchema.properties?.address).toMatchObject({ type: 'object' });
  });
});
