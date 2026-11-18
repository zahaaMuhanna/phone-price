"use client";

import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { useAppData, recordReturn } from "@/lib/store";
import { getSaleDetails } from "@/lib/ledger";
import { planReturn, type ReturnPlan } from "@/lib/sales-ops";
import { formatPrice, parseQuantity } from "@/lib/format";
import { formatReturnNumber, formatSaleNumber } from "@/lib/ids";
import { errorMessage, toast } from "@/lib/toast";
import type { ExcessHandling } from "@/types";

interface ReturnDialogProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReturnDialog({ saleId, open, onOpenChange }: ReturnDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        {open && saleId && <ReturnForm key={saleId} saleId={saleId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ReturnForm({ saleId, onDone }: { saleId: string; onDone: () => void }) {
  const data = useAppData();
  const details = useMemo(() => getSaleDetails(data, saleId), [data, saleId]);
  const customer = details?.sale.customerId ? data.customers.find((c) => c.id === details.sale.customerId) : undefined;

  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [handling, setHandling] = useState<ExcessHandling>("refund");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  const lines = useMemo(
    () =>
      (details?.items ?? [])
        .map((v) => ({ saleItemId: v.item.id, quantity: parseQuantity(qtys[v.item.id] ?? "") ?? 0 }))
        .filter((l) => l.quantity > 0),
    [details, qtys]
  );

  // Same function the engine uses when saving, so the preview can never disagree with the result.
  const preview = useMemo((): { plan: ReturnPlan | null; problem: string } => {
    if (!details) return { plan: null, problem: "" };
    const invalid = details.items.find((v) => {
      const raw = (qtys[v.item.id] ?? "").trim();
      return raw !== "" && parseQuantity(raw) === null;
    });
    if (invalid) return { plan: null, problem: "الكمية يجب أن تكون عدداً صحيحاً" };
    if (lines.length === 0) return { plan: null, problem: "" };
    try {
      return { plan: planReturn(data, saleId, lines, handling), problem: "" };
    } catch (e) {
      return { plan: null, problem: errorMessage(e) };
    }
  }, [data, details, saleId, lines, handling, qtys]);

  if (!details) return null;
  const { sale, items } = details;
  const plan = preview.plan;

  function setQty(itemId: string, value: string) {
    setQtys((q) => ({ ...q, [itemId]: value }));
    setError("");
  }

  function confirm() {
    try {
      const r = recordReturn({ saleId, lines, excessHandling: handling, reason });
      toast.success(`تم تسجيل المرتجع ${formatReturnNumber(r.number)} — ${formatPrice(r.valueAgorot)}`);
      setConfirmOpen(false);
      onDone();
    } catch (e) {
      setConfirmOpen(false);
      setError(errorMessage(e));
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>إرجاع منتجات — {formatSaleNumber(sale.number)}</DialogTitle>
        <DialogDescription>
          يتم احتساب قيمة المرتجع بسعر البيع الفعلي. الفاتورة الأصلية لا تتغير، ويُسجَّل المرتجع كحركة مستقلة.
        </DialogDescription>
      </DialogHeader>

      <div className="overflow-hidden rounded-xl border">
        {items.map((v) => {
          const done = v.remainingQty === 0;
          const qty = parseQuantity(qtys[v.item.id] ?? "") ?? 0;
          return (
            <div key={v.item.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b px-3 py-3 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{v.item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  سعر البيع {formatPrice(v.item.unitPriceAgorot)} · مباع {v.item.quantity} · مُرجَع {v.returnedQty} · متبقٍ {v.remainingQty}
                </p>
              </div>
              {done ? (
                <span className="text-xs font-medium text-muted-foreground">تم إرجاعه بالكامل</span>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value={qtys[v.item.id] ?? ""}
                    onChange={(e) => setQty(v.item.id, e.target.value)}
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={`كمية الإرجاع: ${v.item.productName}`}
                    className="h-8 w-16 text-center tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setQty(v.item.id, String(v.remainingQty))}
                    disabled={qty === v.remainingQty}
                  >
                    الكل
                  </Button>
                  <span className="w-16 text-end text-sm font-semibold tabular-nums">
                    {qty > 0 && qty <= v.remainingQty ? formatPrice(qty * v.item.unitPriceAgorot) : ""}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="return-reason">سبب الإرجاع (اختياري)</Label>
        <Input id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: عطل في القطعة" />
      </div>

      {plan && (
        <div className="grid gap-2 rounded-xl border bg-muted/30 p-4 text-sm">
          <Row label="قيمة المرتجع" value={formatPrice(plan.valueAgorot)} strong />
          {plan.debtReductionAgorot > 0 && (
            <Row label={`يُخصم من دين ${customer ? `«${customer.name}»` : "العميل"}`} value={formatPrice(plan.debtReductionAgorot)} />
          )}
          {plan.excessAgorot > 0 && <Row label="مدفوع سابقاً مقابل هذه القطع" value={formatPrice(plan.excessAgorot)} />}

          {plan.excessAgorot > 0 &&
            (customer ? (
              <div className="grid gap-1.5 pt-1">
                <Label>ماذا نفعل بالمبلغ المدفوع؟</Label>
                <Segmented
                  aria-label="طريقة التعامل مع المبلغ المدفوع"
                  value={handling}
                  onChange={setHandling}
                  options={[
                    { value: "refund", label: "استرداد نقدي" },
                    { value: "credit", label: "رصيد للعميل" },
                  ]}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">عميل نقدي: يُرد المبلغ نقداً.</p>
            ))}

          {plan.cashRefundAgorot > 0 && <Row label="يخرج من الصندوق" value={formatPrice(plan.cashRefundAgorot)} strong />}
          {plan.creditAgorot > 0 && <Row label="يُسجَّل رصيداً للعميل" value={formatPrice(plan.creditAgorot)} strong />}
        </div>
      )}

      {(preview.problem || error) && (
        <p role="alert" className="text-sm text-destructive">
          {preview.problem || error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="button" disabled={!plan} onClick={() => setConfirmOpen(true)}>
          مراجعة وتأكيد المرتجع
        </Button>
      </DialogFooter>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد المرتجع</AlertDialogTitle>
            <AlertDialogDescription>
              {plan &&
                `سيتم تسجيل مرتجع بقيمة ${formatPrice(plan.valueAgorot)}` +
                  (plan.debtReductionAgorot > 0 ? `، وخصم ${formatPrice(plan.debtReductionAgorot)} من الدين` : "") +
                  (plan.cashRefundAgorot > 0 ? `، ورد ${formatPrice(plan.cashRefundAgorot)} نقداً` : "") +
                  (plan.creditAgorot > 0 ? `، وتسجيل ${formatPrice(plan.creditAgorot)} رصيداً للعميل` : "") +
                  ". لا يمكن التراجع عن هذا الإجراء."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>رجوع</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-bold tabular-nums" : "tabular-nums"}>{value}</span>
    </div>
  );
}
