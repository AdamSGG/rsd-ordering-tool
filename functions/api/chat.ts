import type { EventContext } from '@cloudflare/workers-types';

interface Env {
  ANTHROPIC_API_KEY: string;
}

export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json() as { messages: unknown[]; order: unknown[] };

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: body.messages,
      tools: TOOLS,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return new Response(JSON.stringify({ error: err }), {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await resp.json();
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

const SYSTEM_PROMPT = `You are an ordering assistant for RSD (Reflective Signs & Decals), a company that makes traffic control and safety signage products.

Your job is to help users build purchase orders by matching their requests to items in our product catalog.

When a user requests items:
1. Use the search_catalog tool to find matching products
2. If you find a clear match, use add_to_order to add it and confirm with the user
3. If the match is ambiguous, ask ONE focused clarifying question (max 2 per item)
4. If no match is found after clarification, tell the user and suggest they provide an item code

When adding items, always confirm the item code and description with the user before finalising.
Keep responses concise and practical. Use Australian spelling.
The catalog has 360 products from 84 suppliers.`;

const TOOLS = [
  {
    name: 'search_catalog',
    description: 'Search the product catalog by keyword, item number, description, or supplier name. Returns up to 10 matching products.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term — item number, product name, supplier, or description keyword',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'add_to_order',
    description: 'Add an item to the current order list.',
    input_schema: {
      type: 'object',
      properties: {
        supplier: { type: 'string', description: 'Supplier name exactly as in catalog' },
        itemNum: { type: 'string', description: 'Item number / product code' },
        desc: { type: 'string', description: 'Product description' },
        unitPrice: { type: 'number', description: 'Unit price in AUD (ex GST)' },
        qty: { type: 'number', description: 'Quantity to order' },
      },
      required: ['supplier', 'itemNum', 'desc', 'unitPrice', 'qty'],
    },
  },
  {
    name: 'remove_from_order',
    description: 'Remove an item from the current order by item number.',
    input_schema: {
      type: 'object',
      properties: {
        itemNum: { type: 'string', description: 'Item number to remove' },
      },
      required: ['itemNum'],
    },
  },
  {
    name: 'update_qty',
    description: 'Update the quantity of an item already in the order.',
    input_schema: {
      type: 'object',
      properties: {
        itemNum: { type: 'string' },
        qty: { type: 'number' },
      },
      required: ['itemNum', 'qty'],
    },
  },
];
