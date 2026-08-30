---
title: Errors & Registry | WebMCP SDK
description: WebMCP error classes (NotSupportedError, NotAllowedError, ValidationError) and registry API. Handle unsupported browsers and Permissions Policy.
---

# Errors & Registry

## Errors

```ts
class SimpleWebMCPError extends Error { code: string; cause?: unknown; toJSON(); }
class NotSupportedError extends SimpleWebMCPError // code 'NOT_SUPPORTED'
class NotAllowedError extends SimpleWebMCPError    // code 'NOT_ALLOWED' — Permissions Policy
class RegistrationError extends SimpleWebMCPError   // code 'REGISTRATION_ERROR'
class ValidationError extends SimpleWebMCPError     // code 'VALIDATION_ERROR'
class ConfigurationError extends SimpleWebMCPError  // code 'CONFIGURATION_ERROR' — e.g. strict inference
```

See [Browser Support](/guide/browser-support) for `NotSupportedError` / `NotAllowedError` handling and [Schema](/guide/schema) for `strict` validation.

## Registry

```ts
import { registry, getRegistry } from 'simple-webmcp';
registry.list(); // [{name, status}]
registry.clear();
registry.isRegistered(name);
registry.getStatus(name);
```

Async `register(contract, {signal, execute})` → `()=>void` unregister. Deduped; `NotAllowedError` on `NotAllowedError`/`Permissions Policy` message.

## See also

- [Guide — Browser Support](/guide/browser-support) — feature detection + polyfill
- [Guide — Hooks](/guide/hooks) — error hooks are observational
- [Analytics — Sentry](/guide/analytics/sentry) — reporting via error hooks
- [Schema & Inference](/guide/schema) — `strict` and validation
- [External: Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
