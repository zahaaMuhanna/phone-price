"use client";

import { ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SaleBuilder } from "@/features/sales/sale-builder";
import { formatPrice } from "@/lib/format";
import type { SearchableProduct } from "@/lib/search";

interface ProductSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: SearchableProduct;
}

/** Quick sale: product info on top, the shared invoice form below, one click to record. */
export function ProductSaleDialog({ open, onOpenChange, product }: ProductSaleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        {open && (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">{product.name}</DialogTitle>
              <DialogDescription className="sr-only">تسجيل عملية بيع لهذا المنتج</DialogDescription>
            </DialogHeader>

            <div className="flex items-start gap-4">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="size-20 shrink-0 rounded-xl border object-cover" />
              ) : (
                <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
                  <ImageOff className="size-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-snug">{product.name}</h2>
                {product.categoryName && (
                  <Badge variant="secondary" className="mt-1.5">
                    {product.categoryName}
                  </Badge>
                )}
                {product.notes && <p className="mt-1.5 text-sm text-muted-foreground">{product.notes}</p>}
              </div>
              <div className="shrink-0 text-end">
                <p className="text-xs text-muted-foreground">السعر الحالي</p>
                <p className="text-xl font-bold tabular-nums">{formatPrice(product.priceAgorot)}</p>
              </div>
            </div>

            <SaleBuilder initialProductId={product.id} onSaved={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
