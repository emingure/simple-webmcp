/**
 * simple-webmcp — core entry
 * Framework-agnostic, no React dep here.
 */

export { webmcp, configureWebMCP, getGlobalHooks, resetGlobalHooks } from './webmcp.js';
export { default } from './webmcp.js';

export type {
  WebMCPTool,
  WebMCPOptions,
  WebMCPAnnotations,
  FieldDef,
  FieldDefOrSchema,
  ToolContract,
  JsonSchema,
  StandardSchemaV1,
  RegistrationStatus,
} from './types.js';

export type {
  WebMCPHooks,
  BeforeHook,
  AfterHook,
  ErrorHook,
  DeniedHook,
  BeforeContext,
  AfterContext,
  ErrorContext,
  DeniedContext,
} from './hooks/types.js';

export { mergeHooksOrdered, mergeHooks } from './hooks/config.js';
export { createHookedExecute, genInvocationId } from './hooks/engine.js';

export {
  SimpleWebMCPError,
  NotSupportedError,
  NotAllowedError,
  RegistrationError,
  ValidationError,
  ConfigurationError,
} from './errors.js';

export { isWebMCPSupported, getModelContext, toSnakeCase } from './internal/utils.js';
export { registry, getRegistry } from './internal/registry.js';
export { normalizeResult, normalizeError, wrapExecute } from './internal/normalize.js';
export { inferRuntime } from './internal/inferRuntime.js';
export { applyFieldsPatch, buildFinalInputSchema } from './internal/schema.js';

export { SDK_VERSION } from './constants.js';
