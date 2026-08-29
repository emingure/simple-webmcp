import { z } from 'zod';
import { webmcp } from 'simple-webmcp';

async function updateCustomer({ customerId, name }: { customerId: string; name: string }) {
  return { customerId, name };
}

// Whole schema via Zod — establishes contract
export const updateToolWhole = webmcp(updateCustomer, {
  description: 'Update customer information',
  schema: z.object({
    customerId: z.string(),
    name: z.string().min(1),
  }),
});

// Per-field Zod mix
export const updateToolFields = webmcp(updateCustomer, {
  description: 'Update customer information',
  fields: {
    customerId: z.string().describe('Customer ID'),
    name: z.string().min(1).describe('New name'),
  },
});

// Plain JSON Schema (no Zod) — lightest
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

// All three are still callable:
console.log(await updateToolWhole({ customerId: 'c_1', name: 'New' }));
