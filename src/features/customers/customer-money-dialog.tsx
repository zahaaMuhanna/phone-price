"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { useAppData, recordAdjustment, recordCustomerRefund, recordPayment } from "@/lib/store";
import { customerBalance } from "@/lib/ledger";
import { formatPrice, parseMoney } from "@/lib/format";
import { errorMessage, toast } from "@/lib/toast";

export type MoneyMode = "payment" | "adjust" | "payout";

interface Props {
  customerId: string;
  mode: MoneyMode | null;
  onOpenChange: (open: boolean) => void;
}

const COPY: Record<MoneyMode, { title: string; desc: string; cta: string }> = {
  payment: { title: "تسجيل دفعة", desc: "دفعة مستلمة من العميل تُخصم من رصيده. لا يتم تعديل أي فاتورة سابقة.", cta: "تسجيل الدفعة" },
  adjust: { title: "تعديل الحساب", desc: "حركة تعديل مستقلة (مثل خصم أو تصحيح). تُسجَّل في كشف الحساب ولا تغيّر الحركات السابقة.", cta: "تسجيل التعديل" },
  payout: { title: "صرف رصيد للعميل", desc: "دفع مبلغ نقدي للعميل من رصيده الدائن لدينا.", cta: "تسجيل الصرف" },
};

export function CustomerMoneyDialog({ customerId, mode, onOpenChange }: Props) {
  return (
    <Dialog open={mode !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {mode && <MoneyForm key={mode} customerId={customerId} mode={mode} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function MoneyForm({ customerId, mode, onDone }: { customerId: string; mode: MoneyMode; onDone: () => void }) {
  const { ledger } = useAppData();
  const balance = customerBalance(ledger, customerId);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [direction, setDirection] = useState<"increase" | "decrease">("decrease");
  const [error, setError] = useState("");

  const agorot = parseMoney(amount);
  const copy = COPY[mode];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (agorot === null || agorot <= 0) return setError("أدخل مبلغاً صحيحاً");
    try {
      if (mode === "payment") recordPayment({ customerId, amountAgorot: agorot, note });
      else if (mode === "payout") recordCustomerRefund({ customerId, amountAgorot: agorot, note });
      else recordAdjustment({ customerId, direction, amountAgorot: agorot, note });
      toast.success(`${copy.title}: ${formatPrice(agorot)}`);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const fillTarget = mode === "payment" ? balance : mode === "payout" ? -balance : 0;

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.desc}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">الرصيد الحالي</span>
          <span className={`font-bold tabular-nums ${balance > 0 ? "text-destructive" : ""}`}>
            {balance > 0 ? `عليه ${formatPrice(balance)}` : balance < 0 ? `له ${formatPrice(-balance)}` : "0 ₪"}
          </span>
        </div>

        {mode === "adjust" && (
          <Segmented
            aria-label="نوع التعديل"
            value={direction}
            onChange={setDirection}
            options={[
              { value: "decrease", label: "تخفيض الدين" },
              { value: "increase", label: "زيادة الدين" },
            ]}
          />
        )}

        <div className="grid gap-2">
          <Label htmlFor="money-amount">المبلغ (₪)</Label>
          <div className="flex gap-2">
            <Input
              id="money-amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
              inputMode="decimal"
              placeholder="0"
              autoFocus
              className="tabular-nums"
            />
            {fillTarget > 0 && (
              <Button type="button" variant="outline" onClick={() => setAmount(String(fillTarget / 100))}>
                الكل
              </Button>
            )}
          </div>
          {mode === "payment" && agorot !== null && balance > 0 && agorot > balance && (
            <p className="text-xs text-muted-foreground">المبلغ أكبر من الدين، والزيادة ({formatPrice(agorot - balance)}) ستُسجَّل رصيداً للعميل.</p>
          )}
          {mode === "payment" && agorot !== null && balance <= 0 && agorot > 0 && (
            <p className="text-xs text-muted-foreground">لا يوجد دين على العميل، وسيُسجَّل المبلغ رصيداً له.</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="money-note">{mode === "adjust" ? "السبب (مطلوب)" : "ملاحظة (اختياري)"}</Label>
          <Input id="money-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="submit">{copy.cta}</Button>
      </DialogFooter>
    </form>
  );
}
