import type { SearchableProduct } from "@/lib/search";

export type ProductSort = "default" | "recent" | "name" | "price-asc" | "price-desc";

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  default: "الأكثر صلة",
  recent: "الأحدث إضافة",
  name: "الاسم (أ-ي)",
  "price-asc": "السعر: الأقل أولاً",
  "price-desc": "السعر: الأعلى أولاً",
};

/**
 * Applies category filtering and sorting on top of the existing search results,
 * so search (name / category / description) and filters always work together.
 * An empty `categoryIds` means "all categories".
 */
export function filterAndSortProducts(
  searched: SearchableProduct[],
  categoryIds: string[],
  sort: ProductSort
): SearchableProduct[] {
  const selected = new Set(categoryIds);
  const filtered = selected.size ? searched.filter((p) => selected.has(p.categoryId)) : searched;
  if (sort === "default") return filtered;
  const copy = [...filtered];
  switch (sort) {
    case "recent":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    case "price-asc":
      return copy.sort((a, b) => a.priceAgorot - b.priceAgorot || a.name.localeCompare(b.name, "ar"));
    case "price-desc":
      return copy.sort((a, b) => b.priceAgorot - a.priceAgorot || a.name.localeCompare(b.name, "ar"));
  }
}
