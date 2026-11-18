"use client";

import { CheckCircle2, XCircle, X } from "lucide-react";
import { toast, useToasts } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const items = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 start-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex items-start gap-2 rounded-xl border bg-card p-3 text-sm shadow-lg",
            t.kind === "error" ? "border-destructive/40" : "border-emerald-500/40"
          )}
        >
          {t.kind === "error" ? (
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          )}
          <span className="flex-1">{t.message}</span>
          <button type="button" aria-label="إغلاق" onClick={() => toast.dismiss(t.id)} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
