"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCategory, updateCategory } from "@/lib/store";
import type { Category } from "@/types";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {open && (
          <CategoryForm
            key={category?.id ?? "new"}
            category={category ?? null}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CategoryFormProps {
  category: Category | null;
  onDone: () => void;
}

function CategoryForm({ category, onDone }: CategoryFormProps) {
  const isEdit = Boolean(category);
  const [name, setName] = useState(category?.name ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("الرجاء إدخال اسم الصنف");
      return;
    }

    if (isEdit && category) {
      updateCategory(category.id, trimmed);
    } else {
      addCategory(trimmed);
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "تعديل صنف" : "إضافة صنف"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "قم بتعديل اسم الصنف" : "أدخل اسم الصنف الجديد"}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2 py-4">
        <Label htmlFor="category-name">اسم الصنف</Label>
        <Input
          id="category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: شواحن"
          autoFocus
        />
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
