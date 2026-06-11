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
  supplier: string;
  itemNum: string;
  desc: string;
  unitPrice: number;
  qty: number;
  supplierDetails?: Supplier;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OrderGroup {
  supplier: string;
  supplierDetails?: Supplier;
  items: OrderItem[];
  subtotal: number;
}
