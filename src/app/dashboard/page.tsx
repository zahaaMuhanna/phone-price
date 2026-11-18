"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData, useHydrated } from "@/lib/store";
import { computeStats, debtSummary, startOfDay, startOfMonth, startOfNextDay, startOfNextMonth } from "@/lib/ledger";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type Period = "today" | "month" | "all";

export default function DashboardPage() {
  const hydrated = useHydrated();
  const data = useAppData();
  const [topPeriod, setTopPeriod] = useState<Period>("month");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const ranges: Record<Period, [number, number]> = {
      today: [startOfDay(now), startOfNextDay(now)],
      month: [startOfMonth(now), startOfNextMonth(now)],
      all: [0, Number.MAX_SAFE_INTEGER],
    };
    return {
      today: computeStats(data, ...ranges.today, 5),
      month: computeStats(data, ...ranges.month, 5),
      all: computeStats(data, ...ranges.all, 5),
    };
  }, [data, now]);
  const debts = useMemo(() => debtSummary(data.ledger), [data.ledger]);

  const cols: { key: Period; label: string }[] = [
    { key: "today", label: "اليوم" },
    { key: "month", label: "هذا الشهر" },
    { key: "all", label: "الإجمالي" },
  ];
  const rows: { label: string; hint?: string; get: (p: Period) => string; strong?: boolean; negative?: boolean }[] = [
    { label: "إجمالي المبيعات", hint: "بأسعار البيع الفعلية", get: (p) => formatPrice(stats[p].grossSales) },
    { label: "المرتجعات", get: (p) => formatPrice(stats[p].returns), negative: true },
    { label: "صافي المبيعات بعد المرتجعات", get: (p) => formatPrice(stats[p].netSales), strong: true },
    { label: "النقد المستلم", hint: "دفعات فعلية فقط، بدون الديون", get: (p) => formatPrice(stats[p].cashReceived) },
    { label: "المبالغ المستردة (مدفوعة)", get: (p) => formatPrice(stats[p].refunds), negative: true },
    { label: "صافي النقد", get: (p) => formatPrice(stats[p].netCash), strong: true },
    { label: "عدد الفواتير", get: (p) => String(stats[p].salesCount) },
    { label: "عدد المرتجعات", get: (p) => String(stats[p].returnsCount) },
  ];

  if (!hydrated) return <p className="py-24 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>;

  const top = stats[topPeriod].topProducts;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-muted-foreground">كل الأرقام محسوبة من الحركات المسجلة فعلياً</p>
        </div>
        <Button asChild>
          <Link href="/sales/new">
            <Plus className="size-4" />
            فاتورة جديدة
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="مبيعات اليوم" value={formatPrice(stats.today.grossSales)} hint={`${stats.today.salesCount} فاتورة`} />
        <Tile label="مبيعات هذا الشهر" value={formatPrice(stats.month.grossSales)} hint={`صافي ${formatPrice(stats.month.netSales)}`} />
        <Tile label="النقد المستلم اليوم" value={formatPrice(stats.today.cashReceived)} hint={`مستردات ${formatPrice(stats.today.refunds)}`} />
        <Tile
          label="إجمالي ديون العملاء"
          value={formatPrice(debts.outstandingDebt)}
          hint={`${debts.debtors} عميل${debts.customerCredit > 0 ? ` · أرصدة لهم ${formatPrice(debts.customerCredit)}` : ""}`}
          danger={debts.outstandingDebt > 0}
        />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              {cols.map((c) => (
                <TableHead key={c.key} className="text-end">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className={cn(r.strong && "font-semibold")}>
                  {r.label}
                  {r.hint && <span className="block text-xs font-normal text-muted-foreground">{r.hint}</span>}
                </TableCell>
                {cols.map((c) => (
                  <TableCell key={c.key} className={cn("text-end tabular-nums", r.strong && "font-bold", r.negative && "text-muted-foreground")}>
                    {r.get(c.key)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="size-5 text-muted-foreground" />
            المنتجات الأكثر مبيعاً
          </h2>
          <Segmented
            className="w-64"
            aria-label="الفترة"
            value={topPeriod}
            onChange={setTopPeriod}
            options={cols.map((c) => ({ value: c.key, label: c.label }))}
          />
        </div>
        {top.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد مبيعات في هذه الفترة</p>
        ) : (
          <ol className="grid gap-2">
            {top.map((p, i) => (
              <li key={p.key} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold">{i + 1}</span>
                  <span className="truncate font-medium">{p.name}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  <span className="font-semibold">{p.netQty} قطعة</span>
                  <span className="ms-3 text-muted-foreground">{formatPrice(p.netValue)}</span>
                  {p.returnedQty > 0 && <span className="ms-3 text-xs text-muted-foreground">(مرتجع {p.returnedQty})</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, hint, danger }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", danger && "text-destructive")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
