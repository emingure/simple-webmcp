import type { WebMCPOptions, WebMCPTool, ToolContract, RegistrationStatus } from './types.js';
import type { JsonSchema } from './types.js';
import { SimpleWebMCPError, ConfigurationError, NotSupportedError, ValidationError } from './errors.js';
import { toSnakeCase, getFunctionName, warnNoDescription, isWebMCPSupported } from './internal/utils.js';
import { inferRuntime } from './internal/inferRuntime.js';
import { buildFinalInputSchema, normalizeOutputSchema } from './internal/schema.js';
import { registry } from './internal/registry.js';
import { createHookedExecute } from './hooks/engine.js';
import { getGlobalHooks, mergeHooksOrdered, configureWebMCP, resetGlobalHooks } from './hooks/config.js';

/**
 * Callable wrapper factory — core of simple-webmcp.
 * Hierarchy: schema (whole) > inferred > fields patch > metadata
 */

function resolveScope(opts?: WebMCPOptions<any>): 'global' | 'scoped' | 'manual' {
  if (opts?.scope) return opts.scope;
  if (opts?.global) return 'global';
  // Default per plan: scoped — requires useWebMCP; manual if enabled false?
  return 'scoped';
}

function warnIfNoScopeInServerContext() {
  // no-op
}

export function webmcp<F extends (...args: any) => any>(fn: F, options?: WebMCPOptions<F>): WebMCPTool<F> {
  if (typeof fn !== 'function') {
    throw new ConfigurationError('webmcp(fn, opts) — first argument must be a function');
  }

  // Prevent double wrap
  const anyFn = fn as any;
  if (anyFn.__webmcpBrand === true && anyFn.definition) {
    // Already a tool — apply new options as patch? For 0.1, return as is if no opts, else merge
    if (!options || Object.keys(options).length === 0) return anyFn as WebMCPTool<F>;
    // Merge patch onto existing tool's schema. For hooks, concat arrays instead of replacing.
    const prevOpts = (anyFn.__webmcpOptions || {}) as WebMCPOptions<any>;
    const mergedOpts: WebMCPOptions<F> = { ...(prevOpts as any), ...(options as any) } as WebMCPOptions<F>;
    if (prevOpts.hooks || (options as any)?.hooks) {
      const prevHooks: any = prevOpts.hooks ?? {};
      const nextHooks: any = (options as any).hooks ?? {};
      mergedOpts.hooks = {
        before: [...(prevHooks.before ?? []), ...(nextHooks.before ?? [])],
        after: [...(prevHooks.after ?? []), ...(nextHooks.after ?? [])],
        error: [...(prevHooks.error ?? []), ...(nextHooks.error ?? [])],
        denied: [...(prevHooks.denied ?? []), ...(nextHooks.denied ?? [])],
      } as any;
      // Remove empty arrays to keep undefined
      for (const k of ['before', 'after', 'error', 'denied'] as const) {
        if ((mergedOpts.hooks as any)[k]?.length === 0) delete (mergedOpts.hooks as any)[k];
      }
      if (mergedOpts.hooks && Object.keys(mergedOpts.hooks).length === 0) delete (mergedOpts as any).hooks;
    }
    const original = (anyFn.__fn ?? fn) as F;
    return webmcp(original, mergedOpts);
  }

  const name = options?.name ?? toSnakeCase(getFunctionName(fn));
  if (!name) throw new ConfigurationError('Tool name could not be inferred — pass {name:"my_tool"}');
  let description = options?.description ?? (anyFn.__webmcpDescription as string | undefined) ?? '';
  if (!description) {
    warnNoDescription(fn);
    description = '';
  }

  // Strict check — if strict and fn has no types/fields/schema, throw
  const hasSchema = !!options?.schema;
  const hasFields = !!options?.fields && Object.keys(options.fields).length > 0;
  if (options?.strict && !hasSchema && !hasFields) {
    // Try infer; strict requires at least one typed property (type present) — runtime `{}` is low confidence
    const { schema: inferred } = inferRuntime(fn);
    const props = (inferred.properties || {}) as Record<string, any>;
    const propKeys = Object.keys(props);
    const hasTypedProps = propKeys.length > 0 && propKeys.some((k) => !!props[k]?.type);
    if (!hasTypedProps) {
      throw new ConfigurationError(
        `webmcp strict: could not infer schema for "${name}" — add TypeScript types, JSDoc, {schema} or {fields}`,
      );
    }
  }

  // Build schemas
  const { schema: inferredSchema } = inferRuntime(fn);
  const { json: finalInput, standard } = buildFinalInputSchema({
    wholeSchema: options?.schema,
    inferred: inferredSchema,
    fields: options?.fields,
  });

  const outNorm = normalizeOutputSchema(options?.outputSchema);
  const annotations = options?.annotations;

  const contract: ToolContract = {
    name,
    description,
    inputSchema: finalInput,
    outputSchema: outNorm.json,
    annotations,
  };

  // Detect WebMCP availability at create time for enabled default?
  const enabled = options?.enabled ?? true;

  // Create callable wrapper
  // We use a function that forwards to original fn, preserving this, length, name where possible
  const wrapper = function (this: unknown, ...args: any[]) {
    return (fn as any).apply(this, args);
  } as unknown as WebMCPTool<F>;

  // Copy over properties from original for debuggability? Not enumerable
  try {
    Object.defineProperty(wrapper, 'name', { value: fn.name || name, configurable: true });
  } catch {}
  try {
    Object.defineProperty(wrapper, 'length', { value: fn.length, configurable: true });
  } catch {}

  // Internal slots
  let status: RegistrationStatus = 'unregistered';
  let registrationPromise: Promise<void> | null = null;
  let unregisterFn: (() => void) | null = null;
  let activeController: AbortController | null = null;

  // Hooks — tool-level (captured per tool; global/scoped merged at execute time)
  const toolHooks = options?.hooks ? { ...options.hooks } : undefined;

  const toolWrapper = wrapper as WebMCPTool<F>;
  // Brand
  (toolWrapper as any).__webmcpBrand = true;
  (toolWrapper as any).__fn = fn;
  (toolWrapper as any).__webmcpOptions = options;
  if (standard) (toolWrapper as any).__standardSchema = standard;
  if (outNorm.standard) (toolWrapper as any).__outputStandardSchema = outNorm.standard;
  if (toolHooks) (toolWrapper as any).__hooks = toolHooks;
  (toolWrapper as any).tool = contract;
  (toolWrapper as any).definition = contract;

  // Hooked execute — merges global + scoped (via __scopeHooks) + tool at invocation time
  // Includes validation after before-hooks, cooperative signal, safe error observer
  const hookedExec = createHookedExecute(fn as any, toolWrapper as any, contract, {
    getHooks: () => {
      const globalHooks = getGlobalHooks();
      const scopeHooks = (toolWrapper as any).__scopeHooks as any;
      return mergeHooksOrdered({ globalHooks, scopedHooks: scopeHooks, toolHooks });
    },
    validate: standard
      ? (input: unknown) => {
          const res = standard['~standard'].validate(input);
          if ('issues' in res && (res as any).issues && (res as any).issues.length > 0) {
            const msg = (res as any).issues.map((i: any) => i.message).join('; ');
            throw new ValidationError(`Validation failed: ${msg}`);
          }
        }
      : undefined,
  });

  Object.defineProperty(toolWrapper, 'status', {
    get() { return status; },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(toolWrapper, 'registration', {
    get() { return registrationPromise; },
    enumerable: true,
    configurable: true,
  });

  toolWrapper.isRegistered = () => status === 'registered';

  toolWrapper.register = async (opts?: { signal?: AbortSignal }) => {
    if (status === 'registered' || status === 'registering') {
      // already registered — return existing unregister
      return unregisterFn ?? (() => toolWrapper.unregister());
    }
    if (enabled === false) {
      // inert
      return () => {};
    }
    if (!isWebMCPSupported()) {
      status = 'unsupported';
      return () => {
        status = 'unregistered';
      };
    }
    status = 'registering';
    const controller = new AbortController();
    activeController = controller;
    // Expose signal for hook engine (cooperative abort)
    (toolWrapper as any).__activeSignal = controller.signal;

    // Wire external signal
    if (opts?.signal) {
      if (opts.signal.aborted) {
        controller.abort();
        status = 'unregistered';
        activeController = null;
        try { delete (toolWrapper as any).__activeSignal; } catch {}
        return () => {};
      }
      opts.signal.addEventListener('abort', () => {
        try { controller.abort(); } catch {}
        toolWrapper.unregister();
      }, { once: true });
    }

    controller.signal.addEventListener('abort', () => {
      if (status !== 'unregistered') status = 'unregistered';
      activeController = null;
      try { delete (toolWrapper as any).__activeSignal; } catch {}
    }, { once: true });

    try {
      const unregister = await registry.register(contract, {
        signal: controller.signal,
        execute: hookedExec as any,
      });
      // registry handles dupe and polyfill
      unregisterFn = unregister;
      registrationPromise = Promise.resolve();
      if (controller.signal.aborted) {
        status = 'unregistered';
      } else if (!isWebMCPSupported()) {
        status = 'unsupported';
      } else {
        status = 'registered';
      }
      return () => {
        try { unregister(); } catch {}
        status = 'unregistered';
        activeController = null;
        try { delete (toolWrapper as any).__activeSignal; } catch {}
        unregisterFn = null;
      };
    } catch (err: any) {
      if (err instanceof NotSupportedError || err?.code === 'NOT_SUPPORTED' || err?.name === 'NotSupportedError') {
        status = 'unsupported';
      } else {
        status = 'error';
      }
      activeController = null;
      try { delete (toolWrapper as any).__activeSignal; } catch {}
      registrationPromise = Promise.reject(err);
      // Re-throw as typed
      if (err instanceof SimpleWebMCPError) throw err;
      throw err;
    }
  };

  toolWrapper.unregister = () => {
    if (status === 'unregistered') return;
    status = 'unregistering';
    try {
      registry.unregister(contract.name);
    } catch {}
    try {
      activeController?.abort();
    } catch {}
    status = 'unregistered';
    activeController = null;
    try { delete (toolWrapper as any).__activeSignal; } catch {}
    unregisterFn = null;
    registrationPromise = null;
  };

  // Auto global if scope global and enabled
  const scope = resolveScope(options);
  if (scope === 'global' && enabled !== false) {
    // Defer to next tick to allow import order; but also handle document not yet ready
    // Only register if in browser (document exists). If not, warn and keep status unregistered until manual.
    if (typeof document !== 'undefined') {
      // Use microtask
      queueMicrotask(() => {
        // Don't await — fire and forget, but catch
        toolWrapper.register().catch(() => {});
      });
    } else {
      // SSR — no-op until client hydrates; user should use useWebMCP or call register on client
      // Keep as is
    }
  }

  // Preserve original toString etc for inference?
  (toolWrapper as any).toString = fn.toString.bind(fn);

  return toolWrapper;
}

// Namespace helpers — webmcp.global
(webmcp as any).global = function global<F extends (...args: any) => any>(fn: F, opts?: Omit<WebMCPOptions<F>, 'global' | 'scope'>): WebMCPTool<F> {
  return webmcp(fn, { ...(opts as any), global: true } as WebMCPOptions<F>);
};

// Global hook configuration — typed helpers
type WebMCPHelpers = {
  global: <F extends (...args: any) => any>(fn: F, opts?: Omit<WebMCPOptions<F>, 'global' | 'scope'>) => WebMCPTool<F>;
  configure: typeof configureWebMCP;
  getGlobalHooks: typeof getGlobalHooks;
  resetGlobalHooks: typeof resetGlobalHooks;
  isWebMCPTool: (v: unknown) => boolean;
};
(webmcp as unknown as WebMCPHelpers).configure = configureWebMCP;
(webmcp as unknown as WebMCPHelpers).getGlobalHooks = getGlobalHooks;
(webmcp as unknown as WebMCPHelpers).resetGlobalHooks = resetGlobalHooks;

// Optional internal check
(webmcp as unknown as WebMCPHelpers).isWebMCPTool = function isWebMCPTool(v: unknown): boolean {
  return !!(v as any)?.__webmcpBrand;
};

export { configureWebMCP, getGlobalHooks, resetGlobalHooks };

export default webmcp;
