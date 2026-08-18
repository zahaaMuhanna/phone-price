"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { ProductFormDialog } from "@/features/products/product-form-dialog";
import { DeleteProductDialog } from "@/features/products/delete-product-dialog";
import type { SearchableProduct } from "@/lib/search";

interface ProductCardProps {
  product: SearchableProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="group relative flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{product.name}</p>
        <Badge variant="secondary" className="mt-1.5">
          {product.categoryName}
        </Badge>
        {product.notes && (
          <p className="mt-1.5 truncate text-sm text-muted-foreground">{product.notes}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-2xl font-bold tabular-nums whitespace-nowrap">
          {formatPrice(product.priceAgorot)}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="تعديل"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="حذف"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={product} />
      <DeleteProductDialog open={deleteOpen} onOpenChange={setDeleteOpen} product={product} />
    </div>
  );
}
