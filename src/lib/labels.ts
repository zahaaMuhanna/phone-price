import type { LedgerEntryType, PaymentMethod } from "@/types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقداً",
  credit: "على الحساب",
  partial: "دفعة جزئية",
};

export const LEDGER_TYPE_LABELS: Record<LedgerEntryType, string> = {
  SALE: "فاتورة بيع",
  PAYMENT_IN: "دفعة مستلمة",
  RETURN_CREDIT: "مرتجع",
  REFUND_OUT: "استرداد / صرف",
  ADJUSTMENT_DEBIT: "تعديل (زيادة)",
  ADJUSTMENT_CREDIT: "تعديل (تخفيض)",
};
