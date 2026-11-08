export type Ing = { n: string; q: number; u: string };

export type Recipe = {
  id: string;
  name: string;
  category: string;
  time: number;
  /** Nombre de personnes pour lequel les quantités `ing` sont écrites (1 si absent). */
  portions?: number;
  ing?: Ing[];
  /** Ancien format : un ingrédient par ligne. */
  ingredients?: string;
  steps: string;
  notes: string;
  fav: boolean;
  createdAt: number;
  envies: string[];
  composants: string[];
};

export type RecipeInput = Omit<Recipe, "id">;

export type CartItem = { rid: string; n: number };
export type Cart = { items: CartItem[]; checked: string[] };
