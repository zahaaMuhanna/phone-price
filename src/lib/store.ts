"use client";

import { useSyncExternalStore } from "react";
import type {
  AppData,
  Category,
  Customer,
  ExcessHandling,
  Product,
  Sale,
  SaleReturn,
} from "@/types";
import { emptyData, needsMigration, normalizeData } from "@/lib/migrate";
import { genId } from "@/lib/ids";
import {
  FinanceError,
  recordAdjustment as opAdjustment,
  recordCustomerRefund as opCustomerRefund,
  recordPayment as opPayment,
  recordReturn as opReturn,
  recordSale as opSale,
  type ReturnLineInput,
  type SaleInput,
} from "@/lib/sales-ops";
import { customerSummary } from "@/lib/ledger";

// Same key as before, so every existing user's products and categories are picked up and upgraded in place.
const STORAGE_KEY = "muhanna-price:data:v1";
const BACKUP_KEY = "muhanna-price:backup:v1";

let data: AppData = emptyData();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Reads and (if needed) upgrades stored data. Never throws, never discards unreadable data. */
function load(): AppData {
  if (typeof window === "undefined") return emptyData();
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return emptyData();
  }
  if (!raw) return emptyData();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Unreadable: keep a copy of the raw text so nothing is ever silently lost.
    try {
      window.localStorage.setItem(`muhanna-price:corrupt:${Date.now()}`, raw);
    } catch {}
    return emptyData();
  }

  const normalized = normalizeData(parsed);
  if (needsMigration(parsed)) {
    try {
      // One-time safety copy of the exact original, then write the upgraded data.
      if (!window.localStorage.getItem(BACKUP_KEY)) window.localStorage.setItem(BACKUP_KEY, raw);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {}
  }
  return normalized;
}

function write(next: AppData) {
  if (typeof window === "undefined") throw new FinanceError("لا يمكن الحفظ الآن");
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new FinanceError("تعذر حفظ البيانات (قد تكون مساحة التخزين ممتلئة). لم يتم تنفيذ العملية.");
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  data = load();
  hydrated = true;
  // Keep several open tabs in sync so one tab can never overwrite another's newer records.
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    try {
      data = e.newValue ? normalizeData(JSON.parse(e.newValue)) : emptyData();
    } catch {
      return;
    }
    emit();
  });
}

/**
 * The single write path. Runs `op` against the latest data, saves, and only then swaps the
 * in-memory state. If `op` throws or the save fails, nothing changes (no half-written sale).
 */
function commit<R>(op: (current: AppData) => { data: AppData; result: R }): R {
  ensureHydrated();
  // Re-read what is on disk first so a stale tab can't clobber newer records.
  const current = typeof window !== "undefined" ? (() => { try { const r = window.localStorage.getItem(STORAGE_KEY); return r ? normalizeData(JSON.parse(r)) : data; } catch { return data; } })() : data;
  const out = op(current);
  write(out.data);
  data = out.data;
  emit();
  return out.result;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppData {
  ensureHydrated();
  return data;
}

const EMPTY_DATA: AppData = emptyData();

function getServerSnapshot(): AppData {
  return EMPTY_DATA;
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** False during server render / first paint, true once localStorage has been read. Use for loading states. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/* --------------------------- Categories --------------------------- */

export function addCategory(name: string): Category {
  const category: Category = { id: genId("cat"), name: name.trim(), createdAt: Date.now() };
  return commit((d) => ({ data: { ...d, categories: [...d.categories, category] }, result: category }));
}

export function updateCategory(id: string, name: string) {
  commit((d) => ({
    data: { ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)) },
    result: undefined,
  }));
}

export function deleteCategory(id: string) {
  commit((d) => {
    if (d.products.some((p) => p.categoryId === id)) throw new Error("لا يمكن حذف صنف يحتوي على منتجات");
    return { data: { ...d, categories: d.categories.filter((c) => c.id !== id) }, result: undefined };
  });
}

/* ---------------------------- Products ---------------------------- */

export interface ProductInput {
  name: string;
  categoryId: string;
  priceAgorot: number;
  notes?: string;
  imageUrl?: string;
}

export function addProduct(input: ProductInput): Product {
  const now = Date.now();
  const product: Product = {
    id: genId("prod"),
    name: input.name.trim(),
    categoryId: input.categoryId,
    priceAgorot: input.priceAgorot,
    notes: input.notes?.trim() || undefined,
    imageUrl: input.imageUrl?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  return commit((d) => ({ data: { ...d, products: [...d.products, product] }, result: product }));
}

export function updateProduct(id: string, input: ProductInput) {
  commit((d) => ({
    data: {
      ...d,
      products: d.products.map((p) =>
        p.id === id
          ? {
              ...p,
              name: input.name.trim(),
              categoryId: input.categoryId,
              priceAgorot: input.priceAgorot,
              notes: input.notes?.trim() || undefined,
              imageUrl: input.imageUrl?.trim() || undefined,
              updatedAt: Date.now(),
            }
          : p
      ),
    },
    result: undefined,
  }));
}

export function deleteProduct(id: string) {
  // Safe for history: sale items keep a snapshot of the product name and category.
  commit((d) => ({ data: { ...d, products: d.products.filter((p) => p.id !== id) }, result: undefined }));
}

/* ---------------------------- Customers --------------------------- */

export interface CustomerInput {
  name: string;
  phone?: string;
  notes?: string;
}

export function addCustomer(input: CustomerInput): Customer {
  const name = input.name.trim();
  if (!name) throw new FinanceError("الرجاء إدخال اسم العميل");
  const customer: Customer = {
    id: genId("cust"),
    name,
    phone: input.phone?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: Date.now(),
  };
  return commit((d) => ({ data: { ...d, customers: [...d.customers, customer] }, result: customer }));
}

export function updateCustomer(id: string, input: CustomerInput) {
  const name = input.name.trim();
  if (!name) throw new FinanceError("الرجاء إدخال اسم العميل");
  commit((d) => ({
    data: {
      ...d,
      customers: d.customers.map((c) =>
        c.id === id ? { ...c, name, phone: input.phone?.trim() || undefined, notes: input.notes?.trim() || undefined } : c
      ),
    },
    result: undefined,
  }));
}

export function setCustomerArchived(id: string, archived: boolean) {
  commit((d) => ({
    data: { ...d, customers: d.customers.map((c) => (c.id === id ? { ...c, archived: archived || undefined } : c)) },
    result: undefined,
  }));
}

/** Only customers with no recorded transactions can be deleted; the rest must be archived. */
export function deleteCustomer(id: string) {
  commit((d) => {
    if (customerSummary(d.ledger, id).hasHistory || d.sales.some((s) => s.customerId === id)) {
      throw new FinanceError("لا يمكن حذف عميل لديه حركات مالية، يمكنك أرشفته");
    }
    return { data: { ...d, customers: d.customers.filter((c) => c.id !== id) }, result: undefined };
  });
}

/* --------------------------- Finance ops -------------------------- */

export function recordSale(input: SaleInput): Sale {
  return commit((d) => {
    const r = opSale(d, input);
    return { data: r.data, result: r.sale };
  });
}

export function recordPayment(input: { customerId: string; amountAgorot: number; note?: string }) {
  commit((d) => ({ data: opPayment(d, input), result: undefined }));
}

export function recordCustomerRefund(input: { customerId: string; amountAgorot: number; note?: string }) {
  commit((d) => ({ data: opCustomerRefund(d, input), result: undefined }));
}

export function recordAdjustment(input: {
  customerId: string;
  direction: "increase" | "decrease";
  amountAgorot: number;
  note: string;
}) {
  commit((d) => ({ data: opAdjustment(d, input), result: undefined }));
}

export function recordReturn(input: {
  saleId: string;
  lines: ReturnLineInput[];
  excessHandling: ExcessHandling;
  reason?: string;
}): SaleReturn {
  return commit((d) => {
    const r = opReturn(d, input);
    return { data: r.data, result: r.saleReturn };
  });
}

export { FinanceError };
