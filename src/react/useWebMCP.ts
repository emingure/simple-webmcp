'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import type { WebMCPTool, WebMCPOptions } from '../types.js';
import { isWebMCPSupported } from '../internal/utils.js';
import { webmcp } from '../webmcp.js';
import { useWebMCPHooksContext } from '../hooks/provider.js';

function isTool<F extends (...a: any) => any>(v: WebMCPTool<F> | F): v is WebMCPTool<F> {
  return !!(v as any)?.__webmcpBrand;
}

export type UseWebMCPResult = {
  supported: boolean;
  registered: boolean;
  error: Error | null;
  isPolyfilled: boolean;
  status: 'unregistered' | 'registering' | 'registered' | 'error' | 'unsupported';
};

// Overloads
export function useWebMCP<F extends (...args: any) => any>(
  tool: WebMCPTool<F>,
  opts?: { enabled?: boolean },
): UseWebMCPResult;
export function useWebMCP<F extends (...args: any) => any>(
  fn: F,
  opts?: WebMCPOptions<F> & { enabled?: boolean },
): WebMCPTool<F> & UseWebMCPResult;
export function useWebMCP<F extends (...args: any) => any>(
  arg: WebMCPTool<F> | F,
  opts?: any,
): UseWebMCPResult | (WebMCPTool<F> & UseWebMCPResult) {
  const enabled = opts?.enabled ?? true;
  const scopedHooks = useWebMCPHooksContext();

  // Determine if arg is raw function vs already-wrapped tool
  const isRawFunction = useMemo(() => {
    return typeof arg === 'function' && !isTool(arg as any);
  }, [arg]);

  // For raw function, create (and memoize) a tool. For already-wrapped, use it directly.
  // We separate webmcp options from hook options (enabled).
  // Deps are granular to keep tool stable when caller passes inline opts with same values.
  const tool: WebMCPTool<F> = useMemo(() => {
    if (isRawFunction) {
      const { enabled: _e, ...webmcpOpts } = (opts ?? {}) as any;
      return webmcp(arg as F, webmcpOpts as WebMCPOptions<F>);
    }
    return arg as WebMCPTool<F>;
  }, [
    arg,
    isRawFunction,
    opts?.name,
    opts?.description,
    opts?.schema,
    opts?.fields,
    opts?.annotations,
    opts?.scope,
    opts?.global,
    opts?.strict,
    opts?.outputSchema,
    opts?.hooks,
    opts?.enabled,
  ]);

  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supported = useMemo(() => isWebMCPSupported(), []);
  const isPolyfilled = useMemo(() => {
    if (typeof document === 'undefined') return false;
    const docAny = document as any;
    return !!docAny.modelContext?._isPolyfill;
  }, [supported]);

  const toolRef = useRef(tool);
  toolRef.current = tool;

  // Attach scoped hooks (from WebMCPProvider) to tool for engine to pick up.
  // Mutate per-instance so createHookedExecute closure (in webmcp.ts) sees it.
  // Note: scoped hooks are stored on the tool instance (global per tool) — if the same
  // tool is mounted under two different providers simultaneously, last write wins.
  // For isolation, create separate tool instances per scope.
  // Cooperative signal path uses tool.__activeSignal set by register().
  useEffect(() => {
    const t: any = toolRef.current;
    const hasScoped = scopedHooks && Object.keys(scopedHooks).length > 0;
    if (hasScoped) t.__scopeHooks = scopedHooks;
    else if (t.__scopeHooks) delete t.__scopeHooks;
    return () => {
      // Cleanup on unmount / provider change — clear if still our scopedHooks
      const cur: any = t.__scopeHooks;
      if (cur === scopedHooks) {
        try { delete t.__scopeHooks; } catch {}
      }
    };
  }, [scopedHooks, tool]);

  // Also keep synchronous update for immediate register path (before effect fires)
  // This ensures first mount's register sees scoped hooks even before effect.
  if (scopedHooks && Object.keys(scopedHooks).length > 0) {
    (tool as any).__scopeHooks = scopedHooks;
  } else if ((tool as any).__scopeHooks) {
    // Clear if provider removed; keep until effect cleanup if inside provider
    // Do not delete here if effect will manage — but synchronous clear helps when provider removed synchronously
    if (!(scopedHooks && Object.keys(scopedHooks).length > 0)) {
      try { delete (tool as any).__scopeHooks; } catch {}
    }
  }

  useEffect(() => {
    if (!enabled) {
      setRegistered(false);
      setError(null);
      return;
    }

    const webTool = toolRef.current;

    if ((webTool as any).status === 'registered') {
      setRegistered(true);
      setError(null);
      return;
    }

    let cancelled = false;
    let unregister: (() => void) | null = null;
    const controller = new AbortController();

    webTool
      .register({ signal: controller.signal })
      .then((u) => {
        if (cancelled) {
          try { u(); } catch {}
          return;
        }
        unregister = u;
        setRegistered(true);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setRegistered(false);
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
      });

    return () => {
      cancelled = true;
      try { controller.abort(); } catch {}
      if (unregister) {
        try { unregister(); } catch {}
      } else {
        try { (webTool as any).unregister?.(); } catch {}
      }
      setRegistered(false);
    };
  }, [enabled, supported, tool]);

  const status = !supported ? 'unsupported' : error ? 'error' : registered ? 'registered' : enabled ? 'registering' : 'unregistered';
  const result: UseWebMCPResult = { supported: !!supported, registered, error, isPolyfilled, status: status as any };

  // For raw function case, return the tool augmented with status so callers get callable + state in one.
  // We create a new callable that delegates to the original tool, to avoid mutating the tool's
  // non-configurable (now configurable) status getter and to provide hook state alongside.
  if (isRawFunction) {
    const augmented: any = (...args: any[]) => (tool as any)(...args);
    // Copy tool's own props (brand, definition, register, etc.)
    Object.assign(augmented, tool);
    // Also copy prototype chain for instanceof checks
    Object.setPrototypeOf(augmented, Object.getPrototypeOf(tool));
    // Overlay hook result (supported, registered, error, isPolyfilled, status)
    for (const [k, v] of Object.entries(result)) {
      Object.defineProperty(augmented, k, {
        value: v,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    // Keep tool reference for advanced use
    Object.defineProperty(augmented, '__rawTool', {
      value: tool,
      writable: false,
      configurable: true,
      enumerable: false,
    });
    return augmented as WebMCPTool<F> & UseWebMCPResult;
  }
  return result;
}

// Alias — `useTool` is the same as `useWebMCP` when given a raw function.
// Provides the 1-line ergonomic: const tool = useTool(fn, opts) -> visible by default.
export const useTool = useWebMCP;
