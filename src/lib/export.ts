import type { OrderGroup, OrderItem } from './types';

export function exportToCSV(groups: OrderGroup[]): void {
  const rows: string[] = [
    'Supplier,Account No,Item Code,Description,Qty,Unit Price,Total'
  ];

  for (const group of groups) {
    const acct = group.supplierDetails?.['Account/Customer code'] || '';
    for (const item of group.items) {
      const total = (item.qty * item.unitPrice).toFixed(2);
      rows.push([
        `"${group.supplier}"`,
        `"${acct}"`,
        `"${item.itemNum}"`,
        `"${item.desc.replace(/"/g, '""')}"`,
        item.qty.toString(),
        item.unitPrice.toFixed(2),
        total,
      ].join(','));
    }
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RSD_Order_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToPDF(groups: OrderGroup[]): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkY = (needed: number) => {
    if (y + needed > 275) addPage();
  };

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Purchase Order', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-AU')}`, margin, y);
  y += 10;

  // Grand total
  const grandTotal = groups.reduce((s, g) => s + g.subtotal, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total (ex GST): $${grandTotal.toFixed(2)}`, margin, y);
  y += 10;

  for (const group of groups) {
    checkY(20);

    // Supplier header
    doc.setFillColor(30, 64, 175);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y, pageW - 2 * margin, 7, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(group.supplier, margin + 2, y + 5);
    y += 9;

    doc.setTextColor(0, 0, 0);

    // Supplier details
    if (group.supplierDetails) {
      const sd = group.supplierDetails;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const details = [
        sd.Email && `Email: ${sd.Email}`,
        sd.Phone && `Phone: ${sd.Phone}`,
        sd['Account/Customer code'] && `Account: ${sd['Account/Customer code']}`,
        sd['Orders Contact'] && `Contact: ${sd['Orders Contact']}`,
      ].filter(Boolean).join('   ');
      if (details) {
        checkY(6);
        doc.text(details, margin, y);
        y += 5;
      }
      if (sd.Notes) {
        checkY(6);
        doc.setTextColor(150, 50, 0);
        doc.text(`Note: ${sd.Notes}`, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      }
    }
    y += 2;

    // Table header
    checkY(8);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageW - 2 * margin, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const cols = { itemNum: margin + 1, desc: margin + 38, qty: margin + 110, unit: margin + 125, total: margin + 145 };
    doc.text('Item Code', cols.itemNum, y + 4);
    doc.text('Description', cols.desc, y + 4);
    doc.text('Qty', cols.qty, y + 4);
    doc.text('Unit $', cols.unit, y + 4);
    doc.text('Total $', cols.total, y + 4);
    y += 7;

    // Items
    doc.setFont('helvetica', 'normal');
    for (const item of group.items) {
      const lineHeight = 5;
      const descLines = doc.splitTextToSize(item.desc, 68);
      const rowH = Math.max(lineHeight, descLines.length * 4.5);
      checkY(rowH + 2);

      doc.text(item.itemNum, cols.itemNum, y + 4, { maxWidth: 35 });
      doc.text(descLines, cols.desc, y + 4);
      doc.text(item.qty.toString(), cols.qty, y + 4);
      doc.text(`$${item.unitPrice.toFixed(2)}`, cols.unit, y + 4);
      doc.text(`$${(item.qty * item.unitPrice).toFixed(2)}`, cols.total, y + 4);

      // Row border
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y + rowH + 1, pageW - margin, y + rowH + 1);
      y += rowH + 2;
    }

    // Subtotal
    checkY(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Subtotal: $${group.subtotal.toFixed(2)}`, cols.total - 10, y + 4);
    y += 10;
  }

  doc.save(`RSD_Order_${new Date().toISOString().slice(0, 10)}.pdf`);
}
