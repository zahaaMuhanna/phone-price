"use client";

import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Banknote, Pencil, Scale, Trash2, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerFormDialog } from "@/features/customers/customer-form-dialog";
import { CustomerMoneyDialog, type MoneyMode } from "@/features/customers/customer-money-dialog";
import { SaleDetailsDialog } from "@/features/sales/sale-details-dialog";
import { useAppData, deleteCustomer, setCustomerArchived } from "@/lib/store";
import { customerStatement, customerSummary } from "@/lib/ledger";
import { formatDateTime, formatPrice } from "@/lib/format";
import { LEDGER_TYPE_LABELS } from "@/lib/labels";
import { errorMessage, toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface CustomerDialogProps {
  customerId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function BalanceText({ balance, className }: { balance: number; className?: string }) {
  if (balance === 0) return <span className={cn("tabular-nums text-muted-foreground", className)}>0 ₪</span>;
  return (
    <span className={cn("tabular-nums", balance > 0 ? "text-destructive" : "text-emerald-600", className)}>
      {balance > 0 ? "عليه " : "له "}
      {formatPrice(Math.abs(balance))}
    </span>
  );
}

export function CustomerDialog({ customerId, onOpenChange }: CustomerDialogProps) {
  const { customers, ledger } = useAppData();
  const customer = customerId ? customers.find((c) => c.id === customerId) : undefined;
  const summary = useMemo(() => (customerId ? customerSummary(ledger, customerId) : null), [ledger, customerId]);
  const rows = useMemo(() => (customerId ? customerStatement(ledger, customerId) : []), [ledger, customerId]);

  const [money, setMoney] = useState<MoneyMode | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saleId, setSaleId] = useState<string | null>(null);

  function archive(next: boolean) {
    if (!customer) return;
    try {
      setCustomerArchived(customer.id, next);
      toast.success(next ? "تمت أرشفة العميل" : "تمت إعادة العميل");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  function remove() {
    if (!customer) return;
    try {
      deleteCustomer(customer.id);
      toast.success("تم حذف العميل");
      setDeleteOpen(false);
      onOpenChange(false);
    } catch (e) {
      setDeleteOpen(false);
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <Dialog open={Boolean(customer)} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          {customer && summary && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {customer.name}
                  {customer.archived && <Badge variant="outline">مؤرشف</Badge>}
                </DialogTitle>
                <DialogDescription>
                  {customer.phone && <span dir="ltr">{customer.phone}</span>}
                  {customer.phone && customer.notes ? " · " : ""}
                  {customer.notes}
                  {!customer.phone && !customer.notes && "كشف حساب العميل"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Tile label="إجمالي المشتريات" value={formatPrice(summary.purchases)} />
                <Tile label="إجمالي الدفعات" value={formatPrice(summary.payments)} />
                <Tile label="المرتجعات" value={formatPrice(summary.returns)} />
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">الرصيد المستحق</p>
                  <p className="mt-1 text-xl font-bold">
                    <BalanceText balance={summary.balance} />
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setMoney("payment")}>
                  <Wallet className="size-4" />
                  تسجيل دفعة
                </Button>
                {summary.balance < 0 && (
                  <Button variant="outline" onClick={() => setMoney("payout")}>
                    <Banknote className="size-4" />
                    صرف رصيد للعميل
                  </Button>
                )}
                <Button variant="outline" onClick={() => setMoney("adjust")}>
                  <Scale className="size-4" />
                  تعديل الحساب
                </Button>
                <Button variant="ghost" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  تعديل البيانات
                </Button>
                {customer.archived ? (
                  <Button variant="ghost" onClick={() => archive(false)}>
                    <ArchiveRestore className="size-4" />
                    إلغاء الأرشفة
                  </Button>
                ) : (
                  summary.hasHistory && (
                    <Button variant="ghost" onClick={() => archive(true)}>
                      <Archive className="size-4" />
                      أرشفة
                    </Button>
                  )
                )}
                {!summary.hasHistory && (
                  <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="size-4 text-destructive" />
                    حذف
                  </Button>
                )}
              </div>

              {rows.length === 0 ? (
                <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">لا توجد حركات مالية لهذا العميل بعد</p>
              ) : (
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>النوع</TableHead>
                        <TableHead>التاريخ والوقت</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead className="text-end">المبلغ</TableHead>
                        <TableHead className="text-end">الرصيد بعدها</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(({ entry, delta, balance }) => (
                        <TableRow
                          key={entry.id}
                          className={entry.saleId ? "cursor-pointer" : undefined}
                          onClick={() => entry.saleId && setSaleId(entry.saleId)}
                        >
                          <TableCell className="whitespace-nowrap font-medium">{LEDGER_TYPE_LABELS[entry.type]}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</TableCell>
                          <TableCell className="max-w-64 text-muted-foreground">{entry.description}</TableCell>
                          <TableCell className={cn("text-end font-medium tabular-nums", delta > 0 ? "text-destructive" : "text-emerald-600")}>
                            {delta > 0 ? "+" : "−"}
                            {formatPrice(entry.amountAgorot)}
                          </TableCell>
                          <TableCell className="text-end">
                            <BalanceText balance={balance} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {customer && (
        <>
          <CustomerMoneyDialog customerId={customer.id} mode={money} onOpenChange={(o) => !o && setMoney(null)} />
          <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>حذف العميل</AlertDialogTitle>
                <AlertDialogDescription>هل أنت متأكد من حذف «{customer.name}»؟ لا توجد له أي حركات مالية.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>حذف</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      <SaleDetailsDialog saleId={saleId} onOpenChange={(o) => !o && setSaleId(null)} />
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
