export interface Product {
  supplier: string;
  itemNum: string;
  desc: string;
  price: number;
}

export interface Supplier {
  Supplier: string;
  Email: string;
  Phone: string;
  'Account/Customer code': string;
  Website: string;
  'Orders Contact': string;
  Notes: string;
}

export interface OrderItem {
  id: string;
  supplier: string;
  itemNum: string;
  desc: string;
  unitPrice: number;
  qty: number;
  confidence: 'high' | 'medium' | 'low';
  alternatives: Product[];
  originalQuery: string;
  specNotes: string;
  supplierDetails?: Supplier;
  corrected?: boolean;
}

export interface OrderGroup {
  supplier: string;
  supplierDetails?: Supplier;
  items: OrderItem[];
  subtotal: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | unknown[];
}

export type AppStep = 'interpret' | 'order';
