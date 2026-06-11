import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

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
      properties: { query: { type: 'string', description: 'Search term' } },
      required: ['query'],
    },
  },
  {
    name: 'add_to_order',
    description: 'Add an item to the current order list.',
    input_schema: {
      type: 'object',
      properties: {
        supplier: { type: 'string' },
        itemNum: { type: 'string' },
        desc: { type: 'string' },
        unitPrice: { type: 'number' },
        qty: { type: 'number' },
      },
      required: ['supplier', 'itemNum', 'desc', 'unitPrice', 'qty'],
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
