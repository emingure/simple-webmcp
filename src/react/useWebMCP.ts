'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import type { WebMCPTool } from '../types.js';
import { isWebMCPSupported } from '../internal/utils.js';
import { NotSupportedError } from '../errors.js';

// Check helper to see if value is a WebMCPTool
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

/**
 * Register a tool for the lifetime of the component.
 * Matches WebMCP spec AbortSignal lifecycle and StrictMode double-mount safety via dedup registry.
 *
 * @param tool - WebMCPTool from webmcp(fn) or raw fn (will warn and no-op)
 * @param opts.enabled - if false, inert
 */
export function useWebMCP<F extends (...args: any) => any>(
  tool: WebMCPTool<F> | F,
  opts?: { enabled?: boolean },
): UseWebMCPResult {
  const enabled = opts?.enabled ?? true;
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supported = useMemo(() => isWebMCPSupported(), []);
  // polyfill detection — if isWebMCPSupported true and shim marker present
  const isPolyfilled = useMemo(() => {
    if (typeof document === 'undefined') return false;
    const docAny = document as any;
    return !!docAny.modelContext?._isPolyfill;
  }, [supported]);

  const toolRef = useRef(tool);
  toolRef.current = tool;

  useEffect(() => {
    if (!enabled) {
      setRegistered(false);
      setError(null);
      return;
    }

    const t: any = toolRef.current as any;

    if (!isTool(t as any)) {
      // Plain fn passed — warn, optionally auto-wrap? For 0.1 we no-op with warning
      if (typeof console !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[simple-webmcp] useWebMCP expected webmcp(fn) tool, got plain function. Wrap with webmcp() first.');
      }
      setError(new Error('useWebMCP: wrap fn with webmcp() first'));
      setRegistered(false);
      return;
    }

    const webTool = t as WebMCPTool<F>;

    // If tool was created with global:true, it's already global — just track status
    // We still sync registered state
    if ((webTool as any).status === 'registered') {
      setRegistered(true);
      setError(null);
      return;
    }

    let cancelled = false;
    let unregister: (() => void) | null = null;

    // Async register — hook's job is to handle AbortSignal mapping
    const controller = new AbortController();

    webTool
      .register({ signal: controller.signal })
      .then((u) => {
        if (cancelled) {
          try {
            u();
          } catch {}
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
      try {
        controller.abort();
      } catch {}
      if (unregister) {
        try {
          unregister();
        } catch {}
      } else {
        // If registration still pending, ensure tool's own unregister clears
        try {
          (webTool as any).unregister?.();
        } catch {}
      }
      setRegistered(false);
    };
    // Re-run if tool identity changes or enabled
  }, [enabled, supported, tool]);

  const status = !supported ? 'unsupported' : error ? 'error' : registered ? 'registered' : enabled ? 'registering' : 'unregistered';

  return { supported: !!supported, registered, error, isPolyfilled, status: status as any };
}
