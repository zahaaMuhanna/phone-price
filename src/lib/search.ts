import type { Category, Product } from "@/types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْ]/g, "") // strip Arabic diacritics (tashkeel)
    .replace(/[إأآا]/g, "ا") // normalize alef variants
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

export interface SearchableProduct extends Product {
  categoryName: string;
}

export function searchProducts(
  products: Product[],
  categories: Category[],
  query: string
): SearchableProduct[] {
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const enriched: SearchableProduct[] = products.map((p) => ({
    ...p,
    categoryName: categoryById.get(p.categoryId) ?? "",
  }));

  const trimmed = query.trim();
  if (!trimmed) return enriched;

  const tokens = normalize(trimmed).split(/\s+/).filter(Boolean);

  const matches = enriched.filter((p) => {
    const haystack = normalize(`${p.name} ${p.categoryName} ${p.notes ?? ""}`);
    return tokens.every((token) => haystack.includes(token));
  });

  const normalizedQuery = normalize(trimmed);
  return matches.sort((a, b) => {
    const aName = normalize(a.name);
    const bName = normalize(b.name);
    const aStarts = aName.startsWith(normalizedQuery) ? 0 : 1;
    const bStarts = bName.startsWith(normalizedQuery) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return aName.localeCompare(bName);
  });
}
