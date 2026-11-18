export function agorotToShekels(agorot: number): number {
  return agorot / 100;
}

export function shekelsToAgorot(shekels: number): number {
  return Math.round(shekels * 100);
}

export function formatPrice(agorot: number): string {
  const shekels = agorotToShekels(agorot);
  const hasFraction = !Number.isInteger(shekels);
  const formatted = hasFraction ? shekels.toFixed(2) : shekels.toString();
  return `${formatted} ₪`;
}

/** Parses a user-typed shekel amount ("12", "12.5", "١٢") into agorot. Returns null when invalid. */
export function parseMoney(input: string): number | null {
  const normalized = input
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[،,]/g, ".");
  if (!normalized || !/^\d*\.?\d+$|^\d+\.$/.test(normalized)) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return shekelsToAgorot(n);
}

/** Parses a whole-number quantity. Returns null when invalid. */
export function parseQuantity(input: string): number | null {
  const normalized = input.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  if (!/^\d+$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isSafeInteger(n) ? n : null;
}

const dateTimeFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short" });
const dateFmt = new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium" });

export function formatDateTime(ts: number): string {
  return dateTimeFmt.format(new Date(ts));
}

export function formatDate(ts: number): string {
  return dateFmt.format(new Date(ts));
}

/** yyyy-mm-dd in local time, for <input type="date">. */
export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Local start of the day for a yyyy-mm-dd string. */
export function fromDateInputValue(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}
