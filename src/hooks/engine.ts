import type { ToolContract, WebMCPTool } from '../types.js';
import type {
  WebMCPHooks,
  BeforeContext,
  AfterContext,
  ErrorContext,
  DeniedContext,
} from './types.js';
import { normalizeResult, normalizeError, type NormalizedResult } from '../internal/normalize.js';

let fallbackCounter = 0;

export function genInvocationId(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return fallbackInvocationId();
}

function fallbackInvocationId(): string {
  fallbackCounter = (fallbackCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `webmcp_${Date.now().toString(36)}_${fallbackCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function isDenyResult(
  r: unknown,
): r is { action: 'deny'; message?: string; code?: string } {
  return !!r && typeof r === 'object' && (r as any).action === 'deny';
}

async function runErrorHooks<F extends (...args: any) => any>(
  hooks: WebMCPHooks<F>['error'],
  ctx: ErrorContext<F>,
): Promise<void> {
  if (!hooks || hooks.length === 0) return;
  for (const h of hooks) {
    try {
      await h(ctx);
    } catch {
      // swallow: error hooks must not trigger error hooks recursively
    }
  }
}

async function runDeniedHooks<F extends (...args: any) => any>(
  hooks: WebMCPHooks<F>['denied'],
  ctx: DeniedContext<F>,
): Promise<void> {
  if (!hooks || hooks.length === 0) return;
  for (const h of hooks) {
    try {
      await h(ctx);
    } catch {
      // swallow: denied is observational
    }
  }
}

export type CreateHookedExecuteOptions<F extends (...args: any) => any> = {
  // Allow engine to fetch latest merged hooks per invocation (captures scope changes)
  getHooks: () => WebMCPHooks<F>;
  // Optional validator: called after before-hooks, before fn. Should throw on invalid.
  validate?: (input: unknown) => void;
};

export function createHookedExecute<F extends (...args: any) => any>(
  fn: F,
  tool: WebMCPTool<F>,
  contract: ToolContract,
  options: CreateHookedExecuteOptions<F>,
): (args: unknown, ctx?: unknown) => Promise<NormalizedResult> {
  return async (args: unknown, _ctx?: unknown): Promise<NormalizedResult> => {
    const invocationId = genInvocationId();
    const metadata: Record<string, unknown> = {};

    // We need the signal from the registry's AbortController. The registry passes
    // the controller's signal to modelContext.registerTool and also keeps it per entry.
    // At execute time, we don't have direct access to that controller's signal via closure
    // unless we capture it. Instead we use an inert signal by default and allow the registry
    // to provide a signal via a property on the execute wrapper if needed.
    // Simpler: use an AbortSignal that reflects current abort via global registry lookup?
    // Approach: engine creates a signal that is linked to tool's activeController if available.
    // For correctness we store signal on tool as __activeSignal via webmcp.ts and read it here.
    const signal: AbortSignal = ((tool as any).__activeSignal as AbortSignal | undefined) ?? createNeverAbortedSignal();

    const merged = options.getHooks();

    let currentInput: unknown = args;

    // Helper to build base context
    const base = { invocationId, tool, contract, signal, metadata } as const;

    // ---- BEFORE ----
    const beforeHooks = merged.before ?? [];
    for (const hook of beforeHooks) {
      if (signal.aborted) {
        const abortErr = new DOMException('Aborted', 'AbortError');
        await runErrorHooks(merged.error, {
          ...base,
          input: currentInput,
          error: abortErr,
        });
        return normalizeError(abortErr);
      }
      let res: unknown;
      try {
        const ctx: BeforeContext<F> = { ...base, input: currentInput };
        res = await hook(ctx);
      } catch (hookErr) {
        await runErrorHooks(merged.error, {
          ...base,
          input: currentInput,
          error: hookErr,
        });
        return normalizeError(hookErr);
      }

      if (res != null && typeof res === 'object') {
        if (isDenyResult(res)) {
          const reason = (res as any).message as string | undefined;
          const code = (res as any).code as string | undefined;
          await runDeniedHooks(merged.denied, {
            ...base,
            input: currentInput,
            reason,
            code,
          });
          const msg = reason ?? 'Tool execution denied';
          // Return isError true so LLM sees denial
          return {
            content: [{ type: 'text', text: `Denied: ${msg}` }],
            isError: true,
            ...(code ? { code } : {}),
          } as NormalizedResult;
        }
        if ('input' in (res as any) && (res as any).input !== undefined) {
          currentInput = (res as any).input;
        }
      }
    }

    if (signal.aborted) {
      const abortErr = new DOMException('Aborted', 'AbortError');
      await runErrorHooks(merged.error, {
        ...base,
        input: currentInput,
        error: abortErr,
      });
      return normalizeError(abortErr);
    }

    // ---- VALIDATE (after before enrichment) ----
    if (options.validate) {
      try {
        options.validate(currentInput);
      } catch (valErr) {
        await runErrorHooks(merged.error, {
          ...base,
          input: currentInput,
          error: valErr,
        });
        return normalizeError(valErr);
      }
    }

    // ---- FN ----
    let rawOutput: unknown;
    try {
      // fn expects single object arg (preferred). We call with enriched input.
      rawOutput = await (fn as any)(currentInput);
    } catch (fnErr) {
      await runErrorHooks(merged.error, {
        ...base,
        input: currentInput,
        error: fnErr,
      });
      return normalizeError(fnErr);
    }

    // ---- AFTER ----
    let currentOutput: unknown = rawOutput;
    const afterHooks = merged.after ?? [];
    for (const hook of afterHooks) {
      if (signal.aborted) {
        // Cooperative: after hooks still run but fn already completed; abort just noted
        // We still return currentOutput; don't treat as error unless hook throws
      }
      try {
        const ctx: AfterContext<F> = {
          ...base,
          input: currentInput,
          output: currentOutput as Awaited<ReturnType<F>>,
        };
        const res = await hook(ctx);
        if (res != null && typeof res === 'object' && 'output' in (res as any) && (res as any).output !== undefined) {
          currentOutput = (res as any).output;
        }
      } catch (hookErr) {
        await runErrorHooks(merged.error, {
          ...base,
          input: currentInput,
          error: hookErr,
        });
        return normalizeError(hookErr);
      }
    }

    return normalizeResult(currentOutput);
  };
}

function createNeverAbortedSignal(): AbortSignal {
  // Use an AbortController that is never aborted
  // In environments without AbortController, fallback to a dummy
  try {
    return new AbortController().signal;
  } catch {
    // Fallback dummy signal
    return {
      aborted: false,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() { return false; },
      onabort: null,
      reason: undefined,
      throwIfAborted() {},
    } as unknown as AbortSignal;
  }
}
