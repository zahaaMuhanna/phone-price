"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { PackageSearch, PackagePlus, SlidersHorizontal, X } from "lucide-react";
import { useAppData } from "@/lib/store";
import { searchProducts } from "@/lib/search";
import { filterAndSortProducts, PRODUCT_SORT_LABELS, type ProductSort } from "@/lib/product-filter";
import { SearchBar } from "@/features/search/search-bar";
import { ProductCard } from "@/features/products/product-card";
import { AddProductButton } from "@/features/products/add-product-button";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function Home() {
  const { products, categories } = useAppData();
  const [query, setQuery] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [sort, setSort] = useState<ProductSort>("default");
  const deferredQuery = useDeferredValue(query);

  // Search first (name, category, description), then category filter + sort on top of it.
  const results = useMemo(
    () => filterAndSortProducts(searchProducts(products, categories, deferredQuery), categoryIds, sort),
    [products, categories, deferredQuery, categoryIds, sort]
  );

  const productCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
    return m;
  }, [products]);

  // Ignore selected categories that no longer exist (e.g. deleted in another tab).
  const activeCategoryIds = useMemo(() => {
    const valid = new Set(categories.map((c) => c.id));
    return categoryIds.filter((id) => valid.has(id));
  }, [categories, categoryIds]);

  const hasProducts = products.length > 0;
  const hasQuery = deferredQuery.trim().length > 0;
  const hasFilter = activeCategoryIds.length > 0;

  function toggleCategory(id: string) {
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">أسعار المنتجات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {categories.length} صنف · {products.length} منتج
          {(hasQuery || hasFilter) && hasProducts ? ` · ${results.length} نتيجة` : ""}
        </p>
      </div>

      <SearchBar value={query} onChange={setQuery} />

      {hasProducts && categories.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 flex-wrap items-center gap-2" role="group" aria-label="تصفية حسب الصنف">
              <button
                type="button"
                onClick={() => setCategoryIds([])}
                aria-pressed={!hasFilter}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  !hasFilter ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                الكل
              </button>
              {categories.map((c) => {
                const active = activeCategoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    {c.name}
                    <span className={cn("ms-1.5 text-xs", active ? "opacity-80" : "text-muted-foreground")}>{productCounts.get(c.id) ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <Select value={sort} onValueChange={(v) => setSort(v as ProductSort)}>
              <SelectTrigger className="w-52" aria-label="الترتيب">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRODUCT_SORT_LABELS) as ProductSort[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {PRODUCT_SORT_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(hasFilter || sort !== "default") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryIds([]);
                  setSort("default");
                }}
              >
                <X className="size-3.5" />
                إعادة ضبط
              </Button>
            )}
          </div>
        </div>
      )}

      {!hasProducts && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <PackageSearch className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">لا توجد منتجات بعد</p>
          <AddProductButton label="إضافة أول منتج" />
        </div>
      )}

      {hasProducts && (hasQuery || hasFilter) && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center">
          <PackagePlus className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">لم نجد أي منتج مطابق</p>
          <p className="text-sm text-muted-foreground">جرّب تغيير كلمات البحث أو إلغاء تصفية الأصناف</p>
        </div>
      )}

      {hasProducts && results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
