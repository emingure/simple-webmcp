import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { webmcp } from '../src/index.js';
import { registry } from '../src/internal/registry.js';
import { listTools, invokeTool, isSupported } from '../src/inspect.js';

function mockModelContext() {
  const registerTool = vi.fn(async (def: any, opts?: any) => {
    if (opts?.signal?.aborted) throw new DOMException('abort', 'AbortError');
  });
  (globalThis as any).document = { modelContext: { registerTool, getTools: () => [] } } as any;
  return { registerTool };
}
function clearMock() {
  const docAny = globalThis.document as any;
  if (docAny && 'modelContext' in docAny) delete docAny.modelContext;
  registry.clear();
}

describe('inspect', () => {
  beforeEach(() => registry.clear());
  afterEach(() => clearMock());

  it('listTools reflects registry + modelContext', async () => {
    mockModelContext();
    const fn = ({ a }: { a: string }) => `hi ${a}`;
    const tool = webmcp(fn as any, { name: 'inspect_tool', description: 'd' });
    expect(listTools()).toHaveLength(0);
    await tool.register();
    const listed = listTools();
    expect(listed.map((t) => t.name)).toContain('inspect_tool');
    expect(listed.find((t) => t.name === 'inspect_tool')?.status).toBe('registered');
    expect(listed.find((t) => t.name === 'inspect_tool')?.inputSchema).toBeDefined();
  });

  it('invokeTool via registry fallback', async () => {
    mockModelContext();
    const fn = ({ productId, quantity }: { productId: string; quantity: number }) => ({ ok: true, productId, quantity });
    const tool = webmcp(fn as any, {
      name: 'invoke_tool',
      description: 'd',
      schema: { type: 'object', properties: { productId: { type: 'string' }, quantity: { type: 'number' } }, required: ['productId', 'quantity'] },
    });
    await tool.register();
    const res: any = await invokeTool('invoke_tool', { productId: 'p1', quantity: 2 });
    // via registry's wrappedExecute -> normalized result
    expect(res.content[0].text).toContain('p1');
  });

  it('isSupported reflects document', () => {
    clearMock();
    expect(isSupported()).toBe(false);
    mockModelContext();
    expect(isSupported()).toBe(true);
  });
});
