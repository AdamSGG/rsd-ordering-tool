import { useState, useCallback } from 'react';
import ChatPanel from './components/ChatPanel';
import OrderPanel from './components/OrderPanel';
import type { ChatMessage, OrderItem } from './lib/types';
import { searchProducts, getSupplierDetails } from './lib/catalog';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "G'day! I'm your RSD ordering assistant. Tell me what you need to order — you can use plain language, item codes, or product descriptions. What would you like to order today?",
    },
  ]);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const addToOrder = useCallback((item: OrderItem) => {
    setOrder(prev => {
      const existing = prev.findIndex(i => i.itemNum === item.itemNum);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + item.qty };
        return updated;
      }
      const supplierDetails = getSupplierDetails(item.supplier);
      return [...prev, { ...item, supplierDetails }];
    });
  }, []);

  const removeFromOrder = useCallback((itemNum: string) => {
    setOrder(prev => prev.filter(i => i.itemNum !== itemNum));
  }, []);

  const updateQty = useCallback((itemNum: string, qty: number) => {
    if (qty <= 0) { removeFromOrder(itemNum); return; }
    setOrder(prev => prev.map(i => i.itemNum === itemNum ? { ...i, qty } : i));
  }, [removeFromOrder]);

  const sendMessage = useCallback(async (userText: string) => {
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build API messages, filtering to just role/content
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, order }),
      });

      const data = await resp.json() as {
        content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>;
        stop_reason?: string;
      };

      // Process tool use and text responses
      let assistantText = '';
      const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = [];

      for (const block of data.content) {
        if (block.type === 'text' && block.text) {
          assistantText += block.text;
        } else if (block.type === 'tool_use' && block.name && block.input) {
          const result = await handleToolUse(block.name, block.input as Record<string, unknown>);
          toolResults.push({ type: 'tool_result', tool_use_id: (block as { id?: string }).id || '', content: result });
        }
      }

      // If tool use occurred, make a follow-up call to get the final text response
      if (toolResults.length > 0) {
        const followUpMessages = [
          ...apiMessages,
          { role: 'assistant', content: data.content },
          { role: 'user', content: toolResults },
        ];

        const resp2 = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: followUpMessages, order }),
        });

        const data2 = await resp2.json() as { content: Array<{ type: string; text?: string }> };
        assistantText = data2.content
          .filter(b => b.type === 'text')
          .map(b => b.text || '')
          .join('');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, order]);

  async function handleToolUse(name: string, input: Record<string, unknown>): Promise<string> {
    if (name === 'search_catalog') {
      const results = searchProducts(input.query as string);
      if (results.length === 0) return 'No products found matching that query.';
      return JSON.stringify(results);
    }

    if (name === 'add_to_order') {
      addToOrder({
        supplier: input.supplier as string,
        itemNum: input.itemNum as string,
        desc: input.desc as string,
        unitPrice: input.unitPrice as number,
        qty: input.qty as number,
      });
      return `Added ${input.qty}x ${input.itemNum} to order.`;
    }

    if (name === 'remove_from_order') {
      removeFromOrder(input.itemNum as string);
      return `Removed ${input.itemNum} from order.`;
    }

    if (name === 'update_qty') {
      updateQty(input.itemNum as string, input.qty as number);
      return `Updated qty for ${input.itemNum} to ${input.qty}.`;
    }

    return 'Unknown tool';
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">🚧</span>
          <div>
            <h1>RSD Ordering Tool</h1>
            <p>Reflective Signs &amp; Decals — Purchase Order Assistant</p>
          </div>
        </div>
      </header>
      <main className="app-main">
        <ChatPanel messages={messages} loading={loading} onSend={sendMessage} />
        <OrderPanel order={order} onRemove={removeFromOrder} onUpdateQty={updateQty} />
      </main>
    </div>
  );
}
