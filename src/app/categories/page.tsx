"use client";

import { useMemo } from "react";
import { Tags } from "lucide-react";
import { useAppData } from "@/lib/store";
import { CategoryRow } from "@/features/categories/category-row";
import { AddCategoryButton } from "@/features/categories/add-category-button";

export default function CategoriesPage() {
  const { categories, products } = useAppData();

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الأصناف</h1>
          <p className="mt-1 text-sm text-muted-foreground">{categories.length} صنف</p>
        </div>
        <AddCategoryButton />
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <Tags className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">لا توجد أصناف بعد</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((cat) => (
            <CategoryRow key={cat.id} category={cat} productCount={productCounts.get(cat.id) ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
