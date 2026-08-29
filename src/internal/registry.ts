import type { ToolContract, RegistrationStatus, ModelContextLike } from '../types.js';
import { getModelContext, isWebMCPSupported } from './utils.js';
import { RegistrationError, NotSupportedError, NotAllowedError } from '../errors.js';
import { wrapExecute } from './normalize.js';

/**
 * Global tool registry — tracks registration state per tool name.
 * Handles async registerTool (Promise<void>) + AbortSignal lifecycle per WebMCP spec (current types).
 * Deduplicates StrictMode double-mount.
 */

type Entry = {
  name: string;
  controller: AbortController;
  status: RegistrationStatus;
  promise: Promise<void> | null;
  unregister: () => void;
  contract?: ToolContract;
  execute?: (args: unknown, ctx?: unknown) => Promise<any>;
};

class Registry {
  private entries = new Map<string, Entry>();
  // expose for devtools/tests — now includes contract for inspect
  list(): Array<{ name: string; status: RegistrationStatus; contract?: ToolContract }> {
    return Array.from(this.entries.values()).map((e) => ({ name: e.name, status: e.status, contract: e.contract }));
  }

  get(name: string): Entry | undefined {
    return this.entries.get(name);
  }

  getContract(name: string): ToolContract | undefined {
    return this.entries.get(name)?.contract;
  }

  clear() {
    for (const e of this.entries.values()) {
      try { e.controller.abort(); } catch {}
    }
    this.entries.clear();
  }

  isRegistered(name: string): boolean {
    return this.entries.get(name)?.status === 'registered';
  }

  getStatus(name: string): RegistrationStatus {
    return this.entries.get(name)?.status ?? 'unregistered';
  }

  async register(
    contract: ToolContract,
    opts?: { signal?: AbortSignal; execute?: (args: unknown, ctx?: unknown) => Promise<any> },
  ): Promise<() => void> {
    const name = contract.name;
    const existing = this.entries.get(name);
    if (existing && (existing.status === 'registered' || existing.status === 'registering')) {
      // Dedup — return existing unregister
      return existing.unregister;
    }

    if (!isWebMCPSupported()) {
      // Do not claim success. `supported` and `registered` must be mutually exclusive.
      // Return a no-op unregister; caller should check `isWebMCPSupported()` or
      // `tool.status === 'unsupported'` instead of assuming `registered`.
      if (opts?.signal?.aborted) return () => {};
      return () => {};
    }

    const modelContext = getModelContext();
    if (!modelContext) throw new NotSupportedError();

    const controller = new AbortController();
    // Wire external signal to internal
    if (opts?.signal) {
      if (opts.signal.aborted) {
        controller.abort();
      } else {
        opts.signal.addEventListener(
          'abort',
          () => {
            try {
              controller.abort();
            } catch {}
          },
          { once: true },
        );
      }
    }

    const entry: Entry = {
      name,
      controller,
      status: 'registering',
      promise: null,
      unregister: () => {
        if (entry.status === 'registered' || entry.status === 'registering') {
          entry.status = 'unregistering';
          try {
            controller.abort();
          } catch {}
          // Small delay to allow spec to unregister
          entry.status = 'unregistered';
          this.entries.delete(name);
        }
      },
      contract,
      execute: opts?.execute,
    };
    this.entries.set(name, entry);

    const wrappedExecute = opts?.execute ?? (async (args: unknown) => ({ content: [{ type: 'text', text: `no execute for ${name}` }] }));

    try {
      const regPromise = (modelContext as ModelContextLike).registerTool(
        {
          name: contract.name,
          description: contract.description,
          inputSchema: contract.inputSchema,
          outputSchema: contract.outputSchema,
          annotations: contract.annotations,
          execute: wrappedExecute,
        },
        { signal: controller.signal },
      );
      entry.promise = regPromise;
      await regPromise;
      // If not aborted in-flight
      if (controller.signal.aborted) {
        entry.status = 'unregistered';
        this.entries.delete(name);
      } else {
        entry.status = 'registered';
      }
      // Cleanup on abort signal
      controller.signal.addEventListener('abort', () => {
        entry.status = 'unregistered';
        this.entries.delete(name);
      }, { once: true });

      return entry.unregister;
    } catch (err: any) {
      entry.status = 'error';
      this.entries.delete(name);
      const msg = err?.message || String(err);
      // Detect Permissions Policy NotAllowedError per spec
      if (err?.name === 'NotAllowedError' || /NotAllowedError|Permissions Policy|blocked/i.test(msg)) {
        throw new NotAllowedError(msg, { cause: err });
      }
      throw new RegistrationError(`Failed to register tool "${name}": ${msg}`, { cause: err });
    }
  }

  unregister(name: string) {
    const entry = this.entries.get(name);
    if (!entry) return;
    try {
      entry.controller.abort();
    } catch {}
    this.entries.delete(name);
  }
}

const REGISTRY_KEY = '__simpleWebmcpRegistry' as const;
const globalAny = globalThis as any;
export const registry: Registry =
  (globalAny[REGISTRY_KEY] as Registry) ?? new Registry();
if (!globalAny[REGISTRY_KEY]) {
  globalAny[REGISTRY_KEY] = registry;
}

// Export wrap helper for external tests
export function getRegistry() {
  return registry;
}
