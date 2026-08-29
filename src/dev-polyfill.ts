/**
 * simple-webmcp/dev-polyfill — explicit alias for the dev/testing shim.
 * Same as `simple-webmcp/polyfill` but named to avoid confusion with
 * real interoperability polyfills like `@mcp-b/webmcp-polyfill`.
 * @see src/polyfill.ts for implementation
 */
export * from './polyfill.js';
export { default } from './polyfill.js';
