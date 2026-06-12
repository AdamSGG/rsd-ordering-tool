import { useState, useCallback } from 'react';
import InterpretPanel from './components/InterpretPanel';
import ResultsTable from './components/ResultsTable';
import type { AppStep, ChatMessage, OrderItem } from './lib/types';
import { searchProducts, getSupplierDetails } from './lib/catalog';
import { getCorrection } from './lib/memory';

let itemIdCounter = 0;
const nextId = () => `item-${++itemIdCounter}`;

export default function App() {
  const [step, setStep] = useState<AppStep>('interpret');
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const addToOrder = useCallback((item: Omit<OrderItem, 'id' | 'supplierDetails'>) => {
    const supplierDetails = getSupplierDetails(item.supplier) ?? undefined;
    setOrder(prev => {
      // Check memory for a correction on this query
      const correction = getCorrection(item.originalQuery);
      const finalItem: OrderItem = correction ? {
        ...item,
        itemNum: correction.itemNum,
        supplier: correction.supplier,
        desc: correction.desc,
        unitPrice: correction.unitPrice,
        confidence: 'high',
        corrected: true,
        supplierDetails: getSupplierDetails(correction.supplier) ?? undefined,
        id: nextId(),
      } : { ...item, supplierDetails, id: nextId() };
      return [...prev, finalItem];
    });
  }, []);

  const updateItem = useCallback((id: string, changes: Partial<OrderItem>) => {
    setOrder(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, ...changes };
      if (changes.supplier) updated.supplierDetails = getSupplierDetails(changes.supplier) ?? undefined;
      return updated;
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setOrder(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleInterpret = useCallback(async (userText: string) => {
    setLoading(true);
    setErrorMsg('');

    const messages: ChatMessage[] = [{ role: 'user', content: userText }];

    try {
      let currentMessages = messages;

      // Loop to handle tool use (may need multiple turns)
      for (let turn = 0; turn < 8; turn++) {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: currentMessages }),
        });

        if (!resp.ok) {
          const err = await resp.json() as { error?: unknown };
          throw new Error(String(err?.error || resp.statusText));
        }

        const data = await resp.json() as {
          content: Array<{
            type: string;
            text?: string;
            name?: string;
            id?: string;
            input?: Record<string, unknown>;
          }>;
          stop_reason: string;
        };

        if (data.stop_reason !== 'tool_use') break;

        // Process tool calls
        const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = [];

        for (const block of data.content) {
          if (block.type !== 'tool_use' || !block.name || !block.input) continue;
          const input = block.input;

          let result = '';
          if (block.name === 'search_catalog') {
            const results = searchProducts(input.query as string);
            result = results.length ? JSON.stringify(results) : 'No products found.';
          } else if (block.name === 'add_to_order') {
            addToOrder({
              supplier: input.supplier as string,
              itemNum: (input.itemNum as string) || '',
              desc: input.desc as string,
              unitPrice: (input.unitPrice as number) || 0,
              qty: (input.qty as number) || 1,
              confidence: (input.confidence as 'high' | 'medium' | 'low') || 'medium',
              alternatives: (input.alternatives as OrderItem['alternatives']) || [],
              originalQuery: (input.originalQuery as string) || '',
              specNotes: (input.specNotes as string) || '',
            });
            result = `Added to order: ${input.itemNum || input.desc}`;
          } else if (block.name === 'remove_from_order') {
            setOrder(prev => prev.filter(i => i.itemNum !== input.itemNum));
            result = `Removed ${input.itemNum}`;
          }

          toolResults.push({ type: 'tool_result', tool_use_id: block.id!, content: result });
        }

        // Continue conversation with tool results
        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: data.content },
          { role: 'user', content: toolResults },
        ];
      }

      // Switch to order view if items were added
      setStep('order');
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [addToOrder]);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">RSD</div>
          <div>
            <div className="header-title">RSD Ordering Tool</div>
            <div className="header-sub">Reflective Signs &amp; Decals · Brisbane</div>
          </div>
        </div>
        <nav className="header-steps">
          <button
            className={`step-btn ${step === 'interpret' ? 'step-active' : ''}`}
            onClick={() => setStep('interpret')}
          >
            1 · Interpret
          </button>
          <button
            className={`step-btn ${step === 'order' ? 'step-active' : ''}`}
            onClick={() => { if (order.length > 0) setStep('order'); }}
            disabled={order.length === 0}
          >
            2 · Order {order.length > 0 && `(${order.length})`}
          </button>
        </nav>
      </header>

      {/* Error banner */}
      {errorMsg && (
        <div className="error-banner">
          ⚠ {errorMsg}
          <button onClick={() => setErrorMsg('')} className="dismiss-error">×</button>
        </div>
      )}

      {/* Main content */}
      <main className="app-main">
        {step === 'interpret' || order.length === 0 ? (
          <InterpretPanel
            loading={loading}
            onInterpret={handleInterpret}
            itemCount={order.length}
          />
        ) : null}

        {step === 'order' && order.length > 0 && (
          <ResultsTable
            order={order}
            onUpdate={updateItem}
            onRemove={removeItem}
            onStartNew={() => setStep('interpret')}
          />
        )}
      </main>
    </div>
  );
}
