"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { PackageSearch, PackagePlus } from "lucide-react";
import { useAppData } from "@/lib/store";
import { searchProducts } from "@/lib/search";
import { SearchBar } from "@/features/search/search-bar";
import { ProductCard } from "@/features/products/product-card";
import { AddProductButton } from "@/features/products/add-product-button";

export default function Home() {
  const { products, categories } = useAppData();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(
    () => searchProducts(products, categories, deferredQuery),
    [products, categories, deferredQuery]
  );

  const hasProducts = products.length > 0;
  const hasQuery = deferredQuery.trim().length > 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">أسعار المنتجات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {categories.length} صنف · {products.length} منتج
        </p>
      </div>

      <SearchBar value={query} onChange={setQuery} />

      {!hasProducts && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <PackageSearch className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">لا توجد منتجات بعد</p>
          <AddProductButton label="إضافة أول منتج" />
        </div>
      )}

      {hasProducts && hasQuery && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-16 text-center">
          <PackagePlus className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">لم نجد أي منتج بهذا الاسم</p>
          <p className="text-sm text-muted-foreground">جرّب البحث باسم الموديل أو الصنف</p>
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
