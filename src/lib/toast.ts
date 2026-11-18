"use client";

import { useSyncExternalStore } from "react";

export type ToastKind = "success" | "error";
export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: ToastItem[] = [];

function emit() {
  for (const l of listeners) l();
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(kind: ToastKind, message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  emit();
  setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  dismiss,
};

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => EMPTY
  );
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "حدث خطأ غير متوقع";
}
