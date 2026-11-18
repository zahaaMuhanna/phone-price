"use client";

import { useMemo, useState } from "react";
import { Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReturnDialog } from "@/features/sales/return-dialog";
import { useAppData } from "@/lib/store";
import { getSaleDetails } from "@/lib/ledger";
import { formatDateTime, formatPrice } from "@/lib/format";
import { formatReturnNumber, formatSaleNumber } from "@/lib/ids";
import { LEDGER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";

interface SaleDetailsDialogProps {
  saleId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailsDialog({ saleId, onOpenChange }: SaleDetailsDialogProps) {
  const data = useAppData();
  const [returnOpen, setReturnOpen] = useState(false);
  const details = useMemo(() => (saleId ? getSaleDetails(data, saleId) : null), [data, saleId]);
  const customer = details?.sale.customerId ? data.customers.find((c) => c.id === details.sale.customerId) : undefined;

  return (
    <>
      <Dialog open={Boolean(saleId)} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          {details && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  فاتورة {formatSaleNumber(details.sale.number)}
                  <Badge variant="secondary">{PAYMENT_METHOD_LABELS[details.sale.paymentMethod]}</Badge>
                  {details.fullyReturned && <Badge variant="destructive">مرتجعة بالكامل</Badge>}
                  {!details.fullyReturned && details.returns.length > 0 && <Badge variant="outline">فيها مرتجعات</Badge>}
                </DialogTitle>
                <DialogDescription>
                  {formatDateTime(details.sale.createdAt)} · {customer ? customer.name : details.sale.customerId ? "عميل محذوف" : "عميل نقدي"}
                  {details.sale.note ? ` · ${details.sale.note}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>السعر المعروض</TableHead>
                      <TableHead>سعر البيع</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>المُرجَع</TableHead>
                      <TableHead>المتبقي</TableHead>
                      <TableHead className="text-end">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.items.map((v) => (
                      <TableRow key={v.item.id}>
                        <TableCell className="font-medium">
                          {v.item.productName}
                          {v.item.categoryName && <span className="block text-xs font-normal text-muted-foreground">{v.item.categoryName}</span>}
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{formatPrice(v.item.listPriceAgorot)}</TableCell>
                        <TableCell className="tabular-nums">{formatPrice(v.item.unitPriceAgorot)}</TableCell>
                        <TableCell className="tabular-nums">{v.item.quantity}</TableCell>
                        <TableCell className="tabular-nums">{v.returnedQty}</TableCell>
                        <TableCell className="tabular-nums">{v.remainingQty}</TableCell>
                        <TableCell className="text-end font-semibold tabular-nums">{formatPrice(v.lineTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-2 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                <Stat label="إجمالي الفاتورة" value={formatPrice(details.sale.totalAgorot)} />
                <Stat label="المستلم عند البيع" value={formatPrice(details.sale.paidAgorot)} />
                <Stat label="المتبقي عند البيع (دين)" value={formatPrice(details.remainingAtSale)} />
                <Stat label="قيمة المرتجعات" value={formatPrice(details.returnedValue)} />
                <Stat label="صافي الفاتورة بعد المرتجعات" value={formatPrice(details.netTotal)} strong />
              </div>

              {details.returns.length > 0 && (
                <div className="grid gap-2">
                  <h3 className="text-sm font-semibold">المرتجعات</h3>
                  {details.returns.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">{formatReturnNumber(r.number)}</span>
                        <span className="ms-2 text-muted-foreground">{formatDateTime(r.createdAt)}</span>
                        {r.reason && <span className="ms-2 text-muted-foreground">· {r.reason}</span>}
                      </span>
                      <span className="tabular-nums">
                        {formatPrice(r.valueAgorot)}
                        {r.cashRefundAgorot > 0 && <span className="ms-2 text-xs text-muted-foreground">(نقداً {formatPrice(r.cashRefundAgorot)})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-2">
                <h3 className="text-sm font-semibold">الحركات المالية المرتبطة</h3>
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableBody>
                      {details.ledger.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</TableCell>
                          <TableCell className="whitespace-nowrap">{LEDGER_TYPE_LABELS[e.type]}</TableCell>
                          <TableCell className="text-muted-foreground">{e.description}</TableCell>
                          <TableCell className="text-end tabular-nums">{formatPrice(e.amountAgorot)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setReturnOpen(true)} disabled={details.fullyReturned}>
                  <Undo2 className="size-4" />
                  {details.fullyReturned ? "تم إرجاع كل المنتجات" : "إرجاع منتجات"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <ReturnDialog saleId={saleId} open={returnOpen} onOpenChange={setReturnOpen} />
    </>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-bold tabular-nums" : "font-medium tabular-nums"}>{value}</span>
    </div>
  );
}
