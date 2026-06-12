import { useState } from 'react';
import type { OrderItem, Product } from '../lib/types';
import { searchProducts } from '../lib/catalog';
import { saveCorrection } from '../lib/memory';

interface Props {
  item: OrderItem;
  index: number;
  onUpdate: (id: string, changes: Partial<OrderItem>) => void;
  onRemove: (id: string) => void;
}

export default function OrderRow({ item, index, onUpdate, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  const confidenceClass = {
    high: 'conf-high',
    medium: 'conf-medium',
    low: 'conf-low',
  }[item.confidence];

  const confidenceLabel = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  }[item.confidence];

  const total = item.qty * item.unitPrice;
  const hasFlag = item.confidence !== 'high' || !item.itemNum;

  const handleAlternativeSelect = (product: Product) => {
    const changes: Partial<OrderItem> = {
      supplier: product.supplier,
      itemNum: product.itemNum,
      desc: product.desc,
      unitPrice: product.price,
      confidence: 'high',
      corrected: true,
    };
    onUpdate(item.id, changes);
    saveCorrection(item.originalQuery, {
      itemNum: product.itemNum,
      supplier: product.supplier,
      desc: product.desc,
      unitPrice: product.price,
    });
    setEditing(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length > 1) {
      setSearchResults(searchProducts(q).slice(0, 8));
    } else {
      setSearchResults([]);
    }
  };

  const handleManualDesc = (desc: string) => {
    onUpdate(item.id, { desc, corrected: true });
    if (item.originalQuery) {
      saveCorrection(item.originalQuery, {
        itemNum: item.itemNum,
        supplier: item.supplier,
        desc,
        unitPrice: item.unitPrice,
      });
    }
  };

  return (
    <tr className={`order-row ${item.corrected ? 'row-corrected' : ''}`}>
      <td className="col-num">{index + 1}</td>

      <td className="col-code">
        {item.itemNum ? (
          <span className="item-code">{item.itemNum}</span>
        ) : (
          <span className="item-code no-match">—</span>
        )}
      </td>

      <td className="col-desc">
        <div className="desc-main">{item.desc}</div>

        {/* Alternatives / edit section */}
        <div className="desc-edit">
          {!editing ? (
            <button className="edit-link" onClick={() => setEditing(true)}>
              {item.alternatives.length > 0 ? `▾ ${item.alternatives.length} alternative${item.alternatives.length !== 1 ? 's' : ''}` : '✎ override'}
            </button>
          ) : (
            <div className="edit-panel">
              {/* Alternative items dropdown */}
              {item.alternatives.length > 0 && (
                <div className="alternatives-list">
                  <div className="alt-header">Select alternative:</div>
                  {item.alternatives.map(alt => (
                    <button
                      key={alt.itemNum + alt.supplier}
                      className="alt-option"
                      onClick={() => handleAlternativeSelect(alt)}
                    >
                      <span className="alt-code">{alt.itemNum}</span>
                      <span className="alt-desc">{alt.desc}</span>
                      <span className="alt-supplier">{alt.supplier}</span>
                      <span className="alt-price">${alt.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Free-text search */}
              <div className="search-override">
                <input
                  className="override-input"
                  placeholder="Search catalog or type description…"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !searchResults.length && searchQuery) {
                      handleManualDesc(searchQuery);
                      setEditing(false);
                    }
                  }}
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(r => (
                      <button key={r.itemNum + r.supplier} className="search-result-item" onClick={() => handleAlternativeSelect(r)}>
                        <span className="alt-code">{r.itemNum}</span>
                        <span className="alt-desc">{r.desc}</span>
                        <span className="alt-supplier">{r.supplier}</span>
                        <span className="alt-price">${r.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery && !searchResults.length && (
                  <div className="search-hint">Press Enter to save as override description</div>
                )}
              </div>

              <button className="cancel-edit" onClick={() => { setEditing(false); setSearchQuery(''); setSearchResults([]); }}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {item.specNotes && <div className="spec-notes">{item.specNotes}</div>}
      </td>

      <td className="col-supplier">
        <span className="supplier-name">{item.supplier}</span>
      </td>

      <td className="col-qty">
        <input
          type="number"
          min="1"
          value={item.qty}
          onChange={e => onUpdate(item.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
          className="qty-input"
        />
      </td>

      <td className="col-price">
        <div className="price-wrap">
          <span className="price-prefix">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={item.unitPrice}
            onChange={e => onUpdate(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
            className="price-input"
          />
        </div>
      </td>

      <td className="col-total">${total.toFixed(2)}</td>

      <td className="col-conf">
        <span className={`conf-badge ${confidenceClass}`}>{confidenceLabel}</span>
      </td>

      <td className="col-flag">
        {hasFlag && (
          <span className="flag-icon" title={item.confidence === 'low' ? 'Low confidence match — please review' : 'Review recommended'}>?</span>
        )}
      </td>

      <td className="col-remove">
        <button className="remove-row-btn" onClick={() => onRemove(item.id)} title="Remove">×</button>
      </td>
    </tr>
  );
}
