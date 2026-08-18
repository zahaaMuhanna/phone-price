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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppData, addProduct, updateProduct } from "@/lib/store";
import { agorotToShekels, shekelsToAgorot } from "@/lib/format";
import type { Category, Product } from "@/types";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const { categories } = useAppData();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <ProductForm
            key={product?.id ?? "new"}
            product={product ?? null}
            categories={categories}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ProductFormProps {
  product: Product | null;
  categories: Category[];
  onDone: () => void;
}

function ProductForm({ product, categories, onDone }: ProductFormProps) {
  const isEdit = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [price, setPrice] = useState(
    product ? String(agorotToShekels(product.priceAgorot)) : ""
  );
  const [notes, setNotes] = useState(product?.notes ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const priceNumber = Number(price);

    if (!trimmedName) {
      setError("الرجاء إدخال اسم المنتج");
      return;
    }
    if (!categoryId) {
      setError("الرجاء اختيار الصنف");
      return;
    }
    if (!price || Number.isNaN(priceNumber) || priceNumber < 0) {
      setError("الرجاء إدخال سعر صحيح");
      return;
    }

    const input = {
      name: trimmedName,
      categoryId,
      priceAgorot: shekelsToAgorot(priceNumber),
      notes: notes.trim() || undefined,
    };

    if (isEdit && product) {
      updateProduct(product.id, input);
    } else {
      addProduct(input);
    }

    onDone();
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "تعديل منتج" : "إضافة منتج"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "قم بتعديل بيانات المنتج" : "أدخل بيانات المنتج الجديد"}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="product-name">اسم المنتج</Label>
          <Input
            id="product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: Samsung A15 LCD"
            autoFocus
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-category">الصنف</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="product-category" className="w-full">
              <SelectValue placeholder="اختر الصنف" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-price">السعر (₪)</Label>
          <Input
            id="product-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="product-notes">ملاحظات (اختياري)</Label>
          <Textarea
            id="product-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات إضافية..."
            rows={2}
          />
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
