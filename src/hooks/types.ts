import type { ToolContract, WebMCPTool } from '../types.js';

export type MaybePromise<T> = T | Promise<T>;

// Base context shared across all phases
export type HookBaseContext<F extends (...args: any) => any> = {
  invocationId: string;
  tool: WebMCPTool<F>;
  contract: ToolContract;
  signal: AbortSignal;
  /**
   * Mutable bag shared across all hooks in a single invocation.
   * Hooks may read/write to communicate (e.g., startTime, tenantId).
   * Same reference for before → after/error/denied within one invocation.
   */
  metadata: Record<string, unknown>;
};

export type BeforeContext<F extends (...args: any) => any> = HookBaseContext<F> & {
  input: unknown;
};

export type AfterContext<F extends (...args: any) => any> = HookBaseContext<F> & {
  input: unknown;
  output: Awaited<ReturnType<F>>;
};

export type ErrorContext<F extends (...args: any) => any> = HookBaseContext<F> & {
  input: unknown;
  error: unknown;
};

export type DeniedContext<F extends (...args: any) => any> = HookBaseContext<F> & {
  input: unknown;
  reason?: string;
  code?: string;
};

// Result types — intentionally minimal (no `action:'continue'` ceremony)
export type BeforeHookResult =
  | void
  | { input?: unknown }
  | { action: 'deny'; message?: string; code?: string };

export type AfterHookResult<F extends (...args: any) => any> =
  | void
  | { output?: Awaited<ReturnType<F>> };

// Error hooks are observational only in v1 — no recovery
export type ErrorHookResult = void;
export type DeniedHookResult = void;

export type BeforeHook<F extends (...args: any) => any> = (
  ctx: BeforeContext<F>,
) => MaybePromise<BeforeHookResult>;

export type AfterHook<F extends (...args: any) => any> = (
  ctx: AfterContext<F>,
) => MaybePromise<AfterHookResult<F>>;

export type ErrorHook<F extends (...args: any) => any> = (
  ctx: ErrorContext<F>,
) => MaybePromise<ErrorHookResult>;

export type DeniedHook<F extends (...args: any) => any> = (
  ctx: DeniedContext<F>,
) => MaybePromise<DeniedHookResult>;

export type WebMCPHooks<F extends (...args: any) => any> = {
  before?: BeforeHook<F>[];
  after?: AfterHook<F>[];
  error?: ErrorHook<F>[];
  denied?: DeniedHook<F>[];
};
