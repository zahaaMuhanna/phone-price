"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryFormDialog } from "@/features/categories/category-form-dialog";

export function AddCategoryButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        إضافة صنف
      </Button>
      <CategoryFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
