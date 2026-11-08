import { createContext, useContext } from "react";
import type { Data } from "./hooks/useData";
import type { Recipe } from "./types";

export type AppCtx = Data & {
  go: (hash: string) => void;
  toast: (msg: string) => void;
  /** Ouvre la fenêtre « pour combien de personnes » avant d'ajouter au panier. */
  openCart: (r: Recipe) => void;
  /** Ouvre la confirmation de suppression. */
  askDelete: (r: Recipe) => void;
};

export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp hors du fournisseur");
  return c;
}
