"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Receipt, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SaleDetailsDialog } from "@/features/sales/sale-details-dialog";
import { useAppData, useHydrated } from "@/lib/store";
import { formatDate, formatDateTime, formatPrice, fromDateInputValue } from "@/lib/format";
import { formatSaleNumber } from "@/lib/ids";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { startOfDay, startOfNextDay } from "@/lib/ledger";

const ALL = "__all__";
const WALK_IN = "__walkin__";

function normalize(s: string) {
  return s.toLowerCase().replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
}

export default function SalesPage() {
  const hydrated = useHydrated();
  const { sales, saleItems, customers, categories, returns } = useAppData();

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [customerFilter, setCustomerFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [openId, setOpenId] = useState<string | null>(null);

  const customerName = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const itemsBySale = useMemo(() => {
    const m = new Map<string, typeof saleItems>();
    for (const i of saleItems) m.set(i.saleId, [...(m.get(i.saleId) ?? []), i]);
    return m;
  }, [saleItems]);
  const returnedSales = useMemo(() => new Set(returns.map((r) => r.saleId)), [returns]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const fromTs = from ? fromDateInputValue(from) : null;
    const toTs = to ? fromDateInputValue(to) : null;
    return [...sales]
      .filter((s) => {
        if (fromTs !== null && s.createdAt < startOfDay(fromTs)) return false;
        if (toTs !== null && s.createdAt >= startOfNextDay(toTs)) return false;
        if (customerFilter === WALK_IN && s.customerId !== null) return false;
        if (customerFilter !== ALL && customerFilter !== WALK_IN && s.customerId !== customerFilter) return false;
        const items = itemsBySale.get(s.id) ?? [];
        if (categoryFilter !== ALL && !items.some((i) => i.categoryId === categoryFilter)) return false;
        if (q) {
          const hay = normalize(
            `${formatSaleNumber(s.number)} ${s.customerId ? (customerName.get(s.customerId) ?? "") : "نقدي"} ${items.map((i) => i.productName).join(" ")} ${s.note ?? ""}`
          );
          if (!q.split(/\s+/).every((t) => hay.includes(t))) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt || b.number - a.number);
  }, [sales, itemsBySale, customerName, query, from, to, customerFilter, categoryFilter]);

  const totals = useMemo(() => {
    let total = 0;
    let received = 0;
    for (const s of filtered) {
      total += s.totalAgorot;
      received += s.paidAgorot;
    }
    return { total, received, outstanding: total - received };
  }, [filtered]);

  // Group by calendar day so each day shows its own total.
  const groups = useMemo(() => {
    const m = new Map<number, { day: number; sales: typeof filtered; total: number; received: number }>();
    for (const s of filtered) {
      const day = startOfDay(s.createdAt);
      const g = m.get(day) ?? { day, sales: [], total: 0, received: 0 };
      g.sales.push(s);
      g.total += s.totalAgorot;
      g.received += s.paidAgorot;
      m.set(day, g);
    }
    return [...m.values()].sort((a, b) => b.day - a.day);
  }, [filtered]);

  const hasFilters = Boolean(query || from || to || customerFilter !== ALL || categoryFilter !== ALL);

  function clearFilters() {
    setQuery("");
    setFrom("");
    setTo("");
    setCustomerFilter(ALL);
    setCategoryFilter(ALL);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">المبيعات</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sales.length} فاتورة مسجلة</p>
        </div>
        <Button asChild>
          <Link href="/sales/new">
            <Plus className="size-4" />
            فاتورة جديدة
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="إجمالي المبيعات" value={formatPrice(totals.total)} hint={`${filtered.length} فاتورة`} />
        <Tile label="المستلم عند البيع" value={formatPrice(totals.received)} />
        <Tile label="غير المسدد من المبيعات" value={formatPrice(totals.outstanding)} danger={totals.outstanding > 0} />
      </div>

      <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="رقم الفاتورة، عميل، منتج..." className="ps-9" />
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          من تاريخ
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          إلى تاريخ
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} />
        </label>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-full self-end" aria-label="العميل">
            <SelectValue placeholder="كل العملاء" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>كل العملاء</SelectItem>
            <SelectItem value={WALK_IN}>عميل نقدي</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full self-end" aria-label="الصنف">
            <SelectValue placeholder="كل الأصناف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>كل الأصناف</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="w-fit md:col-span-6" onClick={clearFilters}>
            <X className="size-3.5" />
            مسح الفلاتر
          </Button>
        )}
      </div>

      {!hydrated ? (
        <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <Receipt className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">لا توجد مبيعات بعد</p>
          <p className="text-sm text-muted-foreground">اضغط على أي منتج لتسجيل بيع سريع، أو أنشئ فاتورة بعدة منتجات</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center">
          <Search className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">لا توجد فواتير مطابقة</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>المنتجات</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>التاريخ والوقت</TableHead>
                <TableHead>الدفع</TableHead>
                <TableHead className="text-end">سعر البيع</TableHead>
                <TableHead className="text-end">المستلم</TableHead>
                <TableHead className="text-end">المتبقي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <Fragment key={g.day}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={5} className="py-2 text-xs font-semibold">
                      {formatDate(g.day)} · {g.sales.length} فاتورة
                    </TableCell>
                    <TableCell className="py-2 text-end text-xs font-semibold tabular-nums">{formatPrice(g.total)}</TableCell>
                    <TableCell className="py-2 text-end text-xs font-semibold tabular-nums">{formatPrice(g.received)}</TableCell>
                    <TableCell className="py-2 text-end text-xs font-semibold tabular-nums">{formatPrice(g.total - g.received)}</TableCell>
                  </TableRow>
                  {g.sales.map((s) => {
                    const items = itemsBySale.get(s.id) ?? [];
                    const remaining = s.totalAgorot - s.paidAgorot;
                    return (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer"
                        tabIndex={0}
                        onClick={() => setOpenId(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setOpenId(s.id);
                        }}
                      >
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatSaleNumber(s.number)}
                          {returnedSales.has(s.id) && (
                            <Badge variant="outline" className="ms-2">
                              مرتجع
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-56 truncate">
                          {items[0]?.productName ?? "—"}
                          {items.length > 1 && <span className="text-muted-foreground"> +{items.length - 1}</span>}
                        </TableCell>
                        <TableCell>{s.customerId ? (customerName.get(s.customerId) ?? "عميل محذوف") : <span className="text-muted-foreground">نقدي</span>}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant={s.paymentMethod === "cash" ? "secondary" : s.paymentMethod === "credit" ? "destructive" : "outline"}>
                            {PAYMENT_METHOD_LABELS[s.paymentMethod]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end font-semibold tabular-nums">{formatPrice(s.totalAgorot)}</TableCell>
                        <TableCell className="text-end tabular-nums">{formatPrice(s.paidAgorot)}</TableCell>
                        <TableCell className={remaining > 0 ? "text-end font-medium tabular-nums text-destructive" : "text-end tabular-nums text-muted-foreground"}>
                          {formatPrice(remaining)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SaleDetailsDialog saleId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}

function Tile({ label, value, hint, danger }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${danger ? "text-destructive" : ""}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
