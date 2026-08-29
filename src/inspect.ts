/**
 * simple-webmcp/inspect — programmatic inspect for registered tools.
 * Works with native WebMCP (document.modelContext) or dev shim / registry fallback.
 * Used by demo and devtools to list/invoke tools without an LLM.
 */

import type { ToolContract, RegistrationStatus } from './types.js';
import { registry } from './internal/registry.js';
import { getModelContext, isWebMCPSupported } from './internal/utils.js';

export type InspectedTool = ToolContract & {
  status: RegistrationStatus;
  registered: boolean;
  source: 'registry' | 'modelContext' | 'both';
};

function getModelContextAny(): any {
  return getModelContext() as any;
}

/**
 * List all tools known to this page — merges registry + modelContext.getTools().
 * Handles Chrome's `getTools()` / `listTools()` / shim variations.
 */
export function listTools(): InspectedTool[] {
  const map = new Map<string, InspectedTool>();

  // From registry (our wrapper, always available)
  for (const entry of registry.list()) {
    if (entry.contract) {
      map.set(entry.name, {
        ...entry.contract,
        status: entry.status,
        registered: entry.status === 'registered',
        source: 'registry',
      });
    }
  }

  // From native modelContext.getTools() / listTools() if available
  const mc: any = getModelContextAny();
  if (mc) {
    let nativeTools: any[] = [];
    try {
      if (typeof mc.getTools === 'function') {
        nativeTools = mc.getTools() ?? [];
        // getTools may be async in some specs
        if (nativeTools instanceof Promise) {
          // For sync listTools(), we can't await — caller can use listToolsAsync()
          nativeTools = [];
        }
      } else if (typeof mc.listTools === 'function') {
        nativeTools = mc.listTools() ?? [];
      }
    } catch {
      // ignore
    }
    for (const t of nativeTools) {
      if (!t?.name) continue;
      const existing = map.get(t.name);
      if (existing) {
        existing.source = 'both';
        // Prefer native status if registry says unregistered but native has it
        // Keep our contract's inputSchema as source of truth
      } else {
        map.set(t.name, {
          name: t.name,
          description: t.description ?? '',
          inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
          outputSchema: t.outputSchema,
          annotations: t.annotations,
          status: 'registered',
          registered: true,
          source: 'modelContext',
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Async variant that awaits native getTools() if it returns a promise.
 */
export async function listToolsAsync(): Promise<InspectedTool[]> {
  const sync = listTools();
  const mc: any = getModelContextAny();
  if (mc && typeof mc.getTools === 'function') {
    try {
      const native = await mc.getTools();
      if (Array.isArray(native)) {
        const map = new Map(sync.map((t) => [t.name, t]));
        for (const t of native) {
          if (!map.has(t.name)) {
            map.set(t.name, {
              name: t.name,
              description: t.description ?? '',
              inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
              outputSchema: t.outputSchema,
              annotations: t.annotations,
              status: 'registered',
              registered: true,
              source: 'modelContext',
            });
          }
        }
        return Array.from(map.values());
      }
    } catch {}
  }
  return sync;
}

export function getTool(name: string): InspectedTool | undefined {
  return listTools().find((t) => t.name === name);
}

/**
 * Invoke a tool by name with args. Tries in order:
 * 1. modelContext.executeTool / invokeTool / execute (native or shim)
 * 2. registry's stored execute (via our wrapper)
 */
export async function invokeTool(name: string, args: unknown): Promise<unknown> {
  const mc: any = getModelContextAny();

  // Try native modelContext invoke paths
  if (mc) {
    try {
      if (typeof mc.executeTool === 'function') {
        return await mc.executeTool(name, args);
      }
      if (typeof mc.invokeTool === 'function') {
        return await mc.invokeTool(name, args);
      }
      if (typeof mc.callTool === 'function') {
        return await mc.callTool(name, args);
      }
    } catch (e) {
      // Fall through to registry
      if ((e as any)?.name === 'NotFoundError' || /not found/i.test(String((e as any)?.message))) {
        // continue
      } else {
        throw e;
      }
    }
  }

  // Fallback: registry's stored execute (our wrapper's wrappedExecute)
  const entry = registry.get(name);
  if (entry?.execute) {
    return await entry.execute(args as any);
  }

  // Also try shim's direct invoke if modelContext is shim with _tools
  if (mc && mc._tools) {
    const toolsMap: Map<string, any> = mc._tools;
    const found = toolsMap.get(name);
    if (found?.def?.execute) {
      return await found.def.execute(args);
    }
  }

  throw new Error(`Tool "${name}" not found or not invokable in this environment`);
}

export function isSupported(): boolean {
  return isWebMCPSupported();
}

/**
 * Subscribe to tool changes. Uses `toolchange` event if available, otherwise polls registry.
 */
export function onToolsChanged(callback: (tools: InspectedTool[]) => void): () => void {
  let cancelled = false;
  const mc: any = getModelContextAny();

  // Native toolchange event (Chrome spec)
  if (mc && typeof mc.addEventListener === 'function') {
    const handler = () => {
      if (!cancelled) callback(listTools());
    };
    try {
      mc.addEventListener('toolchange', handler);
      return () => {
        cancelled = true;
        try { mc.removeEventListener('toolchange', handler); } catch {}
      };
    } catch {}
  }

  // Fallback: poll registry every 500ms
  const interval = setInterval(() => {
    if (!cancelled) callback(listTools());
  }, 500);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

// Re-export for convenience
export { registry };
