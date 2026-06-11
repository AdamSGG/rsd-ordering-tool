const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Parse purchase history xlsx
const wb = XLSX.readFile(path.join(__dirname, '../data/purchases.xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log(`Total purchase rows: ${rows.length}`);
console.log('Headers:', Object.keys(rows[0]));

// Build product catalog — deduplicate by supplier+itemNumber, keep latest price
const catalog = {};
rows.forEach(r => {
  const supplier = (r['Supplier Name'] || '').trim();
  const itemNum = (r['Item Number'] || '').trim();
  const desc = (r['Description'] || '').trim().replace(/\r\n/g, ' ').replace(/\n/g, ' ');
  const priceRaw = (r['Price'] || '').toString().replace(/[$,]/g, '');
  const price = parseFloat(priceRaw) || 0;
  const dateRaw = r['Date'];

  if (!supplier || !itemNum || itemNum === 'Item Number') return;

  const key = `${supplier}|||${itemNum}`;
  let date;
  if (typeof dateRaw === 'number') {
    // Excel serial date
    date = XLSX.SSF.parse_date_code(dateRaw);
  } else {
    date = new Date(dateRaw);
  }

  if (!catalog[key] || date > catalog[key]._date) {
    catalog[key] = { supplier, itemNum, desc, price, _date: date };
  }
});

const products = Object.values(catalog).map(({ _date, ...p }) => p);
console.log(`Unique products: ${products.length}`);
console.log(`Unique suppliers: ${[...new Set(products.map(p => p.supplier))].length}`);

// Parse suppliers CSV
const suppliersRaw = fs.readFileSync(path.join(__dirname, '../data/suppliers.csv'), 'utf8');
const lines = suppliersRaw.split(/\r?\n/).filter(l => l.trim());
const headers = lines[1].split(',').map(h => h.trim());
const suppliers = lines.slice(2).map(line => {
  const vals = [];
  let cur = '', inQ = false;
  for (const c of line) {
    if (c === '"') inQ = !inQ;
    else if (c === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  vals.push(cur.trim());
  const obj = {};
  headers.forEach((h, i) => obj[h] = vals[i] || '');
  return obj;
}).filter(s => s['Supplier']);

console.log(`Suppliers: ${suppliers.length}`);

// Save processed catalog
const output = { products, suppliers };
fs.writeFileSync(
  path.join(__dirname, '../data/catalog.json'),
  JSON.stringify(output, null, 2)
);
console.log('Saved data/catalog.json');
