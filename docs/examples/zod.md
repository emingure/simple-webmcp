# Zod

```ts
// with-zod.ts
import { z } from 'zod';
import { webmcp } from 'simple-webmcp';
import 'simple-webmcp/zod'; // enables Zod → JSON conversion

async function updateCustomer({ customerId, name }: { customerId: string; name: string }) {
  return { customerId, name };
}

// whole schema
export const updateToolWhole = webmcp(updateCustomer, {
  description: 'Update customer information',
  schema: z.object({
    customerId: z.string(),
    name: z.string().min(1),
  }),
});

// per-field mix
export const updateToolFields = webmcp(updateCustomer, {
  description: 'Update customer information',
  fields: {
    customerId: z.string().describe('Customer ID'),
    name: z.string().min(1).describe('New name'),
  },
});

// JSON Schema directly (no Zod)
export const updateToolJson = webmcp(updateCustomer, {
  description: 'Update customer information',
  schema: {
    type: 'object',
    properties: {
      customerId: { type: 'string', description: 'Customer ID' },
      name: { type: 'string', minLength: 1 },
    },
    required: ['customerId', 'name'],
  },
});

console.log(await updateToolWhole({ customerId: 'c_1', name: 'New' }));
```

Source: `examples/with-zod.ts`
