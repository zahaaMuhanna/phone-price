export function genId(prefix: string): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") {
    return `${prefix}-${c.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatSaleNumber(n: number): string {
  return `S-${String(n).padStart(4, "0")}`;
}

export function formatReturnNumber(n: number): string {
  return `R-${String(n).padStart(4, "0")}`;
}
