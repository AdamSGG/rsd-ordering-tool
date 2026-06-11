import type { OrderItem, OrderGroup } from '../lib/types';
import { getSupplierDetails } from '../lib/catalog';
import { exportToCSV, exportToPDF } from '../lib/export';

interface Props {
  order: OrderItem[];
  onRemove: (itemNum: string) => void;
  onUpdateQty: (itemNum: string, qty: number) => void;
}

function buildGroups(order: OrderItem[]): OrderGroup[] {
  const map = new Map<string, OrderGroup>();
  for (const item of order) {
    if (!map.has(item.supplier)) {
      map.set(item.supplier, {
        supplier: item.supplier,
        supplierDetails: getSupplierDetails(item.supplier),
        items: [],
        subtotal: 0,
      });
    }
    const group = map.get(item.supplier)!;
    group.items.push(item);
    group.subtotal += item.qty * item.unitPrice;
  }
  return Array.from(map.values());
}

export default function OrderPanel({ order, onRemove, onUpdateQty }: Props) {
  const groups = buildGroups(order);
  const grandTotal = groups.reduce((s, g) => s + g.subtotal, 0);
  const itemCount = order.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="order-panel">
      <div className="order-header">
        <h2>Current Order</h2>
        {order.length > 0 && (
          <span className="order-badge">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      {order.length === 0 ? (
        <div className="order-empty">
          <div className="order-empty-icon">📋</div>
          <p>Your order is empty.</p>
          <p>Use the chat to add items.</p>
        </div>
      ) : (
        <>
          <div className="order-groups">
            {groups.map(group => (
              <div key={group.supplier} className="order-group">
                <div className="group-header">
                  <div className="group-name">{group.supplier}</div>
                  {group.supplierDetails && (
                    <SupplierInfo details={group.supplierDetails} />
                  )}
                </div>

                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Unit $</th>
                      <th>Total $</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map(item => (
                      <tr key={item.itemNum}>
                        <td className="code-cell">{item.itemNum}</td>
                        <td className="desc-cell">{item.desc}</td>
                        <td className="qty-cell">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={e => onUpdateQty(item.itemNum, parseInt(e.target.value) || 0)}
                            className="qty-input"
                          />
                        </td>
                        <td>${item.unitPrice.toFixed(2)}</td>
                        <td className="total-cell">${(item.qty * item.unitPrice).toFixed(2)}</td>
                        <td>
                          <button
                            className="remove-btn"
                            onClick={() => onRemove(item.itemNum)}
                            title="Remove item"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="subtotal-label">Subtotal (ex GST)</td>
                      <td className="subtotal-value">${group.subtotal.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
          </div>

          <div className="order-footer">
            <div className="grand-total">
              Grand Total (ex GST): <strong>${grandTotal.toFixed(2)}</strong>
            </div>
            <div className="export-buttons">
              <button
                className="export-btn export-csv"
                onClick={() => exportToCSV(groups)}
              >
                ⬇ Export CSV
              </button>
              <button
                className="export-btn export-pdf"
                onClick={() => exportToPDF(groups)}
              >
                📄 Export PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SupplierInfo({ details }: { details: NonNullable<OrderGroup['supplierDetails']> }) {
  const acct = details['Account/Customer code'];
  const orderMethod = details.Email
    ? `Email: ${details.Email}`
    : details.Phone
    ? `Phone: ${details.Phone}`
    : details.Website
    ? `Online: ${details.Website}`
    : null;

  return (
    <div className="supplier-info">
      {acct && acct !== '-' && acct !== 'NO ACCOUNT' && (
        <span className="supplier-tag acct">Acct: {acct}</span>
      )}
      {orderMethod && <span className="supplier-tag order">{orderMethod}</span>}
      {details['Orders Contact'] && (
        <span className="supplier-tag contact">Contact: {details['Orders Contact']}</span>
      )}
      {details.Notes && <span className="supplier-tag note">⚠ {details.Notes}</span>}
    </div>
  );
}
