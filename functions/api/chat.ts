import type { EventContext } from '@cloudflare/workers-types';

interface Env {
  ANTHROPIC_API_KEY: string;
}

export async function onRequestPost(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json() as { messages: unknown[] };
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2048, system: SYSTEM_PROMPT, messages: body.messages, tools: TOOLS }),
  });

  const data = await resp.json();
  return new Response(JSON.stringify(data), {
    status: resp.ok ? 200 : resp.status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}

const SYSTEM_PROMPT = `You are an ordering assistant for RSD (Reflective Signs & Decals), a traffic control signage manufacturer in Brisbane.

Your job is to interpret purchase requests and match each item to the product catalog. Process ALL items in the user's request in a single pass — do not ask clarifying questions first.

For EACH item in the request:
1. Call search_catalog with a targeted query (item code, product name, supplier + type)
2. Immediately call add_to_order with the best match plus:
   - alternatives: array of the next 2-4 best matches from search results (so the user can switch)
   - confidence: "high" if item code matched exactly, "medium" if keyword match is strong, "low" if unclear
   - specNotes: brief note explaining assumptions (e.g. "CL1 assumed", "defaulted to 762mm based on history")
   - originalQuery: the exact words the user used for this item
3. If truly nothing found: still call add_to_order with itemNum="" and confidence "low"

IMPORTANT: Always include alternatives array (top 2-4 other options from the search). This lets users correct matches without re-typing.
Use Australian spelling. The catalog has 360 products from 84 suppliers.`;

const TOOLS = [
  {
    name: 'search_catalog',
    description: 'Search the product catalog by keyword, item number, description, or supplier name.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'add_to_order',
    description: 'Add a matched item to the order. Always include alternatives and confidence.',
    input_schema: {
      type: 'object',
      properties: {
        supplier: { type: 'string' },
        itemNum: { type: 'string' },
        desc: { type: 'string' },
        unitPrice: { type: 'number' },
        qty: { type: 'number' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        alternatives: {
          type: 'array',
          items: { type: 'object', properties: { supplier: { type: 'string' }, itemNum: { type: 'string' }, desc: { type: 'string' }, price: { type: 'number' } } },
        },
        originalQuery: { type: 'string' },
        specNotes: { type: 'string' },
      },
      required: ['supplier', 'itemNum', 'desc', 'unitPrice', 'qty', 'confidence', 'originalQuery'],
    },
  },
];
