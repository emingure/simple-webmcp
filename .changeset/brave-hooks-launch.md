---
"simple-webmcp": minor
---

feat(hooks): add before/after/error/denied lifecycle hooks with global/scoped/tool scoping and HITL

Add state-based hook arrays (`hooks: { before, after, error, denied }`) for `webmcp(fn)`, `webmcp.configure()` global and `<WebMCPProvider>` scoped. Hooks wrap only the agent `execute` path, support input/output mutation, deny via `{action:'deny'}`, cooperative `AbortSignal`, shared `metadata` bag and `invocationId`. Includes HITL demo (checkout approval modal with deny), hook log UI + console, docs for hooks and analytics integrations (PostHog, Mixpanel, Amplitude, GA4, Segment, Sentry, Datadog, Vercel, Plausible), and comprehensive tests.
