import type {
  AppData,
  LedgerEntry,
  Sale,
  SaleItem,
  SaleReturn,
} from "../types";

/* ------------------------------------------------------------------ */
/* Customer account maths. Balances are ALWAYS derived from the ledger. */
/* Positive balance = the customer owes us. Negative = we owe them.     */
/* ------------------------------------------------------------------ */

export function entryDelta(e: Pick<LedgerEntry, "type" | "amountAgorot">): number {
  switch (e.type) {
    case "SALE":
    case "REFUND_OUT":
    case "ADJUSTMENT_DEBIT":
      return e.amountAgorot;
    case "PAYMENT_IN":
    case "RETURN_CREDIT":
    case "ADJUSTMENT_CREDIT":
      return -e.amountAgorot;
  }
}

export function customerBalance(ledger: LedgerEntry[], customerId: string): number {
  let b = 0;
  for (const e of ledger) if (e.customerId === customerId) b += entryDelta(e);
  return b;
}

export function customerBalances(ledger: LedgerEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of ledger) {
    if (e.customerId === null) continue;
    m.set(e.customerId, (m.get(e.customerId) ?? 0) + entryDelta(e));
  }
  return m;
}

export interface CustomerSummary {
  purchases: number;
  payments: number;
  returns: number;
  refunds: number;
  balance: number;
  hasHistory: boolean;
}

export function customerSummary(ledger: LedgerEntry[], customerId: string): CustomerSummary {
  const s: CustomerSummary = { purchases: 0, payments: 0, returns: 0, refunds: 0, balance: 0, hasHistory: false };
  for (const e of ledger) {
    if (e.customerId !== customerId) continue;
    s.hasHistory = true;
    s.balance += entryDelta(e);
    if (e.type === "SALE") s.purchases += e.amountAgorot;
    else if (e.type === "PAYMENT_IN") s.payments += e.amountAgorot;
    else if (e.type === "RETURN_CREDIT") s.returns += e.amountAgorot;
    else if (e.type === "REFUND_OUT") s.refunds += e.amountAgorot;
  }
  return s;
}

export interface StatementRow {
  entry: LedgerEntry;
  /** Signed effect on the balance. */
  delta: number;
  /** Balance after this entry. */
  balance: number;
}

/** Chronological statement with the running balance after each entry. */
export function customerStatement(ledger: LedgerEntry[], customerId: string): StatementRow[] {
  const entries = ledger
    .filter((e) => e.customerId === customerId)
    .sort((a, b) => a.seq - b.seq || a.createdAt - b.createdAt);
  let balance = 0;
  return entries.map((entry) => {
    const delta = entryDelta(entry);
    balance += delta;
    return { entry, delta, balance };
  });
}

/* ------------------------------------------------------------------ */
/* Sales / returns                                                     */
/* ------------------------------------------------------------------ */

export function returnedQtyByItem(returns: SaleReturn[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of returns) {
    for (const l of r.lines) m.set(l.saleItemId, (m.get(l.saleItemId) ?? 0) + l.quantity);
  }
  return m;
}

export interface SaleItemView {
  item: SaleItem;
  returnedQty: number;
  remainingQty: number;
  lineTotal: number;
}

export interface SaleDetails {
  sale: Sale;
  items: SaleItemView[];
  returns: SaleReturn[];
  ledger: LedgerEntry[];
  returnedValue: number;
  netTotal: number;
  /** Debt that existed at checkout (total - paid). */
  remainingAtSale: number;
  fullyReturned: boolean;
}

export function getSaleDetails(data: AppData, saleId: string): SaleDetails | null {
  const sale = data.sales.find((s) => s.id === saleId);
  if (!sale) return null;
  const returns = data.returns.filter((r) => r.saleId === saleId).sort((a, b) => a.number - b.number);
  const returned = returnedQtyByItem(returns);
  const items = data.saleItems
    .filter((i) => i.saleId === saleId)
    .map((item): SaleItemView => {
      const returnedQty = returned.get(item.id) ?? 0;
      return {
        item,
        returnedQty,
        remainingQty: item.quantity - returnedQty,
        lineTotal: item.quantity * item.unitPriceAgorot,
      };
    });
  const returnedValue = returns.reduce((a, r) => a + r.valueAgorot, 0);
  return {
    sale,
    items,
    returns,
    ledger: data.ledger.filter((e) => e.saleId === saleId).sort((a, b) => a.seq - b.seq),
    returnedValue,
    netTotal: sale.totalAgorot - returnedValue,
    remainingAtSale: sale.totalAgorot - sale.paidAgorot,
    fullyReturned: items.length > 0 && items.every((i) => i.remainingQty === 0),
  };
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfNextDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function startOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

export function startOfNextMonth(ts: number): number {
  const d = new Date(startOfMonth(ts));
  d.setMonth(d.getMonth() + 1);
  return d.getTime();
}

export interface TopProduct {
  key: string;
  name: string;
  soldQty: number;
  returnedQty: number;
  netQty: number;
  netValue: number;
}

export interface PeriodStats {
  /** Σ invoices (actual selling prices). */
  grossSales: number;
  /** Σ value of returned goods. */
  returns: number;
  /** grossSales - returns. */
  netSales: number;
  /** Σ money actually received (checkout + later payments). */
  cashReceived: number;
  /** Σ money actually paid out. */
  refunds: number;
  /** cashReceived - refunds. */
  netCash: number;
  salesCount: number;
  returnsCount: number;
  topProducts: TopProduct[];
}

/** Statistics for events with createdAt in [from, to). Everything comes from recorded transactions. */
export function computeStats(data: AppData, from: number, to: number, topN = 5): PeriodStats {
  const inRange = (t: number) => t >= from && t < to;
  let grossSales = 0;
  let returns = 0;
  let cashReceived = 0;
  let refunds = 0;
  for (const e of data.ledger) {
    if (!inRange(e.createdAt)) continue;
    if (e.type === "SALE") grossSales += e.amountAgorot;
    else if (e.type === "RETURN_CREDIT") returns += e.amountAgorot;
    else if (e.type === "PAYMENT_IN") cashReceived += e.amountAgorot;
    else if (e.type === "REFUND_OUT") refunds += e.amountAgorot;
  }

  const salesInRange = new Set(data.sales.filter((s) => inRange(s.createdAt)).map((s) => s.id));
  const returnsInRange = data.returns.filter((r) => inRange(r.createdAt));
  const itemById = new Map(data.saleItems.map((i) => [i.id, i]));

  const agg = new Map<string, TopProduct>();
  const get = (key: string, name: string) => {
    let t = agg.get(key);
    if (!t) {
      t = { key, name, soldQty: 0, returnedQty: 0, netQty: 0, netValue: 0 };
      agg.set(key, t);
    }
    return t;
  };
  for (const i of data.saleItems) {
    if (!salesInRange.has(i.saleId)) continue;
    const t = get(i.productId || i.productName, i.productName);
    t.soldQty += i.quantity;
    t.netValue += i.quantity * i.unitPriceAgorot;
  }
  for (const r of returnsInRange) {
    for (const l of r.lines) {
      const i = itemById.get(l.saleItemId);
      if (!i) continue;
      const t = get(i.productId || i.productName, i.productName);
      t.returnedQty += l.quantity;
      t.netValue -= l.valueAgorot;
    }
  }
  const topProducts = [...agg.values()]
    .map((t) => ({ ...t, netQty: t.soldQty - t.returnedQty }))
    .filter((t) => t.netQty > 0)
    .sort((a, b) => b.netQty - a.netQty || b.netValue - a.netValue)
    .slice(0, topN);

  return {
    grossSales,
    returns,
    netSales: grossSales - returns,
    cashReceived,
    refunds,
    netCash: cashReceived - refunds,
    salesCount: salesInRange.size,
    returnsCount: returnsInRange.length,
    topProducts,
  };
}

export interface DebtSummary {
  /** Σ of positive customer balances. Never counted as cash. */
  outstandingDebt: number;
  /** Σ of negative customer balances (we owe customers). */
  customerCredit: number;
  debtors: number;
}

export function debtSummary(ledger: LedgerEntry[]): DebtSummary {
  let outstandingDebt = 0;
  let customerCredit = 0;
  let debtors = 0;
  for (const b of customerBalances(ledger).values()) {
    if (b > 0) {
      outstandingDebt += b;
      debtors++;
    } else if (b < 0) customerCredit += -b;
  }
  return { outstandingDebt, customerCredit, debtors };
}
