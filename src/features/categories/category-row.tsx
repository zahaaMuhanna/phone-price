"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryFormDialog } from "@/features/categories/category-form-dialog";
import { DeleteCategoryDialog } from "@/features/categories/delete-category-dialog";
import type { Category } from "@/types";

interface CategoryRowProps {
  category: Category;
  productCount: number;
}

export function CategoryRow({ category, productCount }: CategoryRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canDelete = productCount === 0;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="font-semibold">{category.name}</span>
        <Badge variant="secondary">{productCount} منتج</Badge>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="تعديل" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="حذف"
          disabled={!canDelete}
          title={canDelete ? undefined : "لا يمكن حذف صنف يحتوي على منتجات"}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>

      <CategoryFormDialog open={editOpen} onOpenChange={setEditOpen} category={category} />
      <DeleteCategoryDialog open={deleteOpen} onOpenChange={setDeleteOpen} category={category} />
    </div>
  );
}
