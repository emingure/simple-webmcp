'use client';

import React, { useMemo } from 'react';
import type { WebMCPTool } from '../types.js';
import { useWebMCP } from './useWebMCP.js';

export type ScopeProps = {
  tools: Array<WebMCPTool<any>>;
  enabled?: boolean;
  children?: React.ReactNode;
};

/**
 * React subtree scope — exposes tools while this component is mounted.
 * Maps cleanly onto WebMCP AbortSignal lifecycle.
 * Naturally gives route-level scope when placed in Next.js layout.tsx.
 */
function ToolRegistrar({ tool, enabled }: { tool: WebMCPTool<any>; enabled?: boolean }) {
  useWebMCP(tool as any, { enabled });
  return null;
}

export function Scope({ tools, enabled = true, children }: ScopeProps) {
  const normalized = useMemo(() => tools ?? [], [tools]);
  return (
    <>
      {normalized.map((t, i) => (
        <ToolRegistrar key={(t as any)?.tool?.name ?? (t as any)?.definition?.name ?? `tool-${i}`} tool={t} enabled={enabled} />
      ))}
      {children}
    </>
  );
}

// Also export as WebMCP.Scope style
export const WebMCPScope = Scope;
