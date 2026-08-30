import type { WebMCPHooks } from './types.js';

const GLOBAL_KEY = '__simpleWebmcp_hooks' as const;

type GlobalStore = {
  hooks: WebMCPHooks<any>;
};

function getStore(): GlobalStore {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { hooks: {} } as GlobalStore;
  }
  return g[GLOBAL_KEY] as GlobalStore;
}

export function getGlobalHooks(): WebMCPHooks<any> {
  return getStore().hooks ?? {};
}

export function configureWebMCP(opts: { hooks?: WebMCPHooks<any>; replace?: boolean }): void {
  const store = getStore();
  if (!opts.hooks) return;
  if (opts.replace) {
    store.hooks = normalizeHooks(opts.hooks);
    return;
  }
  // Merge: concat arrays (global accumulate)
  store.hooks = mergeHooks(store.hooks, opts.hooks);
}

export function resetGlobalHooks(): void {
  const store = getStore();
  store.hooks = {};
}

function normalizeHooks<F extends (...args: any) => any>(hooks: WebMCPHooks<F>): WebMCPHooks<F> {
  return {
    before: hooks.before ? [...hooks.before] : undefined,
    after: hooks.after ? [...hooks.after] : undefined,
    error: hooks.error ? [...hooks.error] : undefined,
    denied: hooks.denied ? [...hooks.denied] : undefined,
  };
}

export function mergeHooks<F extends (...args: any) => any>(
  a: WebMCPHooks<any> | undefined,
  b: WebMCPHooks<F> | undefined,
): WebMCPHooks<F> {
  if (!a && !b) return {};
  if (!a) return normalizeHooks(b!);
  if (!b) return a as WebMCPHooks<F>;
  return {
    before: [...(a.before ?? []), ...(b.before ?? [])] as any,
    after: [...(a.after ?? []), ...(b.after ?? [])] as any,
    error: [...(a.error ?? []), ...(b.error ?? [])] as any,
    denied: [...(a.denied ?? []), ...(b.denied ?? [])] as any,
  };
}

/**
 * Merge with correct ordering semantics:
 * before: global → scoped → tool
 * after:  tool → scoped → global (onion)
 * error/denied: tool → scoped → global
 */
export function mergeHooksOrdered<F extends (...args: any) => any>(opts: {
  globalHooks?: WebMCPHooks<any>;
  scopedHooks?: WebMCPHooks<any>;
  toolHooks?: WebMCPHooks<F>;
}): WebMCPHooks<F> {
  const globalHooks = opts.globalHooks ?? {};
  const scopedHooks = opts.scopedHooks ?? {};
  const toolHooks = opts.toolHooks ?? {};

  const before = [
    ...(globalHooks.before ?? []),
    ...(scopedHooks.before ?? []),
    ...(toolHooks.before ?? []),
  ] as any;

  const after = [
    ...(toolHooks.after ?? []),
    ...(scopedHooks.after ?? []),
    ...(globalHooks.after ?? []),
  ] as any;

  const error = [
    ...(toolHooks.error ?? []),
    ...(scopedHooks.error ?? []),
    ...(globalHooks.error ?? []),
  ] as any;

  const denied = [
    ...(toolHooks.denied ?? []),
    ...(scopedHooks.denied ?? []),
    ...(globalHooks.denied ?? []),
  ] as any;

  const out: WebMCPHooks<F> = {};
  if (before.length) out.before = before;
  if (after.length) out.after = after;
  if (error.length) out.error = error;
  if (denied.length) out.denied = denied;
  return out;
}
