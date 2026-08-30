import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { webmcp, resetGlobalHooks, getGlobalHooks, genInvocationId } from '../src/index.js';
import { registry } from '../src/internal/registry.js';
import { mergeHooksOrdered } from '../src/hooks/config.js';

function mockModelContext() {
  const registerTool = vi.fn(async (def: any, opts?: any) => {
    if (opts?.signal?.aborted) throw new DOMException('abort', 'AbortError');
    (globalThis as any)._capturedExecute = def.execute;
    (globalThis as any)._capturedDef = def;
  });
  const docAny = globalThis.document as any;
  if (docAny) docAny.modelContext = { registerTool };
  else (globalThis as any).document = { modelContext: { registerTool } } as any;
  return { registerTool };
}
function clearMock() {
  const docAny = globalThis.document as any;
  if (docAny && 'modelContext' in docAny) delete docAny.modelContext;
  delete (globalThis as any)._capturedExecute;
  delete (globalThis as any)._capturedDef;
  registry.clear();
  resetGlobalHooks();
}

describe('hooks core', () => {
  beforeEach(() => {
    registry.clear();
    resetGlobalHooks();
  });
  afterEach(() => clearMock());

  it('before hooks mutate input in order', async () => {
    mockModelContext();
    const fn = ({ x }: { x: number }) => x * 2;
    const tool = webmcp(fn as any, {
      name: 'hook_before_chain',
      description: 'd',
      hooks: {
        before: [
          ({ input }) => ({ input: { x: (input as any).x + 1 } }),
          ({ input }) => ({ input: { x: (input as any).x * 3 } }),
        ],
      },
    });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute as (a: any) => Promise<any>;
    const res = await exec({ x: 2 }); // 2+1=3*3=9*2=18
    expect(res.content[0].text).toContain('18');
  });

  it('after hooks mutate output in order', async () => {
    mockModelContext();
    const fn = ({ a }: { a: string }) => `hello ${a}`;
    const tool = webmcp(fn as any, {
      name: 'hook_after_chain',
      description: 'd',
      hooks: {
        after: [
          ({ output }) => ({ output: (output as string).toUpperCase() }),
          ({ output }) => ({ output: `${output}!!!` }),
        ],
      },
    });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    const res = await exec({ a: 'world' });
    expect(res.content[0].text).toContain('HELLO WORLD!!!');
  });

  it('before deny stops fn and runs denied, after not run', async () => {
    mockModelContext();
    let afterRan = false;
    let deniedRan = false;
    const tool = webmcp(({ a }: { a: string }) => a, {
      name: 'hook_deny',
      description: 'd',
      hooks: {
        before: [async ({ input }) => {
          if ((input as any).a === 'blocked') return { action: 'deny' as const, message: 'User declined', code: 'USER_DENIED' };
        }],
        after: [() => { afterRan = true; return { output: 'bad' as any }; }],
        denied: [({ reason, code }) => { deniedRan = true; expect(reason).toBe('User declined'); expect(code).toBe('USER_DENIED'); }],
      },
    });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    const deniedRes = await exec({ a: 'blocked' });
    expect(deniedRes.isError).toBe(true);
    expect(deniedRes.content[0].text).toContain('User declined');
    expect(deniedRes.code).toBe('USER_DENIED');
    expect(afterRan).toBe(false);
    expect(deniedRan).toBe(true);

    afterRan = false;
    deniedRan = false;
    const okRes = await exec({ a: 'ok' });
    expect(okRes.isError).toBeUndefined();
    expect(okRes.content[0].text).toContain('bad'); // after transforms to 'bad'
    expect(afterRan).toBe(true); // after runs on success
    expect(deniedRan).toBe(false);
  });

  it('fn throw triggers error hooks observational', async () => {
    mockModelContext();
    let errorHookCalled = false;
    const tool = webmcp(({ a }: { a: string }) => { throw new Error('boom'); }, {
      name: 'hook_error_fn',
      description: 'd',
      hooks: { error: [({ error }) => { errorHookCalled = true; expect((error as Error).message).toContain('boom'); }] },
    });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    const res = await exec({ a: 'x' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('boom');
    expect(errorHookCalled).toBe(true);
  });

  it('error hook throw is swallowed and next error hook still runs', async () => {
    mockModelContext();
    let secondCalled = false;
    const tool = webmcp(({ a }: { a: string }) => { throw new Error('fn boom'); }, {
      name: 'hook_error_swallow',
      description: 'd',
      hooks: { error: [() => { throw new Error('first boom'); }, () => { secondCalled = true; }] },
    });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    const res = await exec({ a: 'x' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('fn boom');
    expect(secondCalled).toBe(true);
  });

  it('before hook throw triggers error hooks and does not call fn', async () => {
    mockModelContext();
    let errorHook = false;
    let fnCalled = false;
    const tool = webmcp(({ a }: { a: string }) => { fnCalled = true; return a; }, {
      name: 'hook_before_throw',
      description: 'd',
      hooks: {
        before: [() => { throw new Error('before boom'); }],
        error: [() => { errorHook = true; }],
      },
    });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    const res = await exec({ a: 'x' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('before boom');
    expect(errorHook).toBe(true);
    expect(fnCalled).toBe(false);
  });

  it('after hook throw triggers error hooks', async () => {
    mockModelContext();
    let errorCalled = false;
    const tool = webmcp(({ a }: { a: string }) => 'ok', {
      name: 'hook_after_throw',
      description: 'd',
      hooks: {
        after: [() => { throw new Error('after boom'); }],
        error: [() => { errorCalled = true; }],
      },
    });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    const res = await exec({ a: 'x' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('after boom');
    expect(errorCalled).toBe(true);
  });

  it('metadata is mutable shared bag across before→after', async () => {
    mockModelContext();
    const tool = webmcp(({ a }: { a: string }) => a, {
      name: 'hook_metadata',
      description: 'd',
      hooks: {
        before: [({ metadata }) => { metadata.start = 1; }],
        after: [({ metadata, output }) => ({ output: `${output}${(metadata as any).start}` as any })],
      },
    });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    const res = await exec({ a: '5' });
    expect(res.content[0].text).toContain('51');
  });

  it('direct call does not trigger hooks', async () => {
    let beforeCalled = false;
    const tool = webmcp(({ a }: { a: number }) => a + 1, {
      name: 'hook_direct',
      description: 'd',
      hooks: { before: [() => { beforeCalled = true; return { input: { a: 999 } }; }] },
    });
    const direct = tool({ a: 1 });
    expect(direct).toBe(2);
    expect(beforeCalled).toBe(false);
    // agent path still hooked
    mockModelContext();
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    const res = await exec({ a: 1 });
    expect(beforeCalled).toBe(true);
    expect(res.content[0].text).toContain('1000');
  });

  it('global hooks ordered before: global→tool and after: tool→global', async () => {
    mockModelContext();
    const order: string[] = [];
    webmcp.configure({ hooks: { before: [() => order.push('global-before')], after: [() => order.push('global-after')] } });
    const tool = webmcp(({ a }: { a: string }) => { order.push('fn'); return a; }, {
      name: 'hook_order',
      description: 'd',
      hooks: { before: [() => order.push('tool-before')], after: [() => order.push('tool-after')] },
    });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    await exec({ a: 'x' });
    expect(order).toEqual(['global-before', 'tool-before', 'fn', 'tool-after', 'global-after']);
  });

  it('double wrap merges hooks concat', async () => {
    const fn = ({ a }: { a: string }) => a;
    const t1 = webmcp(fn as any, { name: 'hook_merge', description: 'd', hooks: { before: [() => {}] } });
    const t2 = webmcp(t1 as any, { hooks: { before: [() => {}] } });
    expect((t2 as any).__hooks.before.length).toBe(2);
  });

  it('validation runs after before enrichment', async () => {
    mockModelContext();
    const fakeStandard = {
      '~standard': {
        version: 1 as const,
        vendor: 'test',
        validate: (v: unknown) => {
          const a = (v as any)?.a;
          if (typeof a !== 'string' || a.length < 2) return { issues: [{ message: 'a too short' }] };
          return { value: v as any };
        },
      },
    };
    const tool = webmcp(({ a }: { a: string }) => `ok ${a}`, {
      name: 'hook_validation',
      description: 'd',
      schema: fakeStandard as any,
      hooks: { before: [({ input }) => ({ input: { a: (input as any).a + 'x' } })] },
    });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    const okRes = await exec({ a: 'a' }); // before makes 'ax' length2 passes
    expect(okRes.isError).toBeUndefined();
    expect(okRes.content[0].text).toContain('ok ax');
    const failRes = await exec({ a: '' }); // before makes 'x' length1 fails
    expect(failRes.isError).toBe(true);
    expect(failRes.content[0].text).toContain('Validation failed');
  });

  it('signal abort short-circuits before fn', async () => {
    mockModelContext();
    const tool = webmcp(({ a }: { a: string }) => a, { name: 'hook_abort', description: 'd' });
    await tool.register();
    const exec = (globalThis as any)._capturedExecute;
    const ac = new AbortController();
    ac.abort();
    (tool as any).__activeSignal = ac.signal;
    const res = await exec({ a: 'x' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Aborted');
  });

  it('invocationId unique and fallback works', async () => {
    const id1 = genInvocationId();
    const id2 = genInvocationId();
    expect(id1).not.toBe(id2);
    // fallback when crypto.randomUUID missing
    const orig = (globalThis.crypto as any)?.randomUUID;
    if (globalThis.crypto) {
      const cryptoAny = globalThis.crypto as any;
      const saved = cryptoAny.randomUUID;
      try { cryptoAny.randomUUID = undefined; } catch {}
      const fallback = genInvocationId();
      expect(fallback.startsWith('webmcp_')).toBe(true);
      try { cryptoAny.randomUUID = saved; } catch {}
      if (orig) expect(typeof orig).toBe('function');
    }
  });

  it('mergeHooksOrdered respects scoping', () => {
    const globalHooks = { before: [() => {}] } as any;
    const scopedHooks = { before: [() => {}] } as any;
    const toolHooks = { before: [() => {}] } as any;
    const merged = mergeHooksOrdered({ globalHooks, scopedHooks, toolHooks });
    expect(merged.before!.length).toBe(3);
    // after order tool→scoped→global
    const afterMerged = mergeHooksOrdered({ globalHooks: { after: [() => {}] } as any, scopedHooks: { after: [() => {}] } as any, toolHooks: { after: [() => {}] } as any });
    expect(afterMerged.after!.length).toBe(3);
  });
});
