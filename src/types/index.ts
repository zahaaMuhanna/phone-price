export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  /** Price stored as an integer in agorot (1 ILS = 100 agorot) to avoid floating point errors. */
  priceAgorot: number;
  notes?: string;
  /** Optional product image URL. */
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  /** Archived customers are hidden from pickers but keep their full history. */
  archived?: boolean;
  createdAt: number;
}

export type PaymentMethod = "cash" | "credit" | "partial";

/** Invoice header. Money fields are integer agorot. */
export interface Sale {
  id: string;
  /** Human readable sequential number (displayed as S-0001). */
  number: number;
  /** null = walk-in customer (cash sale only). */
  customerId: string | null;
  paymentMethod: PaymentMethod;
  /** Actual invoice total = sum of (unitPrice * quantity). Never the list price. */
  totalAgorot: number;
  /** Cash received at checkout. */
  paidAgorot: number;
  note?: string;
  createdAt: number;
}

/** A line on an invoice. Product data is snapshotted so history survives product edits/deletes. */
export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  /** The product's displayed price at the time of sale (reference only). */
  listPriceAgorot: number;
  /** The actual price charged per unit. */
  unitPriceAgorot: number;
  quantity: number;
}

export type LedgerEntryType =
  /** Debit: the customer owes this amount for an invoice. */
  | "SALE"
  /** Credit + cash in: money received (at checkout or later). */
  | "PAYMENT_IN"
  /** Credit, no cash: value of returned goods. */
  | "RETURN_CREDIT"
  /** Debit + cash out: money paid back to the customer. */
  | "REFUND_OUT"
  /** Manual debit (increases what the customer owes). */
  | "ADJUSTMENT_DEBIT"
  /** Manual credit (decreases what the customer owes). */
  | "ADJUSTMENT_CREDIT";

/** Append-only. Entries are never edited or deleted. amountAgorot is always positive. */
export interface LedgerEntry {
  id: string;
  /** Monotonic sequence used for stable ordering. */
  seq: number;
  type: LedgerEntryType;
  /** null = walk-in (no customer account). */
  customerId: string | null;
  amountAgorot: number;
  saleId?: string;
  returnId?: string;
  description: string;
  createdAt: number;
}

export interface SaleReturnLine {
  saleItemId: string;
  quantity: number;
  /** quantity * the original unit price. */
  valueAgorot: number;
}

export type ExcessHandling = "refund" | "credit";

export interface SaleReturn {
  id: string;
  number: number;
  saleId: string;
  customerId: string | null;
  lines: SaleReturnLine[];
  valueAgorot: number;
  /** Portion that reduced the customer's outstanding debt. */
  debtReductionAgorot: number;
  /** Portion the customer had already paid. */
  excessAgorot: number;
  excessHandling: ExcessHandling;
  /** Cash actually paid back. */
  cashRefundAgorot: number;
  reason?: string;
  createdAt: number;
}

export interface Counters {
  sale: number;
  return: number;
  ledger: number;
}

export const SCHEMA_VERSION = 2;

export interface AppData {
  schemaVersion: number;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  saleItems: SaleItem[];
  ledger: LedgerEntry[];
  returns: SaleReturn[];
  counters: Counters;
}
