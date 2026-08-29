/**
 * Base error for simple-webmcp
 */
export class SimpleWebMCPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      cause: this.cause,
    };
  }
}

export class NotSupportedError extends SimpleWebMCPError {
  constructor(message = 'WebMCP is not supported in this environment', opts?: { cause?: unknown }) {
    super(message, 'NOT_SUPPORTED', opts?.cause);
  }
}

export class NotAllowedError extends SimpleWebMCPError {
  constructor(message = 'WebMCP tools are blocked by Permissions Policy', opts?: { cause?: unknown }) {
    super(message, 'NOT_ALLOWED', opts?.cause);
  }
}

export class RegistrationError extends SimpleWebMCPError {
  constructor(message: string, opts?: { cause?: unknown }) {
    super(message, 'REGISTRATION_ERROR', opts?.cause);
  }
}

export class ValidationError extends SimpleWebMCPError {
  constructor(message: string, opts?: { cause?: unknown }) {
    super(message, 'VALIDATION_ERROR', opts?.cause);
  }
}

export class ConfigurationError extends SimpleWebMCPError {
  constructor(message: string, opts?: { cause?: unknown }) {
    super(message, 'CONFIGURATION_ERROR', opts?.cause);
  }
}
