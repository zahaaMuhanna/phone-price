export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  /** Price stored as an integer in agorot (1 ILS = 100 agorot) to avoid floating point errors. */
  priceAgorot: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  categories: Category[];
  products: Product[];
}
