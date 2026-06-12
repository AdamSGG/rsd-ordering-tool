import type { OrderItem } from '../lib/types';
import { getSupplierDetails } from '../lib/catalog';
import { exportToCSV, exportToPDF } from '../lib/export';
import OrderRow from './OrderRow';

interface Props {
  order: OrderItem[];
  onUpdate: (id: string, changes: Partial<OrderItem>) => void;
  onRemove: (id: string) => void;
  onStartNew: () => void;
}

function getOrderMethod(supplier: ReturnType<typeof getSupplierDetails>): string {
  if (!supplier) return '';
  if (supplier.Email) return `Email: ${supplier.Email}`;
  if (supplier.Website) return `Online: ${supplier.Website}`;
  if (supplier.Phone) return `Phone: ${supplier.Phone}`;
  return '';
}

export default function ResultsTable({ order, onUpdate, onRemove, onStartNew }: Props) {
  const grandTotal = order.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const flagCount = order.filter(i => i.confidence !== 'high' || !i.itemNum).length;

  // Group by supplier
  const supplierGroups = Array.from(
    order.reduce((map, item) => {
      if (!map.has(item.supplier)) map.set(item.supplier, []);
      map.get(item.supplier)!.push(item);
      return map;
    }, new Map<string, OrderItem[]>())
  );

  let rowIndex = 0;

  return (
    <div className="results-panel">
      {/* Toolbar */}
      <div className="results-toolbar">
        <div className="toolbar-left">
          <span className="results-count">{order.length} line{order.length !== 1 ? 's' : ''}</span>
          {flagCount > 0 && (
            <span className="flag-count">⚠ {flagCount} item{flagCount !== 1 ? 's' : ''} need review</span>
          )}
        </div>
        <div className="toolbar-right">
          <button className="btn-tool" onClick={onStartNew}>+ Add More Items</button>
          <button className="btn-tool btn-csv" onClick={() => exportToCSV(order)}>⬇ Export CSV</button>
          <button className="btn-primary" onClick={() => exportToPDF(order)}>Export PDF</button>
        </div>
      </div>

      {/* Grand total */}
      <div className="grand-total-bar">
        <span>Grand Total (ex GST)</span>
        <strong>${grandTotal.toFixed(2)}</strong>
      </div>

      {/* Per-supplier groups */}
      {supplierGroups.map(([supplier, items]) => {
        const sd = getSupplierDetails(supplier);
        const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
        const orderMethod = getOrderMethod(sd);

        return (
          <div key={supplier} className="supplier-section">
            {/* Supplier header */}
            <div className="supplier-header">
              <div className="supplier-header-left">
                <span className="supplier-title">{supplier}</span>
                {sd?.['Account/Customer code'] && sd['Account/Customer code'] !== '-' && sd['Account/Customer code'] !== 'NO ACCOUNT' && (
                  <span className="supplier-tag acct">Acct: {sd['Account/Customer code']}</span>
                )}
                {orderMethod && <span className="supplier-tag order">{orderMethod}</span>}
                {sd?.['Orders Contact'] && <span className="supplier-tag contact">Contact: {sd['Orders Contact']}</span>}
              </div>
              <div className="supplier-header-right">
                <span className="supplier-subtotal">Subtotal: ${subtotal.toFixed(2)}</span>
              </div>
            </div>

            {sd?.Notes && (
              <div className="supplier-note">⚠ {sd.Notes}</div>
            )}

            {/* Table */}
            <table className="order-table">
              <thead>
                <tr>
                  <th className="col-num">#</th>
                  <th className="col-code">Item Code</th>
                  <th className="col-desc">Description</th>
                  <th className="col-supplier">Supplier</th>
                  <th className="col-qty">Qty</th>
                  <th className="col-price">Unit Price</th>
                  <th className="col-total">Total</th>
                  <th className="col-conf">Conf.</th>
                  <th className="col-flag">Flag</th>
                  <th className="col-remove"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <OrderRow
                    key={item.id}
                    item={item}
                    index={rowIndex++}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
