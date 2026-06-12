const MEMORY_KEY = 'rsd_order_corrections';

export interface Correction {
  itemNum: string;
  supplier: string;
  desc: string;
  unitPrice: number;
}

function getAll(): Record<string, Correction> {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getCorrection(query: string): Correction | null {
  return getAll()[query.toLowerCase().trim()] || null;
}

export function saveCorrection(query: string, correction: Correction): void {
  const mem = getAll();
  mem[query.toLowerCase().trim()] = correction;
  localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
}

export function getAllCorrections(): Record<string, Correction> {
  return getAll();
}

export function clearCorrections(): void {
  localStorage.removeItem(MEMORY_KEY);
}
