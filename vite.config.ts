import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

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
    description: 'Search the product catalog by keyword, item number, description, or supplier name. Returns up to 10 matching products.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search term' } },
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
        itemNum: { type: 'string', description: 'Item code from catalog, or empty string if not found' },
        desc: { type: 'string' },
        unitPrice: { type: 'number', description: 'Last known price from catalog (ex GST)' },
        qty: { type: 'number' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Match confidence' },
        alternatives: {
          type: 'array',
          description: 'Top 2-4 alternative products from search results',
          items: {
            type: 'object',
            properties: {
              supplier: { type: 'string' },
              itemNum: { type: 'string' },
              desc: { type: 'string' },
              price: { type: 'number' },
            },
          },
        },
        originalQuery: { type: 'string', description: 'Exact words from user request for this item' },
        specNotes: { type: 'string', description: 'Brief note on assumptions made (size defaulted, CL assumed, etc.)' },
      },
      required: ['supplier', 'itemNum', 'desc', 'unitPrice', 'qty', 'confidence', 'originalQuery'],
    },
  },
  {
    name: 'remove_from_order',
    description: 'Remove an item from the current order by item number.',
    input_schema: {
      type: 'object',
      properties: { itemNum: { type: 'string' } },
      required: ['itemNum'],
    },
  },
  {
    name: 'update_qty',
    description: 'Update the quantity of an item already in the order.',
    input_schema: {
      type: 'object',
      properties: { itemNum: { type: 'string' }, qty: { type: 'number' } },
      required: ['itemNum', 'qty'],
    },
  },
];

function chatMiddleware(apiKey: string): Connect.HandleFunction {
  return async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    if (req.url !== '/api/chat' || req.method !== 'POST') { next(); return; }

    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
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
        const data = await resp.json();
        res.writeHead(resp.ok ? 200 : resp.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.ANTHROPIC_API_KEY || '';

  return {
    plugins: [
      react(),
      mode === 'development' && apiKey ? {
        name: 'chat-api',
        configureServer(server) {
          server.middlewares.use(chatMiddleware(apiKey));
        },
      } : null,
    ].filter(Boolean),
    build: { outDir: 'dist' },
  };
});
