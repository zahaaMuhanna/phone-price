"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductFormDialog } from "@/features/products/product-form-dialog";
import { cn } from "@/lib/utils";

interface AddProductButtonProps {
  className?: string;
  label?: string;
}

export function AddProductButton({ className, label = "إضافة منتج" }: AddProductButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className={cn(className)}>
        <Plus className="size-4" />
        {label}
      </Button>
      <ProductFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
