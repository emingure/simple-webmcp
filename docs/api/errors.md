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

## Registry

```ts
import { registry, getRegistry } from 'simple-webmcp';
registry.list(); // [{name, status}]
registry.clear();
registry.isRegistered(name);
registry.getStatus(name);
```

Async `register(contract, {signal, execute})` → `()=>void` unregister. Deduped; `NotAllowedError` on `NotAllowedError`/`Permissions Policy` message.
