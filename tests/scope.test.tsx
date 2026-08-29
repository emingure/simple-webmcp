import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { webmcp } from '../src/index.js';
import { Scope } from '../src/react/Scope.js';
import { registry } from '../src/internal/registry.js';

function mockModelContext() {
  const registerTool = vi.fn(async (def: any, opts?: any) => {
    if (opts?.signal?.aborted) throw new DOMException('abort', 'AbortError');
  });
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

describe('Scope', () => {
  beforeEach(() => registry.clear());
  afterEach(() => clearMock());

  it('registers all tools while mounted, unregisters on unmount', async () => {
    const { registerTool } = mockModelContext();
    const fn1 = ({ a }: { a: string }) => a;
    const fn2 = ({ b }: { b: string }) => b;
    const t1 = webmcp(fn1 as any, { name: 'scope_t1', description: 'd' });
    const t2 = webmcp(fn2 as any, { name: 'scope_t2', description: 'd' });

    const { unmount } = render(
      <Scope tools={[t1, t2]}>
        <div>children</div>
      </Scope>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(registerTool).toHaveBeenCalledTimes(2);
    expect(t1.status).toBe('registered');
    expect(t2.status).toBe('registered');

    unmount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(t1.status).toBe('unregistered');
    expect(t2.status).toBe('unregistered');
  });

  it('enabled false prevents registration', async () => {
    const { registerTool } = mockModelContext();
    const fn = ({ a }: { a: string }) => a;
    const t = webmcp(fn as any, { name: 'scope_disabled', description: 'd' });
    render(<Scope tools={[t]} enabled={false} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(registerTool).not.toHaveBeenCalled();
  });
});
