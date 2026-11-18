"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppData, addCustomer } from "@/lib/store";
import { customerBalances } from "@/lib/ledger";
import { formatPrice } from "@/lib/format";
import { errorMessage, toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface CustomerPickerProps {
  value: string | null;
  onChange: (customerId: string | null) => void;
  autoFocus?: boolean;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[إأآا]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
}

export function CustomerPicker({ value, onChange, autoFocus }: CustomerPickerProps) {
  const { customers, ledger } = useAppData();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const balances = useMemo(() => customerBalances(ledger), [ledger]);
  const selected = value ? customers.find((c) => c.id === value) : undefined;

  const matches = useMemo(() => {
    const q = normalize(query);
    return customers
      .filter((c) => !c.archived)
      .filter((c) => !q || normalize(c.name).includes(q) || (c.phone ?? "").includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"))
      .slice(0, 6);
  }, [customers, query]);

  function startCreate() {
    setNewName(query.trim());
    setNewPhone("");
    setCreating(true);
  }

  function create() {
    try {
      const c = addCustomer({ name: newName, phone: newPhone });
      onChange(c.id);
      setCreating(false);
      setQuery("");
      toast.success(`تمت إضافة العميل «${c.name}»`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (selected) {
    const b = balances.get(selected.id) ?? 0;
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserRound className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {b > 0 ? `عليه ${formatPrice(b)}` : b < 0 ? `له ${formatPrice(-b)}` : "لا يوجد رصيد"}
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <X className="size-3.5" />
          تغيير
        </Button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="grid gap-2 rounded-lg border p-3">
        <p className="text-sm font-medium">عميل جديد</p>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="اسم العميل"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              create();
            }
          }}
        />
        <Input
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          placeholder="رقم الهاتف (اختياري)"
          inputMode="tel"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              create();
            }
          }}
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={create} disabled={!newName.trim()}>
            <Check className="size-3.5" />
            إضافة واختيار
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setCreating(false)}>
            إلغاء
          </Button>
        </div>
      </div>
    );
  }

  const exact = matches.some((c) => normalize(c.name) === normalize(query));

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن عميل بالاسم أو الهاتف..."
          className="ps-9"
          autoComplete="off"
          autoFocus={autoFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches.length > 0) onChange(matches[0].id);
              else if (query.trim()) startCreate();
            }
          }}
        />
      </div>
      <div className="grid gap-1">
        {matches.map((c) => {
          const b = balances.get(c.id) ?? 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
            >
              <span className="min-w-0 truncate font-medium">
                {c.name}
                {c.phone && <span className="ms-2 text-xs font-normal text-muted-foreground" dir="ltr">{c.phone}</span>}
              </span>
              <span className={cn("shrink-0 text-xs tabular-nums", b > 0 ? "text-destructive" : "text-muted-foreground")}>
                {b > 0 ? `عليه ${formatPrice(b)}` : b < 0 ? `له ${formatPrice(-b)}` : ""}
              </span>
            </button>
          );
        })}
        {matches.length === 0 && <p className="px-3 py-1 text-xs text-muted-foreground">{customers.length === 0 ? "لا يوجد عملاء بعد" : "لا نتائج"}</p>}
        {!exact && (
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-medium text-primary hover:bg-muted"
          >
            <Plus className="size-4" />
            {query.trim() ? `إضافة عميل جديد «${query.trim()}»` : "إضافة عميل جديد"}
          </button>
        )}
      </div>
    </div>
  );
}
