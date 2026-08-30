import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { webmcp, resetGlobalHooks } from '../src/index.js';
import { registry } from '../src/internal/registry.js';
import { WebMCPProvider } from '../src/hooks/provider.js';
import { useWebMCP } from '../src/react/index.js';

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

describe('hooks React provider', () => {
  beforeEach(() => {
    registry.clear();
    resetGlobalHooks();
  });
  afterEach(() => clearMock());

  it('scoped before/after ordering with global and tool', async () => {
    const { registerTool } = mockModelContext();
    const order: string[] = [];
    webmcp.configure({ hooks: { before: [() => order.push('global-before')], after: [() => order.push('global-after')] } });

    const fn = ({ a }: { a: string }) => { order.push('fn'); return a; };
    const tool = webmcp(fn as any, {
      name: 'react_hook_order',
      description: 'd',
      hooks: { before: [() => order.push('tool-before')], after: [() => order.push('tool-after')] },
    });

    function Inner({ tool }: any) {
      useWebMCP(tool);
      return null;
    }
    function App() {
      return (
        <WebMCPProvider hooks={{ before: [() => order.push('scoped-before')], after: [() => order.push('scoped-after')] }}>
          <Inner tool={tool} />
        </WebMCPProvider>
      );
    }
    render(<App />);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(registerTool).toHaveBeenCalledTimes(1);
    const exec = (globalThis as any)._capturedExecute;
    order.length = 0;
    await exec({ a: 'x' });
    expect(order).toEqual(['global-before', 'scoped-before', 'tool-before', 'fn', 'tool-after', 'scoped-after', 'global-after']);
  });

  it('provider nesting merges outer→inner', async () => {
    mockModelContext();
    const order: string[] = [];
    const fn = ({ a }: { a: string }) => a;
    const tool = webmcp(fn as any, { name: 'react_nest', description: 'd' });
    function Inner({ tool }: any) { useWebMCP(tool); return null; }
    function App() {
      return (
        <WebMCPProvider hooks={{ before: [() => order.push('outer')] }}>
          <WebMCPProvider hooks={{ before: [() => order.push('inner')] }}>
            <Inner tool={tool} />
          </WebMCPProvider>
        </WebMCPProvider>
      );
    }
    render(<App />);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    const exec = (globalThis as any)._capturedExecute;
    order.length = 0;
    await exec({ a: 'x' });
    expect(order).toEqual(['outer', 'inner']);
  });

  it('scoped hooks can mutate input', async () => {
    mockModelContext();
    const fn = ({ a, b }: { a: string; b: string }) => `${a}-${b}`;
    const tool = webmcp(fn as any, { name: 'react_scoped_mutate', description: 'd' });
    function Inner({ tool }: any) { useWebMCP(tool); return null; }
    function App() {
      return (
        <WebMCPProvider hooks={{ before: [({ input }: any) => ({ input: { ...(input as any), b: 'scoped' } })] }}>
          <Inner tool={tool} />
        </WebMCPProvider>
      );
    }
    render(<App />);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    const exec = (globalThis as any)._capturedExecute;
    const res = await exec({ a: 'hi', b: '' });
    expect(res.content[0].text).toContain('hi-scoped');
  });

  it('scoped deny triggers denied hooks', async () => {
    mockModelContext();
    let denied = false;
    const fn = ({ a }: { a: string }) => a;
    const tool = webmcp(fn as any, { name: 'react_scoped_deny', description: 'd', hooks: { denied: [() => { denied = true; }] } });
    function Inner({ tool }: any) { useWebMCP(tool); return null; }
    function App() {
      return (
        <WebMCPProvider hooks={{ before: [() => ({ action: 'deny' as const, message: 'nope' })] }}>
          <Inner tool={tool} />
        </WebMCPProvider>
      );
    }
    render(<App />);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    const exec = (globalThis as any)._capturedExecute;
    const res = await exec({ a: 'x' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('nope');
    expect(denied).toBe(true);
  });

  it('raw function with provider hooks also works', async () => {
    mockModelContext();
    const order: string[] = [];
    function rawFn({ a }: { a: string }) { order.push('fn'); return a; }
    function App() {
      useWebMCP(rawFn as any, { name: 'raw_provider', description: 'd' });
      return null;
    }
    function Wrapped() {
      return (
        <WebMCPProvider hooks={{ before: [() => order.push('scoped')] }}>
          <App />
        </WebMCPProvider>
      );
    }
    render(<Wrapped />);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    // find captured def
    const exec = (globalThis as any)._capturedExecute;
    order.length = 0;
    await exec({ a: 'x' });
    expect(order).toContain('scoped');
    expect(order).toContain('fn');
  });
});
