"use client";

import { useState } from "react";
import Link from "next/link";
import { History, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaleBuilder } from "@/features/sales/sale-builder";
import { AddProductButton } from "@/features/products/add-product-button";
import { useAppData, useHydrated } from "@/lib/store";

export default function NewInvoicePage() {
  const hydrated = useHydrated();
  const { products } = useAppData();
  // Changing the key gives a fresh, empty invoice right after each sale so the next one can start immediately.
  const [invoiceKey, setInvoiceKey] = useState(0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">فاتورة جديدة</h1>
          <p className="mt-1 text-sm text-muted-foreground">أضف عدة منتجات، عدّل الكمية والسعر لكل منتج، ثم اختر طريقة الدفع</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/sales">
            <History className="size-4" />
            سجل المبيعات
          </Link>
        </Button>
      </div>

      {!hydrated ? (
        <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <PackageSearch className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">أضف منتجات أولاً لتتمكن من البيع</p>
          <AddProductButton label="إضافة منتج" />
        </div>
      ) : (
        <SaleBuilder key={invoiceKey} allowAddProducts onSaved={() => setInvoiceKey((k) => k + 1)} />
      )}
    </div>
  );
}
