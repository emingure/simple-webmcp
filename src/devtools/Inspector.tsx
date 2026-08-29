'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { listTools, invokeTool, onToolsChanged, isSupported, type InspectedTool } from '../inspect.js';

type Props = {
  /** If true, panel is expanded by default */
  defaultOpen?: boolean;
  /** Optional filter to show only specific tools */
  filter?: (tool: InspectedTool) => boolean;
};

function SchemaView({ schema }: { schema: any }) {
  if (!schema) return <span style={{ color: '#888' }}>—</span>;
  return (
    <pre style={{ background: '#0a0a0a', color: '#0f0', padding: 10, borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: 180, margin: '8px 0' }}>
      {JSON.stringify(schema, null, 2)}
    </pre>
  );
}

function ToolCard({ tool }: { tool: InspectedTool }) {
  const [argsText, setArgsText] = useState('{}');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const placeholder = useMemo(() => {
    const props = tool.inputSchema?.properties ?? {};
    const example: Record<string, any> = {};
    for (const [k, v] of Object.entries(props as Record<string, any>)) {
      if ((v as any).default !== undefined) example[k] = (v as any).default;
      else if ((v as any).type === 'string') example[k] = 'example';
      else if ((v as any).type === 'number' || (v as any).type === 'integer') example[k] = 1;
      else if ((v as any).type === 'boolean') example[k] = true;
      else example[k] = '';
    }
    return JSON.stringify(example, null, 2);
  }, [tool.inputSchema]);

  useEffect(() => {
    // Prefill with example if empty
    if (argsText === '{}' && placeholder !== '{}') setArgsText(placeholder);
  }, [placeholder]);

  const handleInvoke = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const args = argsText.trim() ? JSON.parse(argsText) : {};
      const res = await invokeTool(tool.name, args);
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 12, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{tool.name}</div>
          <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>{tool.description || <span style={{color:'#999'}}>No description</span>}</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
            <span style={{ background: tool.registered ? '#dcfce7' : '#fee2e2', padding: '2px 6px', borderRadius: 999 }}>{tool.status}</span>
            <span style={{ marginLeft: 6 }}>{tool.source}</span>
            {tool.annotations && Object.keys(tool.annotations).length > 0 && (
              <span style={{ marginLeft: 6, fontFamily: 'monospace' }}>{JSON.stringify(tool.annotations)}</span>
            )}
          </div>
        </div>
      </div>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, color: '#666' }}>inputSchema</summary>
        <SchemaView schema={tool.inputSchema} />
        {tool.outputSchema && (
          <>
            <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>outputSchema</div>
            <SchemaView schema={tool.outputSchema} />
          </>
        )}
      </details>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Invoke</div>
        <textarea
          value={argsText}
          onChange={(e) => setArgsText(e.target.value)}
          rows={4}
          placeholder={placeholder}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #ddd', background: '#fafafa' }}
        />
        <button
          onClick={handleInvoke}
          disabled={loading}
          style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, border: '1px solid #111', background: loading ? '#999' : '#111', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13 }}
        >
          {loading ? 'Invoking…' : `Invoke ${tool.name}`}
        </button>
        {error && (
          <pre style={{ background: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 8, marginTop: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>{error}</pre>
        )}
        {result !== null && !error && (
          <pre style={{ background: '#f0fdf4', color: '#065f46', padding: 10, borderRadius: 8, marginTop: 8, fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export function Inspector({ defaultOpen = true, filter }: Props) {
  const [tools, setTools] = useState<InspectedTool[]>(() => listTools());
  const [supported, setSupported] = useState<boolean>(() => isSupported());
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setSupported(isSupported());
    setTools(listTools());
    const off = onToolsChanged((t) => setTools(t));
    return off;
  }, []);

  const filtered = filter ? tools.filter(filter) : tools;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#f9fafb', maxWidth: 720 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ padding: '12px 16px', background: '#111', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ fontWeight: 700, fontSize: 13 }}>
          🔍 simple-webmcp Inspect — {filtered.length} tool{filtered.length !== 1 ? 's' : ''}
          <span style={{ fontWeight: 400, opacity: 0.8, marginLeft: 8, fontSize: 11 }}>
            {supported ? 'supported' : 'unsupported (dev shim)'}
          </span>
        </div>
        <div style={{ fontSize: 12 }}>{open ? '−' : '+'}</div>
      </div>

      {open && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
            Lists <code>registry.list()</code> + <code>document.modelContext.getTools()</code> (if native). Invoke calls <code>executeTool</code> / <code>invokeTool</code> / registry fallback. Works with `simple-webmcp/dev-polyfill` in dev.
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13, background: '#fff', borderRadius: 8, border: '1px dashed #ddd' }}>
              No tools registered yet. Mount a component with <code>useWebMCP(fn)</code> or call <code>tool.register()</code>.
            </div>
          ) : (
            filtered.map((t) => <ToolCard key={t.name} tool={t} />)
          )}

          <div style={{ fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center' }}>
            simple-webmcp inspect — <code>import {'{'}listTools, invokeTool{'}'} from 'simple-webmcp/inspect'</code>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inspector;
