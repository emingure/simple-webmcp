import { describe, it, expect, vi } from 'vitest';
import { webmcp } from '../src/index.js';
import { ConfigurationError } from '../src/errors.js';

describe('callable-wrapper', () => {
  it('returns callable that still invokes original fn', async () => {
    const add = (x: number, y: number) => x + y;
    // Use object param style per 0.1 preferred — but also test spread fallback
    const tool = webmcp(({ x, y }: { x: number; y: number }) => x + y, {
      name: 'add_numbers',
      description: 'Add',
      schema: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'] },
    });
    // callable
    expect(typeof tool).toBe('function');
    expect(tool({ x: 2, y: 3 })).toBe(5);
    expect((tool as any).__webmcpBrand).toBe(true);
    expect(tool.tool.name).toBe('add_numbers');
    expect(tool.definition.description).toBe('Add');
    // brand check
    expect((tool as any).__fn).toBeTypeOf('function');
  });

  it('preserves async and still awaitable', async () => {
    async function fetchUser({ id }: { id: string }) {
      return { id, name: 'Alice' };
    }
    const tool = webmcp(fetchUser, { description: 'fetch' });
    const res = await tool({ id: '1' });
    expect(res).toEqual({ id: '1', name: 'Alice' });
  });

  it('inferred name via snake_case', () => {
    function searchCustomers() {}
    const tool = webmcp(searchCustomers, { description: 'x' });
    expect(tool.tool.name).toBe('search_customers');
  });

  it('name override wins', () => {
    function foo() {}
    const tool = webmcp(foo, { name: 'custom_name', description: 'd' });
    expect(tool.tool.name).toBe('custom_name');
  });

  it('throws if fn not function', () => {
    expect(() => (webmcp as any)(null)).toThrow(ConfigurationError);
    expect(() => (webmcp as any)('string')).toThrow(ConfigurationError);
  });

  it('double wrap merges options', () => {
    function orig({ q }: { q: string }) {
      return q;
    }
    const t1 = webmcp(orig, { name: 'orig', description: 'a' });
    const t2 = webmcp(t1 as any, { description: 'b' } as any);
    expect(t2.tool.name).toBe('orig');
    expect(t2.tool.description).toBe('b');
  });

  it('webmcp.global sets global scope', async () => {
    const fn = ({ x }: { x: number }) => x;
    const tool = (webmcp as any).global(fn, { name: 'global_tool', description: 'd' });
    expect(tool.tool.name).toBe('global_tool');
    // global registers via queueMicrotask — in jsdom will attempt register
    // We can't fully test without mocking document.modelContext, but at least no throw
    expect(typeof tool.register).toBe('function');
    // cleanup
    tool.unregister();
  });

  it('strict throws on ambiguous inferred no fields/schema', () => {
    function noTypes(query: any) {}
    expect(() => webmcp(noTypes as any, { strict: true, description: 'd' })).toThrow(ConfigurationError);
  });

  it('toString delegated', () => {
    function myFn({ a }: { a: string }) {
      return a;
    }
    const t = webmcp(myFn, { description: 'd' });
    expect(t.toString()).toContain('myFn');
  });
});
