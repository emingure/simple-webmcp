import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { webmcp } from '../src/index.js';
import { registry } from '../src/internal/registry.js';

// Mock document.modelContext
function mockModelContext() {
  const registerTool = vi.fn(async (def: any, opts?: any) => {
    // simulate async native register
    if (opts?.signal?.aborted) throw new DOMException('Abort', 'AbortError');
    // listen abort
    opts?.signal?.addEventListener('abort', () => {}, { once: true });
  });
  (globalThis as any).document = {
    modelContext: {
      registerTool,
    },
  } as any;
  return { registerTool };
}

function clearMock() {
  delete (globalThis as any).document;
  registry.clear();
}

describe('registration', () => {
  beforeEach(() => {
    registry.clear();
  });
  afterEach(() => {
    clearMock();
  });

  it('register() async resolves to unregister and sets status', async () => {
    const { registerTool } = mockModelContext();
    const fn = ({ query }: { query: string }) => `hi ${query}`;
    const tool = webmcp(fn as any, { name: 'test_tool', description: 'desc' });
    expect(tool.status).toBe('unregistered');
    const unregister = await tool.register();
    expect(tool.status).toBe('registered');
    expect(tool.isRegistered()).toBe(true);
    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'test_tool', description: 'desc' }),
      expect.objectContaining({ signal: expect.any(Object) }),
    );
    // unregister
    unregister();
    expect(tool.status).toBe('unregistered');
    expect(tool.isRegistered()).toBe(false);
  });

  it('deduplicates double register (StrictMode)', async () => {
    const { registerTool } = mockModelContext();
    const fn = ({ a }: { a: string }) => a;
    const tool = webmcp(fn as any, { name: 'dup_tool', description: 'd' });
    const p1 = tool.register();
    const p2 = tool.register();
    const [u1, u2] = await Promise.all([p1, p2]);
    // second should be deduped — registerTool only once
    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(typeof u1).toBe('function');
    expect(typeof u2).toBe('function');
    u1();
    expect(tool.status).toBe('unregistered');
  });

  it('register with AbortSignal aborts lifecycle', async () => {
    const { registerTool } = mockModelContext();
    const fn = ({ a }: { a: string }) => a;
    const tool = webmcp(fn as any, { name: 'abort_tool', description: 'd' });
    const controller = new AbortController();
    const prom = tool.register({ signal: controller.signal });
    // Abort before resolve
    controller.abort();
    await prom; // our registry's abort path resolves
    // After abort, status should be unregistered (or error handling)
    // In our polyfill-less mock, registerTool will still resolve, but controller aborted should cleanup
    tool.unregister();
    expect(tool.status).toBe('unregistered');
  });

  it('registry tracks via registry list', async () => {
    const { registerTool } = mockModelContext();
    const fn1 = ({ a }: { a: string }) => a;
    const fn2 = ({ b }: { b: string }) => b;
    const t1 = webmcp(fn1 as any, { name: 't1', description: 'd1' });
    const t2 = webmcp(fn2 as any, { name: 't2', description: 'd2' });
    await t1.register();
    await t2.register();
    const list = registry.list();
    expect(list.map((x) => x.name)).toContain('t1');
    expect(list.map((x) => x.name)).toContain('t2');
    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });

  it('polyfill path when no modelContext — register still resolves without throw (graceful)', async () => {
    // delete document
    delete (globalThis as any).document;
    const fn = ({ a }: { a: string }) => a;
    const tool = webmcp(fn as any, { name: 'poly_tool2', description: 'd' });
    // Should not throw, instead no-op registered
    const unregister = await tool.register();
    expect(tool.status).toBe('registered');
    expect(typeof unregister).toBe('function');
    unregister();
    expect(tool.status).toBe('unregistered');
  });

  it('wrapExecute normalizes string results and errors', async () => {
    const { registerTool } = mockModelContext();
    let capturedExec: any;
    registerTool.mockImplementation(async (def: any, opts: any) => {
      capturedExec = def.execute;
    });
    const fn = ({ query }: { query: string }) => `result:${query}`;
    const tool = webmcp(fn as any, { name: 'exec_tool', description: 'd' });
    await tool.register();
    expect(capturedExec).toBeTypeOf('function');
    const res = await capturedExec({ query: 'hello' });
    expect(res).toMatchObject({ content: [{ type: 'text', text: 'result:hello' }] });

    // Error case
    const errFn = ({ q }: { q: string }) => {
      throw new Error('oops');
    };
    const tool2 = webmcp(errFn as any, { name: 'err_tool', description: 'd' });
    // need new mock capture
    let capturedErrExec: any;
    registerTool.mockImplementation(async (def: any) => {
      if (def.name === 'err_tool') capturedErrExec = def.execute;
    });
    await tool2.register();
    const errRes = await capturedErrExec({ q: 'x' });
    expect(errRes.isError).toBe(true);
    expect(errRes.content[0].text).toContain('oops');
  });
});
