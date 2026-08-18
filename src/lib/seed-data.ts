import type { AppData, Category, Product } from "@/types";

const now = Date.now();

const categoryDefs = [
  "شاشات",
  "بطاريات",
  "قطع صيانة",
  "اكسسوارات",
  "شواحن",
] as const;

export function buildSeedData(): AppData {
  const categories: Category[] = categoryDefs.map((name, i) => ({
    id: `cat-${i + 1}`,
    name,
    createdAt: now,
  }));

  const byName = (name: string) => categories.find((c) => c.name === name)!.id;

  const productDefs: Array<[string, string, number]> = [
    ["iPhone 11 LCD", "شاشات", 40],
    ["iPhone 11 OLED", "شاشات", 55],
    ["iPhone 12 LCD", "شاشات", 45],
    ["iPhone 12 OLED", "شاشات", 65],
    ["Samsung A15 LCD", "شاشات", 35],
    ["Samsung A15 OLED", "شاشات", 50],
    ["Samsung A25 LCD", "شاشات", 40],
    ["Redmi Note 13 LCD", "شاشات", 30],
    ["Redmi 10A LCD", "شاشات", 25],
    ["Redmi 9A LCD", "شاشات", 22],
    ["Type-C Cable", "اكسسوارات", 10],
    ["Fast Charger 25W", "شواحن", 30],
  ];

  const products: Product[] = productDefs.map(([name, catName, price], i) => ({
    id: `prod-${i + 1}`,
    name,
    categoryId: byName(catName),
    priceAgorot: Math.round(price * 100),
    createdAt: now,
    updatedAt: now,
  }));

  return { categories, products };
}
