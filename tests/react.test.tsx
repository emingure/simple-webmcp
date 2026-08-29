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

  it('plain function warns and sets error', async () => {
    mockModelContext();
    function plain({ a }: { a: string }) {
      return a;
    }
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<TestComponent tool={plain as any} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const el = container.querySelector('[data-testid="status"]');
    expect(el?.getAttribute('data-error')).toContain('wrap fn with webmcp');
    consoleWarn.mockRestore();
  });
});
