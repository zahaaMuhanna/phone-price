"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerDialog, BalanceText } from "@/features/customers/customer-dialog";
import { CustomerFormDialog } from "@/features/customers/customer-form-dialog";
import { useAppData, useHydrated } from "@/lib/store";
import { customerSummary, debtSummary } from "@/lib/ledger";
import { formatPrice } from "@/lib/format";

function normalize(s: string) {
  return s.toLowerCase().replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
}

export default function CustomersPage() {
  const hydrated = useHydrated();
  const { customers, ledger } = useAppData();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = normalize(query);
    return customers
      .filter((c) => showArchived || !c.archived)
      .filter((c) => !q || normalize(c.name).includes(q) || (c.phone ?? "").includes(q))
      .map((c) => ({ customer: c, summary: customerSummary(ledger, c.id) }))
      // Biggest debts first, then alphabetically.
      .sort((a, b) => b.summary.balance - a.summary.balance || a.customer.name.localeCompare(b.customer.name, "ar"));
  }, [customers, ledger, query, showArchived]);

  const debts = useMemo(() => debtSummary(ledger), [ledger]);
  const archivedCount = customers.filter((c) => c.archived).length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">العملاء</h1>
          <p className="mt-1 text-sm text-muted-foreground">{customers.filter((c) => !c.archived).length} عميل</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          إضافة عميل
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">إجمالي الديون على العملاء</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-destructive">{formatPrice(debts.outstandingDebt)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{debts.debtors} عميل مدين</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">أرصدة دائنة للعملاء (لهم)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatPrice(debts.customerCredit)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الهاتف..." className="ps-9" />
        </div>
        {archivedCount > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="size-4" />
            إظهار المؤرشفين ({archivedCount})
          </label>
        )}
      </div>

      {!hydrated ? (
        <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <Users className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">لا يوجد عملاء بعد</p>
          <p className="text-sm text-muted-foreground">يمكنك إضافة عميل من هنا أو أثناء تسجيل بيع على الحساب</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center">
          <Search className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">لا يوجد عميل بهذا الاسم</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead className="text-end">إجمالي المشتريات</TableHead>
                <TableHead className="text-end">إجمالي الدفعات</TableHead>
                <TableHead className="text-end">الرصيد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ customer, summary }) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => setOpenId(customer.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setOpenId(customer.id);
                  }}
                >
                  <TableCell className="font-medium">
                    {customer.name}
                    {customer.archived && (
                      <Badge variant="outline" className="ms-2">
                        مؤرشف
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground" dir="ltr">
                    <span className="block text-end">{customer.phone ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{formatPrice(summary.purchases)}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatPrice(summary.payments)}</TableCell>
                  <TableCell className="text-end font-semibold">
                    <BalanceText balance={summary.balance} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomerFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <CustomerDialog customerId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
