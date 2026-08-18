"use client";

import { useSyncExternalStore } from "react";
import type { AppData, Category, Product } from "@/types";
import { buildSeedData } from "@/lib/seed-data";

const STORAGE_KEY = "muhanna-price:data:v1";

let data: AppData = { categories: [], products: [] };
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function load(): AppData {
  if (typeof window === "undefined") return { categories: [], products: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeedData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as AppData;
  } catch {
    return buildSeedData();
  }
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  emit();
}

function ensureHydrated() {
  if (!hydrated && typeof window !== "undefined") {
    data = load();
    hydrated = true;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppData {
  ensureHydrated();
  return data;
}

const EMPTY_DATA: AppData = { categories: [], products: [] };

function getServerSnapshot(): AppData {
  return EMPTY_DATA;
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addCategory(name: string): Category {
  ensureHydrated();
  const category: Category = { id: genId("cat"), name: name.trim(), createdAt: Date.now() };
  data = { ...data, categories: [...data.categories, category] };
  persist();
  return category;
}

export function updateCategory(id: string, name: string) {
  ensureHydrated();
  data = {
    ...data,
    categories: data.categories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)),
  };
  persist();
}

export function deleteCategory(id: string) {
  ensureHydrated();
  const inUse = data.products.some((p) => p.categoryId === id);
  if (inUse) throw new Error("لا يمكن حذف صنف يحتوي على منتجات");
  data = { ...data, categories: data.categories.filter((c) => c.id !== id) };
  persist();
}

export interface ProductInput {
  name: string;
  categoryId: string;
  priceAgorot: number;
  notes?: string;
}

export function addProduct(input: ProductInput): Product {
  ensureHydrated();
  const now = Date.now();
  const product: Product = {
    id: genId("prod"),
    name: input.name.trim(),
    categoryId: input.categoryId,
    priceAgorot: input.priceAgorot,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  data = { ...data, products: [...data.products, product] };
  persist();
  return product;
}

export function updateProduct(id: string, input: ProductInput) {
  ensureHydrated();
  data = {
    ...data,
    products: data.products.map((p) =>
      p.id === id
        ? {
            ...p,
            name: input.name.trim(),
            categoryId: input.categoryId,
            priceAgorot: input.priceAgorot,
            notes: input.notes?.trim() || undefined,
            updatedAt: Date.now(),
          }
        : p
    ),
  };
  persist();
}

export function deleteProduct(id: string) {
  ensureHydrated();
  data = { ...data, products: data.products.filter((p) => p.id !== id) };
  persist();
}
