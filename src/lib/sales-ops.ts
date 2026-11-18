import type {
  AppData,
  Customer,
  ExcessHandling,
  LedgerEntry,
  PaymentMethod,
  Sale,
  SaleItem,
  SaleReturn,
  SaleReturnLine,
} from "../types";
import { customerBalance, returnedQtyByItem } from "./ledger";
import { formatReturnNumber, formatSaleNumber, genId } from "./ids";

/**
 * Pure accounting operations. Each takes the current AppData and returns a NEW AppData
 * (or throws a FinanceError and returns nothing). Because the store only swaps in the
 * returned value after it has been saved, a failure can never leave a half-written sale.
 */

export class FinanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceError";
  }
}

function isMoney(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

function requireCustomer(data: AppData, id: string | null | undefined): Customer {
  const c = id ? data.customers.find((x) => x.id === id) : undefined;
  if (!c) throw new FinanceError("الرجاء اختيار العميل");
  return c;
}

function pushEntry(
  data: AppData,
  entries: LedgerEntry[],
  seqRef: { n: number },
  e: Omit<LedgerEntry, "id" | "seq">
) {
  seqRef.n += 1;
  entries.push({ ...e, id: genId("led"), seq: seqRef.n });
  void data;
}

/* ----------------------------- Sales ------------------------------ */

export interface SaleLineInput {
  productId: string;
  quantity: number;
  /** Actual price charged per unit, in agorot. */
  unitPriceAgorot: number;
}

export interface SaleInput {
  lines: SaleLineInput[];
  paymentMethod: PaymentMethod;
  customerId?: string | null;
  /** Only used for "partial". Cash is paid in full, credit pays nothing. */
  paidAgorot?: number;
  note?: string;
}

export function computeSaleTotal(lines: Pick<SaleLineInput, "quantity" | "unitPriceAgorot">[]): number {
  return lines.reduce((a, l) => a + l.quantity * l.unitPriceAgorot, 0);
}

export function recordSale(
  data: AppData,
  input: SaleInput,
  now: number = Date.now()
): { data: AppData; sale: Sale } {
  if (!input.lines.length) throw new FinanceError("أضف منتجاً واحداً على الأقل");

  const lines = input.lines.map((l) => {
    const product = data.products.find((p) => p.id === l.productId);
    if (!product) throw new FinanceError("أحد المنتجات لم يعد موجوداً");
    if (!Number.isInteger(l.quantity) || l.quantity < 1) throw new FinanceError("الكمية يجب أن تكون عدداً صحيحاً أكبر من صفر");
    if (!isMoney(l.unitPriceAgorot)) throw new FinanceError("سعر البيع غير صحيح");
    return { product, quantity: l.quantity, unitPriceAgorot: l.unitPriceAgorot };
  });

  const total = computeSaleTotal(lines);
  if (total <= 0) throw new FinanceError("إجمالي الفاتورة يجب أن يكون أكبر من صفر");

  let customerId: string | null = null;
  let paid: number;

  switch (input.paymentMethod) {
    case "cash":
      customerId = input.customerId ? requireCustomer(data, input.customerId).id : null;
      paid = total;
      break;
    case "credit":
      customerId = requireCustomer(data, input.customerId).id;
      paid = 0;
      break;
    case "partial": {
      customerId = requireCustomer(data, input.customerId).id;
      paid = input.paidAgorot ?? NaN;
      if (!isMoney(paid) || paid <= 0) throw new FinanceError("أدخل المبلغ المستلم");
      if (paid >= total) throw new FinanceError("المبلغ المستلم يغطي كامل الفاتورة، اختر الدفع نقداً");
      break;
    }
    default:
      throw new FinanceError("طريقة الدفع غير صحيحة");
  }

  const number = data.counters.sale + 1;
  const saleId = genId("sale");
  const sale: Sale = {
    id: saleId,
    number,
    customerId,
    paymentMethod: input.paymentMethod,
    totalAgorot: total,
    paidAgorot: paid,
    note: input.note?.trim() || undefined,
    createdAt: now,
  };

  const categoryName = new Map(data.categories.map((c) => [c.id, c.name]));
  const items: SaleItem[] = lines.map((l) => ({
    id: genId("item"),
    saleId,
    productId: l.product.id,
    productName: l.product.name,
    categoryId: l.product.categoryId,
    categoryName: categoryName.get(l.product.categoryId) ?? "",
    listPriceAgorot: l.product.priceAgorot,
    unitPriceAgorot: l.unitPriceAgorot,
    quantity: l.quantity,
  }));

  const label = formatSaleNumber(number);
  const seq = { n: data.counters.ledger };
  const entries: LedgerEntry[] = [];
  pushEntry(data, entries, seq, {
    type: "SALE",
    customerId,
    amountAgorot: total,
    saleId,
    description: `فاتورة ${label}: ${items.map((i) => `${i.productName}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join("، ")}`,
    createdAt: now,
  });
  if (paid > 0) {
    pushEntry(data, entries, seq, {
      type: "PAYMENT_IN",
      customerId,
      amountAgorot: paid,
      saleId,
      description: input.paymentMethod === "cash" ? `دفع نقدي — ${label}` : `دفعة عند البيع — ${label}`,
      createdAt: now,
    });
  }

  return {
    sale,
    data: {
      ...data,
      sales: [...data.sales, sale],
      saleItems: [...data.saleItems, ...items],
      ledger: [...data.ledger, ...entries],
      counters: { ...data.counters, sale: number, ledger: seq.n },
    },
  };
}

/* ------------------------ Customer payments ----------------------- */

export function recordPayment(
  data: AppData,
  input: { customerId: string; amountAgorot: number; note?: string },
  now: number = Date.now()
): AppData {
  const c = requireCustomer(data, input.customerId);
  if (!isMoney(input.amountAgorot) || input.amountAgorot <= 0) throw new FinanceError("أدخل مبلغاً صحيحاً");
  const seq = { n: data.counters.ledger };
  const entries: LedgerEntry[] = [];
  pushEntry(data, entries, seq, {
    type: "PAYMENT_IN",
    customerId: c.id,
    amountAgorot: input.amountAgorot,
    description: input.note?.trim() ? `دفعة من العميل — ${input.note.trim()}` : "دفعة من العميل",
    createdAt: now,
  });
  return { ...data, ledger: [...data.ledger, ...entries], counters: { ...data.counters, ledger: seq.n } };
}

/** Pay a customer back money we hold for them (their credit balance). Never more than the credit. */
export function recordCustomerRefund(
  data: AppData,
  input: { customerId: string; amountAgorot: number; note?: string },
  now: number = Date.now()
): AppData {
  const c = requireCustomer(data, input.customerId);
  if (!isMoney(input.amountAgorot) || input.amountAgorot <= 0) throw new FinanceError("أدخل مبلغاً صحيحاً");
  const credit = -customerBalance(data.ledger, c.id);
  if (credit <= 0) throw new FinanceError("لا يوجد رصيد للعميل ليتم صرفه");
  if (input.amountAgorot > credit) throw new FinanceError("المبلغ أكبر من رصيد العميل");
  const seq = { n: data.counters.ledger };
  const entries: LedgerEntry[] = [];
  pushEntry(data, entries, seq, {
    type: "REFUND_OUT",
    customerId: c.id,
    amountAgorot: input.amountAgorot,
    description: input.note?.trim() ? `صرف رصيد للعميل — ${input.note.trim()}` : "صرف رصيد للعميل",
    createdAt: now,
  });
  return { ...data, ledger: [...data.ledger, ...entries], counters: { ...data.counters, ledger: seq.n } };
}

export function recordAdjustment(
  data: AppData,
  input: { customerId: string; direction: "increase" | "decrease"; amountAgorot: number; note: string },
  now: number = Date.now()
): AppData {
  const c = requireCustomer(data, input.customerId);
  if (!isMoney(input.amountAgorot) || input.amountAgorot <= 0) throw new FinanceError("أدخل مبلغاً صحيحاً");
  if (!input.note.trim()) throw new FinanceError("اكتب سبب التعديل");
  const seq = { n: data.counters.ledger };
  const entries: LedgerEntry[] = [];
  pushEntry(data, entries, seq, {
    type: input.direction === "increase" ? "ADJUSTMENT_DEBIT" : "ADJUSTMENT_CREDIT",
    customerId: c.id,
    amountAgorot: input.amountAgorot,
    description: `تعديل الحساب — ${input.note.trim()}`,
    createdAt: now,
  });
  return { ...data, ledger: [...data.ledger, ...entries], counters: { ...data.counters, ledger: seq.n } };
}

/* ----------------------------- Returns ---------------------------- */

export interface ReturnLineInput {
  saleItemId: string;
  quantity: number;
}

export interface ReturnPlan {
  lines: SaleReturnLine[];
  valueAgorot: number;
  /** Part of the value that cancels money the customer still owes. */
  debtReductionAgorot: number;
  /** Part of the value the customer had already paid for. */
  excessAgorot: number;
  /** Cash that will leave the drawer. */
  cashRefundAgorot: number;
  /** Excess kept on the customer's account as credit. */
  creditAgorot: number;
}

/**
 * Works out how a return splits between "reduces debt" and "money already paid".
 *
 *  netBefore/After = invoice total minus the value of returns before/after this one
 *  paid-for value  = max(0, paidAtCheckout - net)       (what the customer paid beyond what he still "owes" for)
 *  excess          = paidFor(after) - paidFor(before)
 *  debtReduction   = value - excess
 *
 * Never refunds more than the customer actually paid, never creates debt or a fake payment.
 */
export function planReturn(
  data: AppData,
  saleId: string,
  lines: ReturnLineInput[],
  excessHandling: ExcessHandling
): ReturnPlan {
  const sale = data.sales.find((s) => s.id === saleId);
  if (!sale) throw new FinanceError("الفاتورة غير موجودة");

  const items = new Map(data.saleItems.filter((i) => i.saleId === saleId).map((i) => [i.id, i]));
  const priorReturns = data.returns.filter((r) => r.saleId === saleId);
  const returned = returnedQtyByItem(priorReturns);

  const merged = new Map<string, number>();
  for (const l of lines) {
    if (!l.quantity) continue;
    merged.set(l.saleItemId, (merged.get(l.saleItemId) ?? 0) + l.quantity);
  }
  if (merged.size === 0) throw new FinanceError("اختر كمية المنتج المراد إرجاعه");

  const outLines: SaleReturnLine[] = [];
  for (const [itemId, qty] of merged) {
    const item = items.get(itemId);
    if (!item) throw new FinanceError("المنتج ليس ضمن هذه الفاتورة");
    if (!Number.isInteger(qty) || qty < 1) throw new FinanceError("الكمية يجب أن تكون عدداً صحيحاً أكبر من صفر");
    const remaining = item.quantity - (returned.get(itemId) ?? 0);
    if (qty > remaining) {
      throw new FinanceError(
        remaining === 0 ? `«${item.productName}» تم إرجاعه بالكامل مسبقاً` : `أقصى كمية يمكن إرجاعها من «${item.productName}» هي ${remaining}`
      );
    }
    outLines.push({ saleItemId: itemId, quantity: qty, valueAgorot: qty * item.unitPriceAgorot });
  }

  const value = outLines.reduce((a, l) => a + l.valueAgorot, 0);
  const priorValue = priorReturns.reduce((a, r) => a + r.valueAgorot, 0);
  const netBefore = sale.totalAgorot - priorValue;
  const netAfter = netBefore - value;
  const paidFor = (net: number) => Math.max(0, sale.paidAgorot - net);
  const excess = paidFor(netAfter) - paidFor(netBefore);
  const debtReduction = value - excess;

  // Walk-in sales have no account, so money can only go back as cash.
  const handling: ExcessHandling = sale.customerId === null ? "refund" : excessHandling;
  const cashRefund = handling === "refund" ? excess : 0;

  return {
    lines: outLines,
    valueAgorot: value,
    debtReductionAgorot: debtReduction,
    excessAgorot: excess,
    cashRefundAgorot: cashRefund,
    creditAgorot: excess - cashRefund,
  };
}

export function recordReturn(
  data: AppData,
  input: { saleId: string; lines: ReturnLineInput[]; excessHandling: ExcessHandling; reason?: string },
  now: number = Date.now()
): { data: AppData; saleReturn: SaleReturn } {
  const plan = planReturn(data, input.saleId, input.lines, input.excessHandling);
  const sale = data.sales.find((s) => s.id === input.saleId)!;

  const number = data.counters.return + 1;
  const returnId = genId("ret");
  const saleLabel = formatSaleNumber(sale.number);
  const retLabel = formatReturnNumber(number);

  const saleReturn: SaleReturn = {
    id: returnId,
    number,
    saleId: sale.id,
    customerId: sale.customerId,
    lines: plan.lines,
    valueAgorot: plan.valueAgorot,
    debtReductionAgorot: plan.debtReductionAgorot,
    excessAgorot: plan.excessAgorot,
    excessHandling: sale.customerId === null ? "refund" : input.excessHandling,
    cashRefundAgorot: plan.cashRefundAgorot,
    reason: input.reason?.trim() || undefined,
    createdAt: now,
  };

  const names = new Map(data.saleItems.filter((i) => i.saleId === sale.id).map((i) => [i.id, i.productName]));
  const what = plan.lines.map((l) => `${names.get(l.saleItemId) ?? ""}${l.quantity > 1 ? ` ×${l.quantity}` : ""}`).join("، ");

  const seq = { n: data.counters.ledger };
  const entries: LedgerEntry[] = [];
  pushEntry(data, entries, seq, {
    type: "RETURN_CREDIT",
    customerId: sale.customerId,
    amountAgorot: plan.valueAgorot,
    saleId: sale.id,
    returnId,
    description: `مرتجع ${retLabel} من ${saleLabel}: ${what}`,
    createdAt: now,
  });
  if (plan.cashRefundAgorot > 0) {
    pushEntry(data, entries, seq, {
      type: "REFUND_OUT",
      customerId: sale.customerId,
      amountAgorot: plan.cashRefundAgorot,
      saleId: sale.id,
      returnId,
      description: `استرداد نقدي — ${retLabel}`,
      createdAt: now,
    });
  }

  return {
    saleReturn,
    data: {
      ...data,
      returns: [...data.returns, saleReturn],
      ledger: [...data.ledger, ...entries],
      counters: { ...data.counters, return: number, ledger: seq.n },
    },
  };
}
