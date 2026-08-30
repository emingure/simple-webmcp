---
title: Zod Adapter — moved to Schema
description: Zod adapter docs merged into Schema & Inference. Redirect.
head:
  - - meta
    - http-equiv: refresh
      content: 0; url=/simple-webmcp/guide/schema.html
---

# Zod Adapter — `simple-webmcp/zod`

This page has moved to **[Schema & Inference — Zod & StandardSchema](/guide/schema)**.

For the adapter helpers:

```ts
import 'simple-webmcp/zod'; // registers converter globally
import { zodToJsonSchema } from 'simple-webmcp/zod';
import { z } from 'zod';
webmcp(fn, { schema: z.object({ query: z.string() }) });
```

See merged guide: [Schema & Inference](/guide/schema). External links: [Zod](https://zod.dev) · [StandardSchema](https://github.com/standard-schema/standard-schema) · [Chrome WebMCP API](https://developer.chrome.com/docs/ai/webmcp/imperative-api).

Redirecting to [Schema & Inference](/guide/schema)...
