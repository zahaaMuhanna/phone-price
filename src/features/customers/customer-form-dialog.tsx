"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addCustomer, updateCustomer } from "@/lib/store";
import { errorMessage, toast } from "@/lib/toast";
import type { Customer } from "@/types";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <CustomerForm key={customer?.id ?? "new"} customer={customer ?? null} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CustomerForm({ customer, onDone }: { customer: Customer | null; onDone: () => void }) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("الرجاء إدخال اسم العميل");
    try {
      if (customer) updateCustomer(customer.id, { name, phone, notes });
      else addCustomer({ name, phone, notes });
      toast.success(customer ? "تم حفظ بيانات العميل" : "تمت إضافة العميل");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{customer ? "تعديل عميل" : "إضافة عميل"}</DialogTitle>
        <DialogDescription>{customer ? "قم بتعديل بيانات العميل" : "أدخل بيانات العميل الجديد"}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="customer-name">اسم العميل</Label>
          <Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customer-phone">رقم الهاتف (اختياري)</Label>
          <Input id="customer-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" className="text-end" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customer-notes">ملاحظات (اختياري)</Label>
          <Textarea id="customer-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="submit">حفظ</Button>
      </DialogFooter>
    </form>
  );
}
