import catalogData from '../data/catalog.json';
import type { Product, Supplier } from './types';

const products = catalogData.products as Product[];
const suppliers = catalogData.suppliers as Supplier[];

export function searchProducts(query: string): Product[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const terms = q.split(/\s+/);

  const scored = products.map(p => {
    const text = `${p.itemNum} ${p.desc} ${p.supplier}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (text.includes(term)) score += term === q ? 10 : 1;
      if (p.itemNum.toLowerCase().includes(term)) score += 5;
      if (p.supplier.toLowerCase().includes(term)) score += 2;
    }
    return { product: p, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => s.product);
}

export function getSupplierDetails(supplierName: string): Supplier | undefined {
  const name = supplierName.toLowerCase();
  return suppliers.find(s => {
    const sn = s.Supplier.toLowerCase();
    return name.includes(sn) || sn.includes(name) || name === sn;
  });
}

export function getAllSuppliers(): string[] {
  return [...new Set(products.map(p => p.supplier))].sort();
}

export { products, suppliers };
