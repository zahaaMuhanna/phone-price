"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteCategory } from "@/lib/store";
import { errorMessage, toast } from "@/lib/toast";
import type { Category } from "@/types";

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}

export function DeleteCategoryDialog({ open, onOpenChange, category }: DeleteCategoryDialogProps) {
  if (!category) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف الصنف</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من حذف صنف &quot;{category.name}&quot;؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              try {
                deleteCategory(category.id);
              } catch (e) {
                toast.error(errorMessage(e));
              }
              onOpenChange(false);
            }}
          >
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
