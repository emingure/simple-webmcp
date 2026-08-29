import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { StrictMode } from 'react';
import { render, act } from '@testing-library/react';
import { webmcp } from '../src/index.js';
import { useWebMCP } from '../src/react/index.js';
import { registry } from '../src/internal/registry.js';

function mockModelContext() {
  const registerTool = vi.fn(async (def: any, opts?: any) => {
    if (opts?.signal?.aborted) throw new DOMException('abort', 'AbortError');
  });
  // Keep jsdom document intact, just patch modelContext
  const docAny = globalThis.document as any;
  if (docAny) docAny.modelContext = { registerTool };
  else (globalThis as any).document = { modelContext: { registerTool } } as any;
  return { registerTool };
}
function clearMock() {
  const docAny = globalThis.document as any;
  if (docAny && 'modelContext' in docAny) delete docAny.modelContext;
  registry.clear();
}

function TestComponent({ tool, enabled }: { tool: any; enabled?: boolean }) {
  const { registered, error, status, supported } = useWebMCP(tool, { enabled });
  return (
    <div data-testid="status" data-registered={String(registered)} data-status={status} data-supported={String(supported)} data-error={error?.message || ''} />
  );
}

describe('react useWebMCP', () => {
  beforeEach(() => registry.clear());
  afterEach(() => clearMock());

  it('registers on mount and unregisters on unmount', async () => {
    const { registerTool } = mockModelContext();
    const fn = ({ a }: { a: string }) => a;
    const tool = webmcp(fn as any, { name: 'react_mount', description: 'd' });

    const { unmount, container } = render(<TestComponent tool={tool} />);
    // wait for effect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(registerTool).toHaveBeenCalledTimes(1);
    // registered state should be true
    const el = container.querySelector('[data-testid="status"]');
    expect(el?.getAttribute('data-registered')).toBe('true');

    unmount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(tool.status).toBe('unregistered');
  });

  it('enabled false is inert', async () => {
    const { registerTool } = mockModelContext();
    const fn = ({ a }: { a: string }) => a;
    const tool = webmcp(fn as any, { name: 'react_disabled', description: 'd' });
    render(<TestComponent tool={tool} enabled={false} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(registerTool).not.toHaveBeenCalled();
  });

  it('handles StrictMode double mount deduplication', async () => {
    const { registerTool } = mockModelContext();
    const fn = ({ a }: { a: string }) => a;
    const tool = webmcp(fn as any, { name: 'strict_tool', description: 'd' });

    render(
      <StrictMode>
        <TestComponent tool={tool} />
      </StrictMode>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    // Should be only 1 registerTool call despite StrictMode double effect (deduped by registry)
    expect(registerTool).toHaveBeenCalledTimes(1);
  });

  it('raw function auto-wraps and registers (1-line)', async () => {
    const { registerTool } = mockModelContext();
    function plain({ a }: { a: string }) {
      return `hi ${a}`;
    }

    function RawComponent() {
      // 1-line: useWebMCP as hook that wraps + registers
      const tool = useWebMCP(plain as any, { description: 'd', name: 'plain_auto' });
      // tool should be callable and carry status
      return (
        <div
          data-testid="raw"
          data-type={typeof tool}
          data-callable={String(typeof tool === 'function')}
          data-registered={String(tool.registered)}
          data-name={(tool as any).tool?.name}
          data-result={(tool as any)({ a: 'x' })}
        />
      );
    }

    const { container } = render(<RawComponent />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: 'plain_auto' }), expect.any(Object));
    const el = container.querySelector('[data-testid="raw"]');
    expect(el?.getAttribute('data-type')).toBe('function');
    expect(el?.getAttribute('data-callable')).toBe('true');
    expect(el?.getAttribute('data-registered')).toBe('true');
    expect(el?.getAttribute('data-name')).toBe('plain_auto');
    expect(el?.getAttribute('data-result')).toBe('hi x');
  });

  it('useTool alias works same as useWebMCP', async () => {
    const { registerTool } = mockModelContext();
    const { useTool } = await import('../src/react/index.js');
    function fn({ a }: { a: string }) {
      return a;
    }
    function AliasComponent() {
      const tool = (useTool as any)(fn as any, { description: 'd', name: 'alias_tool' });
      return <div data-testid="alias" data-registered={String(tool.registered)} />;
    }
    const { container } = render(<AliasComponent />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="alias"]')?.getAttribute('data-registered')).toBe('true');
  });
});
