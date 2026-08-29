/**
 * simple-webmcp/polyfill — dev/testing shim (NOT a WebMCP interoperability polyfill).
 *
 * This is an in-memory registry for tests, Storybook, and local dev without Chrome.
 * It implements `registerTool`/`listTools`/`invokeTool` but not full MCP transport.
 *
 * For real cross-browser WebMCP (Firefox/Safari), use the dedicated
 * `@mcp-b/webmcp-polyfill` (https://www.npmjs.com/package/@mcp-b/webmcp-polyfill)
 * — ~6k weekly downloads, broader MCP ecosystem. Example:
 *   `npm i @mcp-b/webmcp-polyfill && import '@mcp-b/webmcp-polyfill'`
 *
 * In production Chrome with native `document.modelContext`, this is a no-op
 * (detected via native presence). Prefer the real polyfill for production
 * cross-browser, and this shim for testing.
 *
 * New aliases (preferred for clarity): `simple-webmcp/dev-polyfill` and
 * `simple-webmcp/testing` — same module, clearer intent. `simple-webmcp/polyfill`
 * is kept for backward compat but will be documented as dev shim.
 */

export type PolyfillOptions = {
  force?: boolean;
};

let installed = false;

export function installPolyfill(opts?: PolyfillOptions): boolean {
  if (installed && !opts?.force) return true;
  if (typeof document === 'undefined') return false;
  const docAny = document as any;
  if (docAny.modelContext && !opts?.force) {
    installed = true;
    return true;
  }

  // Minimal polyfill — tracks tools in memory, invokes via same ABI.
  // Not a full MCP transport; sufficient for registry + tests + devtools.
  const tools = new Map<
    string,
    {
      def: any;
      signal?: AbortSignal;
    }
  >();

  const polyfill = {
    _isPolyfill: true,
    _tools: tools,
    async registerTool(def: any, opts?: { signal?: AbortSignal }) {
      const name = def?.name;
      if (!name) throw new Error('registerTool: name required');
      if (tools.has(name)) {
        // Dedup like native — ignore second registration
        return;
      }
      tools.set(name, { def, signal: opts?.signal });
      if (opts?.signal) {
        const onAbort = () => {
          if (tools.get(name)?.signal === opts.signal) tools.delete(name);
        };
        if (opts.signal.aborted) {
          tools.delete(name);
        } else {
          opts.signal.addEventListener('abort', onAbort, { once: true });
        }
      }
    },
    listTools() {
      return Array.from(tools.values()).map((v) => v.def);
    },
    async invokeTool(name: string, args: unknown) {
      const entry = tools.get(name);
      if (!entry) throw new Error(`Tool ${name} not found`);
      return entry.def.execute(args);
    },
  };

  docAny.modelContext = polyfill;
  installed = true;
  return true;
}

export function isPolyfilled(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(document as any).modelContext?._isPolyfill;
}

// Auto-install side-effect import: `import 'simple-webmcp/polyfill'`
if (typeof document !== 'undefined') {
  // Defer to next tick to allow native detection first
  queueMicrotask(() => {
    const docAny = document as any;
    if (!docAny.modelContext) {
      installPolyfill();
    }
  });
}

export default installPolyfill;
