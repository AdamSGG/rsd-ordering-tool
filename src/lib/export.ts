import type { OrderItem } from './types';
import { getSupplierDetails } from './catalog';

function buildGroups(order: OrderItem[]) {
  const map = new Map<string, { supplier: string; items: OrderItem[]; subtotal: number }>();
  for (const item of order) {
    if (!map.has(item.supplier)) map.set(item.supplier, { supplier: item.supplier, items: [], subtotal: 0 });
    const g = map.get(item.supplier)!;
    g.items.push(item);
    g.subtotal += item.qty * item.unitPrice;
  }
  return Array.from(map.values());
}

export function exportToCSV(order: OrderItem[]): void {
  const rows = ['Supplier,Account No,Item Code,Description,Qty,Unit Price,Total'];
  for (const item of order) {
    const sd = getSupplierDetails(item.supplier);
    const acct = sd?.['Account/Customer code'] || '';
    rows.push([
      `"${item.supplier}"`, `"${acct}"`, `"${item.itemNum}"`,
      `"${item.desc.replace(/"/g, '""')}"`,
      item.qty, item.unitPrice.toFixed(2), (item.qty * item.unitPrice).toFixed(2),
    ].join(','));
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `RSD_Order_${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportToPDF(order: OrderItem[]): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = margin;
  const checkY = (n: number) => { if (y + n > 195) { doc.addPage(); y = margin; } };

  // Header
  doc.setFillColor(28, 43, 58);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('RSD Purchase Order', margin, 12);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-AU')}`, pageW - margin, 12, { align: 'right' });
  y = 26;
  doc.setTextColor(0, 0, 0);

  const groups = buildGroups(order);
  const grandTotal = groups.reduce((s, g) => s + g.subtotal, 0);

  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total (ex GST): $${grandTotal.toFixed(2)}`, pageW - margin, y, { align: 'right' });
  y += 8;

  const cols = { num: margin, supplier: margin + 6, code: margin + 52, desc: margin + 90, qty: margin + 168, unit: margin + 182, total: margin + 200 };

  for (const group of groups) {
    checkY(14);
    const sd = getSupplierDetails(group.supplier);
    doc.setFillColor(28, 43, 58);
    doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(group.supplier, margin + 2, y + 5);
    if (sd?.['Account/Customer code']) doc.text(`Acct: ${sd['Account/Customer code']}`, pageW - margin - 2, y + 5, { align: 'right' });
    y += 9; doc.setTextColor(0, 0, 0);

    if (sd?.Email || sd?.Phone) {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      const contact = [sd?.Email && `Email: ${sd.Email}`, sd?.Phone && `Ph: ${sd.Phone}`, sd?.['Orders Contact'] && `Contact: ${sd['Orders Contact']}`].filter(Boolean).join('   ');
      doc.text(contact, margin, y); y += 4;
    }
    if (sd?.Notes) {
      doc.setFontSize(7); doc.setTextColor(180, 80, 0);
      doc.text(`Note: ${sd.Notes}`, margin, y); y += 4; doc.setTextColor(0, 0, 0);
    }
    y += 1;

    // Table header
    doc.setFillColor(240, 242, 245);
    doc.rect(margin, y, pageW - 2 * margin, 5.5, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100);
    doc.text('#', cols.num, y + 4);
    doc.text('Item Code', cols.code, y + 4);
    doc.text('Description', cols.desc, y + 4);
    doc.text('Qty', cols.qty, y + 4);
    doc.text('Unit $', cols.unit, y + 4);
    doc.text('Total $', cols.total, y + 4);
    y += 6.5; doc.setTextColor(0, 0, 0);

    group.items.forEach((item, idx) => {
      const descLines = doc.splitTextToSize(item.desc, 75);
      const rowH = Math.max(5.5, descLines.length * 4);
      checkY(rowH + 1);
      if (idx % 2 === 1) { doc.setFillColor(248, 249, 251); doc.rect(margin, y, pageW - 2 * margin, rowH, 'F'); }
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
      doc.text(String(idx + 1), cols.num, y + 4);
      doc.text(item.itemNum || '—', cols.code, y + 4, { maxWidth: 36 });
      doc.text(descLines, cols.desc, y + 4);
      doc.text(String(item.qty), cols.qty, y + 4);
      doc.text(`$${item.unitPrice.toFixed(2)}`, cols.unit, y + 4);
      doc.text(`$${(item.qty * item.unitPrice).toFixed(2)}`, cols.total, y + 4);
      doc.setDrawColor(230); doc.line(margin, y + rowH, pageW - margin, y + rowH);
      y += rowH + 0.5;
    });

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(`Subtotal: $${group.subtotal.toFixed(2)}`, cols.total - 8, y + 4);
    y += 8;
  }

  doc.save(`RSD_Order_${new Date().toISOString().slice(0, 10)}.pdf`);
}
