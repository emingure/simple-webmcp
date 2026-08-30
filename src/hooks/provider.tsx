'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { WebMCPHooks } from './types.js';

const WebMCPHooksContext = createContext<WebMCPHooks<any>>({});

export type WebMCPProviderProps = {
  hooks?: WebMCPHooks<any>;
  children?: React.ReactNode;
};

/**
 * Scoped hook provider — nests via merging arrays.
 * Usage:
 *   <WebMCPProvider hooks={{before:[addTenant]}}>
 *     <Scope tools={[tool]}>...</Scope>
 *   </WebMCPProvider>
 *
 * Nesting is additive:
 *   <WebMCPProvider hooks={{before:[a]}}>
 *     <WebMCPProvider hooks={{before:[b]}}> // merged before = [a,b]
 *     </WebMCPProvider>
 *   </WebMCPProvider>
 */
export function WebMCPProvider({ hooks, children }: WebMCPProviderProps) {
  const parent = useContext(WebMCPHooksContext);
  const merged = useMemo<WebMCPHooks<any>>(() => {
    if (!hooks) return parent;
    if (!parent || Object.keys(parent).length === 0) return hooks;
    return {
      before: [...(parent.before ?? []), ...(hooks.before ?? [])],
      after: [...(parent.after ?? []), ...(hooks.after ?? [])],
      error: [...(parent.error ?? []), ...(hooks.error ?? [])],
      denied: [...(parent.denied ?? []), ...(hooks.denied ?? [])],
    };
  }, [parent, hooks]);

  return (
    <WebMCPHooksContext.Provider value={merged}>
      {children}
    </WebMCPHooksContext.Provider>
  );
}

export function useWebMCPHooksContext(): WebMCPHooks<any> {
  return useContext(WebMCPHooksContext);
}

// Export context for internal use by useWebMCP
export { WebMCPHooksContext };
