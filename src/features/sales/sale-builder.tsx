"use client";

import { useMemo, useRef, useState } from "react";
import { Link2, Minus, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { CustomerPicker } from "@/features/sales/customer-picker";
import { useAppData, recordSale } from "@/lib/store";
import { searchProducts } from "@/lib/search";
import { formatPrice, parseMoney, parseQuantity } from "@/lib/format";
import { formatSaleNumber } from "@/lib/ids";
import { errorMessage, toast } from "@/lib/toast";
import type { PaymentMethod, Sale } from "@/types";

let lineKeyCounter = 0;
const nextLineKey = () => ++lineKeyCounter;

interface Line {
  key: number;
  productId: string;
  qty: string;
  price: string;
}

interface SaleBuilderProps {
  /** Pre-fills one line with this product (quick sale from the product dialog). */
  initialProductId?: string;
  /** Shows the product search so more products can be added to the same invoice. */
  allowAddProducts?: boolean;
  onSaved: (sale: Sale) => void;
  onCancel?: () => void;
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "نقداً" },
  { value: "credit", label: "على الحساب" },
  { value: "partial", label: "دفعة جزئية" },
];

function toInput(agorot: number): string {
  return String(agorot / 100);
}

/**
 * The one invoice form used by BOTH the quick-sale dialog and the full invoice page.
 * Both go through the same `recordSale` accounting engine.
 */
export function SaleBuilder({ initialProductId, allowAddProducts = false, onSaved, onCancel }: SaleBuilderProps) {
  const { products, categories } = useAppData();
  const searchRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const [lines, setLines] = useState<Line[]>(() => {
    const p = initialProductId ? products.find((x) => x.id === initialProductId) : undefined;
    return p ? [{ key: nextLineKey(), productId: p.id, qty: "1", price: toInput(p.priceAgorot) }] : [];
  });
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [linkCustomer, setLinkCustomer] = useState(false);
  const [paid, setPaid] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const results = useMemo(
    () => (query.trim() ? searchProducts(products, categories, query).slice(0, 8) : []),
    [products, categories, query]
  );

  const parsed = lines.map((l) => ({ qty: parseQuantity(l.qty), price: parseMoney(l.price) }));
  const total = parsed.reduce((a, p) => a + (p.qty && p.qty > 0 && p.price !== null ? p.qty * p.price : 0), 0);
  const paidAgorot = method === "partial" ? parseMoney(paid) : method === "cash" ? total : 0;
  const remaining = total - (paidAgorot ?? 0);

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setError("");
  }

  function addLine(productId: string) {
    const p = productById.get(productId);
    if (!p) return;
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === productId);
      if (existing) {
        // Scanning/clicking the same product again just adds one more unit.
        return ls.map((l) => (l === existing ? { ...l, qty: String((parseQuantity(l.qty) ?? 0) + 1) } : l));
      }
      return [...ls, { key: nextLineKey(), productId, qty: "1", price: toInput(p.priceAgorot) }];
    });
    setQuery("");
    setError("");
    searchRef.current?.focus();
  }

  function changeMethod(m: PaymentMethod) {
    setMethod(m);
    setError("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError("");

    if (lines.length === 0) return setError("أضف منتجاً واحداً على الأقل");
    for (let i = 0; i < lines.length; i++) {
      const p = parsed[i];
      const name = productById.get(lines[i].productId)?.name ?? "";
      if (!p.qty || p.qty < 1) return setError(`الكمية غير صحيحة: ${name}`);
      if (p.price === null) return setError(`سعر البيع غير صحيح: ${name}`);
    }
    if (total <= 0) return setError("إجمالي الفاتورة يجب أن يكون أكبر من صفر");
    if (method !== "cash" && !customerId) return setError("اختر العميل أو أضف عميلاً جديداً");
    if (method === "partial") {
      if (paidAgorot === null || paidAgorot <= 0) return setError("أدخل المبلغ المستلم");
      if (paidAgorot >= total) return setError("المبلغ المستلم يغطي كامل الفاتورة، اختر «نقداً»");
    }

    submittingRef.current = true;
    try {
      const sale = recordSale({
        lines: lines.map((l, i) => ({ productId: l.productId, quantity: parsed[i].qty!, unitPriceAgorot: parsed[i].price! })),
        paymentMethod: method,
        customerId: method === "cash" && !linkCustomer ? null : customerId,
        paidAgorot: method === "partial" ? (paidAgorot ?? undefined) : undefined,
        note,
      });
      toast.success(`تم تسجيل البيع ${formatSaleNumber(sale.number)} — ${formatPrice(sale.totalAgorot)}`);
      onSaved(sale);
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      submittingRef.current = false;
    }
  }

  const showPicker = method !== "cash" || linkCustomer;
  const canSubmit = lines.length > 0 && total > 0;

  return (
    <form onSubmit={submit} className="grid gap-4">
      {allowAddProducts && (
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج لإضافته (Enter لإضافة أول نتيجة)..."
            className="h-12 ps-10 text-base"
            autoComplete="off"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results[0]) addLine(results[0].id);
              } else if (e.key === "Escape") setQuery("");
            }}
          />
          {query.trim() && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg">
              {results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">لم نجد أي منتج</p>
              ) : (
                results.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addLine(p.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.categoryName}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {i === 0 && <Badge variant="secondary">Enter</Badge>}
                      <span className="text-sm font-semibold tabular-nums">{formatPrice(p.priceAgorot)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          ابحث عن منتج وأضفه لبدء الفاتورة
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <div className="hidden grid-cols-[1fr_7.5rem_6.5rem_5.5rem_2rem] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>المنتج</span>
            <span>الكمية</span>
            <span>سعر البيع (₪)</span>
            <span className="text-end">الإجمالي</span>
            <span />
          </div>
          {lines.map((l, i) => {
            const p = productById.get(l.productId);
            const lineTotal = parsed[i].qty && parsed[i].price !== null ? parsed[i].qty! * parsed[i].price! : 0;
            const qtyNum = parsed[i].qty ?? 0;
            return (
              <div
                key={l.key}
                className="grid grid-cols-[1fr_auto] items-center gap-2 border-b px-3 py-2.5 last:border-0 sm:grid-cols-[1fr_7.5rem_6.5rem_5.5rem_2rem]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p?.name ?? "منتج محذوف"}</p>
                  {p && <p className="text-xs text-muted-foreground">السعر المعروض: {formatPrice(p.priceAgorot)}</p>}
                </div>
                <div className="flex items-center gap-1 sm:contents">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="إنقاص الكمية"
                      tabIndex={-1}
                      disabled={qtyNum <= 1}
                      onClick={() => updateLine(l.key, { qty: String(Math.max(1, qtyNum - 1)) })}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <Input
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                      inputMode="numeric"
                      aria-label="الكمية"
                      className="h-8 w-12 px-1 text-center tabular-nums"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="زيادة الكمية"
                      tabIndex={-1}
                      onClick={() => updateLine(l.key, { qty: String(qtyNum + 1) })}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <Input
                    value={l.price}
                    onChange={(e) => updateLine(l.key, { price: e.target.value })}
                    inputMode="decimal"
                    aria-label="سعر البيع"
                    className="h-8 w-24 tabular-nums sm:w-full"
                    autoFocus={!allowAddProducts && i === 0}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <span className="hidden text-end text-sm font-semibold tabular-nums sm:block">{formatPrice(lineTotal)}</span>
                  {allowAddProducts || lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="حذف السطر"
                      tabIndex={-1}
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">إجمالي الفاتورة</span>
          <span className="text-2xl font-bold tabular-nums">{formatPrice(total)}</span>
        </div>

        <Segmented aria-label="طريقة الدفع" value={method} onChange={changeMethod} options={METHODS} />

        {method === "partial" && (
          <div className="grid gap-2">
            <Label htmlFor="sale-paid">المبلغ المستلم الآن (₪)</Label>
            <Input
              id="sale-paid"
              value={paid}
              onChange={(e) => {
                setPaid(e.target.value);
                setError("");
              }}
              inputMode="decimal"
              placeholder="0"
              autoFocus
              className="tabular-nums"
            />
          </div>
        )}

        {(method === "credit" || method === "partial") && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">يُضاف إلى حساب العميل</span>
            <span className="font-bold tabular-nums text-destructive">
              {formatPrice(method === "credit" ? total : paidAgorot !== null ? Math.max(0, remaining) : total)}
            </span>
          </div>
        )}

        {method === "cash" && !linkCustomer && (
          <button
            type="button"
            onClick={() => setLinkCustomer(true)}
            className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link2 className="size-3" />
            ربط الفاتورة بعميل (اختياري)
          </button>
        )}

        {showPicker && (
          <div className="grid gap-2">
            <Label>العميل{method === "cash" ? " (اختياري)" : ""}</Label>
            <CustomerPicker value={customerId} onChange={setCustomerId} autoFocus={method === "credit"} />
          </div>
        )}

        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة على الفاتورة (اختياري)" />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="lg" className="h-11 flex-1 text-base" disabled={!canSubmit}>
          تسجيل البيع {canSubmit ? `— ${formatPrice(total)}` : ""}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="lg" className="h-11" onClick={onCancel}>
            إلغاء
          </Button>
        )}
      </div>
    </form>
  );
}
