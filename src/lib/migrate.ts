import { SCHEMA_VERSION } from "../types";
import type {
  AppData,
  Category,
  Customer,
  LedgerEntry,
  Product,
  Sale,
  SaleItem,
  SaleReturn,
} from "../types";

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function arr(v: unknown): Rec[] {
  return Array.isArray(v) ? v.filter((x): x is Rec & { id: string } => isRec(x) && typeof x.id === "string" && x.id !== "") : [];
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function optStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: [],
    products: [],
    customers: [],
    sales: [],
    saleItems: [],
    ledger: [],
    returns: [],
    counters: { sale: 0, return: 0, ledger: 0 },
  };
}

/**
 * Turns anything that was ever stored (v1 `{categories, products}`, v2, or garbage)
 * into a valid v2 AppData. Existing ids are always preserved and nothing is replaced by seed data.
 * Idempotent: normalize(normalize(x)) deep-equals normalize(x).
 */
export function normalizeData(raw: unknown, now: number = Date.now()): AppData {
  const out = emptyData();
  if (!isRec(raw)) return out;

  out.categories = arr(raw.categories).map(
    (c): Category => ({
      id: str(c.id),
      name: str(c.name, "بدون اسم"),
      createdAt: num(c.createdAt, now),
    })
  );

  out.products = arr(raw.products).map(
    (p): Product => ({
      id: str(p.id),
      name: str(p.name, "بدون اسم"),
      categoryId: str(p.categoryId),
      priceAgorot: Math.max(0, Math.round(num(p.priceAgorot, 0))),
      notes: optStr(p.notes),
      imageUrl: optStr(p.imageUrl),
      createdAt: num(p.createdAt, now),
      updatedAt: num(p.updatedAt, num(p.createdAt, now)),
    })
  );

  out.customers = arr(raw.customers).map(
    (c): Customer => ({
      id: str(c.id),
      name: str(c.name, "بدون اسم"),
      phone: optStr(c.phone),
      notes: optStr(c.notes),
      archived: c.archived === true ? true : undefined,
      createdAt: num(c.createdAt, now),
    })
  );

  out.sales = arr(raw.sales).map(
    (s): Sale => ({
      id: str(s.id),
      number: num(s.number),
      customerId: typeof s.customerId === "string" ? s.customerId : null,
      paymentMethod: s.paymentMethod === "credit" || s.paymentMethod === "partial" ? s.paymentMethod : "cash",
      totalAgorot: num(s.totalAgorot),
      paidAgorot: num(s.paidAgorot),
      note: optStr(s.note),
      createdAt: num(s.createdAt, now),
    })
  );

  out.saleItems = arr(raw.saleItems).map(
    (i): SaleItem => ({
      id: str(i.id),
      saleId: str(i.saleId),
      productId: str(i.productId),
      productName: str(i.productName),
      categoryId: str(i.categoryId),
      categoryName: str(i.categoryName),
      listPriceAgorot: num(i.listPriceAgorot),
      unitPriceAgorot: num(i.unitPriceAgorot),
      quantity: num(i.quantity, 1),
    })
  );

  const ledgerTypes = ["SALE", "PAYMENT_IN", "RETURN_CREDIT", "REFUND_OUT", "ADJUSTMENT_DEBIT", "ADJUSTMENT_CREDIT"];
  out.ledger = arr(raw.ledger)
    .filter((e) => typeof e.type === "string" && ledgerTypes.includes(e.type))
    .map(
      (e): LedgerEntry => ({
        id: str(e.id),
        seq: num(e.seq),
        type: e.type as LedgerEntry["type"],
        customerId: typeof e.customerId === "string" ? e.customerId : null,
        amountAgorot: num(e.amountAgorot),
        saleId: optStr(e.saleId),
        returnId: optStr(e.returnId),
        description: str(e.description),
        createdAt: num(e.createdAt, now),
      })
    );

  out.returns = arr(raw.returns).map(
    (r): SaleReturn => ({
      id: str(r.id),
      number: num(r.number),
      saleId: str(r.saleId),
      customerId: typeof r.customerId === "string" ? r.customerId : null,
      lines: Array.isArray(r.lines)
        ? r.lines.filter(isRec).map((l) => ({
            saleItemId: str(l.saleItemId),
            quantity: num(l.quantity),
            valueAgorot: num(l.valueAgorot),
          }))
        : [],
      valueAgorot: num(r.valueAgorot),
      debtReductionAgorot: num(r.debtReductionAgorot),
      excessAgorot: num(r.excessAgorot),
      excessHandling: r.excessHandling === "credit" ? "credit" : "refund",
      cashRefundAgorot: num(r.cashRefundAgorot),
      reason: optStr(r.reason),
      createdAt: num(r.createdAt, now),
    })
  );

  const c = isRec(raw.counters) ? raw.counters : {};
  // Counters can never be lower than what is already recorded, so numbers/seq never repeat.
  out.counters = {
    sale: Math.max(num(c.sale), ...out.sales.map((s) => s.number), 0),
    return: Math.max(num(c.return), ...out.returns.map((r) => r.number), 0),
    ledger: Math.max(num(c.ledger), ...out.ledger.map((e) => e.seq), 0),
  };

  return out;
}

/** True when stored data was written by an older schema and needs upgrading on disk. */
export function needsMigration(raw: unknown): boolean {
  return !isRec(raw) || raw.schemaVersion !== SCHEMA_VERSION;
}
