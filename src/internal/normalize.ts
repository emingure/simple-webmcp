/**
 * Normalize execute return values per WebMCP spec.
 * WebMCP expects { content: [{type:'text', text: ...}], isError? }
 * We allow fn to return string, object, or already-normalized shape.
 */

export type NormalizedResult = {
  content: Array<{ type: 'text'; text: string } | { type: string; [k: string]: unknown }>;
  isError?: boolean;
  // allow raw passthrough for custom
  [k: string]: unknown;
};

export function normalizeResult(value: unknown): NormalizedResult {
  if (value == null) {
    return { content: [{ type: 'text', text: '' }] };
  }
  if (typeof value === 'string') {
    return { content: [{ type: 'text', text: value }] };
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return { content: [{ type: 'text', text: String(value) }] };
  }
  // Already normalized?
  if (typeof value === 'object' && value !== null && 'content' in (value as any) && Array.isArray((value as any).content)) {
    return value as NormalizedResult;
  }
  // If Error-like object with isError?
  if (typeof value === 'object' && value !== null && 'isError' in (value as any)) {
    // Could be { isError:true, content:[...] } already — covered above
    // Otherwise wrap
    if ('content' in (value as any)) return value as NormalizedResult;
  }
  // Fallback: JSON stringify
  try {
    const text = JSON.stringify(value, null, 2);
    return { content: [{ type: 'text', text }] };
  } catch {
    return { content: [{ type: 'text', text: String(value) }] };
  }
}

export function normalizeError(err: unknown): NormalizedResult {
  const message = (() => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in (err as any) && typeof (err as any).message === 'string') {
      return (err as any).message;
    }
    try { return JSON.stringify(err); } catch { return String(err); }
  })();
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}

/**
 * Wrap an execute fn to handle:
 * - args: object (WebMCP passes single object) vs spread
 * - async errors
 * - result normalization
 * For 0.1 we assume fn expects single object param (preferred).
 * For multi-arg legacy, user should use webmcp.bind (deferred) — here we provide auto-spread fallback heuristic.
 */
export function wrapExecute<F extends (...args: any) => any>(
  fn: F,
  opts?: { argMode?: 'object' | 'spread' },
): (args: unknown, ctx?: unknown) => Promise<NormalizedResult> {
  return async (args: unknown, _ctx?: unknown) => {
    try {
      let result: unknown;
      // If args is an object and fn.length === 1 or opts explicit object, call fn(args)
      // If fn.length > 1 and args is object, we try to spread values in param order? For 0.1 we call with object.
      // We detect fn expecting spread by `fn.length > 1` and object keys match param names heuristic? Keep simple: always object.
      // The only spread case is for bind() which we defer, so keep object.
      const mode = opts?.argMode ?? 'object';
      if (mode === 'spread' && args && typeof args === 'object' && !Array.isArray(args)) {
        const values = Object.values(args as Record<string, unknown>);
        result = await (fn as any)(...values);
      } else {
        // object
        // If fn expects 0 args and args is empty object, still pass nothing? But passing {} is ok.
        // If fn signature is positional, passing object may be wrong; but we mandate object for 0.1. Document accordingly.
        result = await (fn as any)(args);
      }
      // If result is promise-like already awaited, normalize
      return normalizeResult(result);
    } catch (err) {
      return normalizeError(err);
    }
  };
}
