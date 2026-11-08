import { PLURAL } from "../constants";
import type { Cart, Ing, Recipe } from "../types";

export function norm(s?: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function fmtTime(m: number | string): string {
  const n = Number(m);
  if (!n) return "";
  if (n < 60) return n + " min";
  const hh = Math.floor(n / 60), mm = n % 60;
  return hh + " h" + (mm ? " " + String(mm).padStart(2, "0") : "");
}

export function lines(s?: string): string[] {
  return (s || "").split("\n").map(x => x.trim()).filter(Boolean);
}

export function fmtNum(q: number): string {
  return (Math.round(q * 100) / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function unitLabel(u: string, q: number): string {
  return q > 1 && PLURAL[u] ? PLURAL[u] : u;
}

export function qtyText(qty: number | string, unit: string): string {
  let q = Number(qty) || 0, u = unit;
  if (!q) return "";
  if (u === "g" && q >= 1000) { q = q / 1000; u = "kg"; }
  else if (u === "ml" && q >= 1000) { q = q / 1000; u = "l"; }
  return fmtNum(q) + (u ? " " + unitLabel(u, q) : "");
}

/** Nombre de personnes pour lequel les quantités de la recette sont écrites (1 par défaut). */
export function portionsOf(r: Recipe): number {
  const p = Math.round(Number(r.portions));
  return p >= 1 ? p : 1;
}

/** Une recette est « complète » si elle a des ingrédients ou des étapes, ou si c'est un plat déjà préparé. */
export function isComplete(r: Recipe): boolean {
  return !!r.readyMade || ingOf(r).length > 0 || lines(r.steps).length > 0;
}

/** Ingrédients d'une recette, y compris l'ancien format (un ingrédient par ligne). */
export function ingOf(r: Recipe): Ing[] {
  if (Array.isArray(r.ing)) return r.ing;
  return lines(r.ingredients).map(x => ({ n: x, q: 0, u: "" }));
}

export type ShopLine = { key: string; name: string; u: string; q: number };

/** Liste de courses : additionne par nom normalisé et unité (g/kg et ml/cl/l sont convertis).
 * it.n = nombre de personnes ; les quantités de la recette sont pour `portions` personnes. */
export function aggregate(cart: Cart, recipes: Recipe[]): ShopLine[] {
  const map: Record<string, ShopLine> = {};
  cart.items.forEach(it => {
    const r = recipes.find(x => x.id === it.rid);
    if (!r) return;
    ingOf(r).forEach(g => {
      if (!g.n || !g.n.trim()) return;
      let u = g.u || "", mult = 1;
      if (u === "kg") { u = "g"; mult = 1000; }
      else if (u === "cl") { u = "ml"; mult = 10; }
      else if (u === "l") { u = "ml"; mult = 1000; }
      const key = norm(g.n.trim()) + "|" + u;
      if (!map[key]) map[key] = { key, name: g.n.trim(), u, q: 0 };
      map[key].q += (Number(g.q) || 0) * mult * it.n / portionsOf(r);
    });
  });
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export type CatalogEntry = { k: string; name: string; unit: string };

/** Suggestions d'ingrédients : tous les noms déjà utilisés, avec l'unité la plus fréquente. */
export function ingCatalog(recipes: Recipe[]): CatalogEntry[] {
  const map: Record<string, { k: string; name: string; units: Record<string, number> }> = {};
  recipes.forEach(r => {
    ingOf(r).forEach(g => {
      const n = (g.n || "").trim();
      if (!n) return;
      const k = norm(n);
      const e = map[k] || (map[k] = { k, name: n, units: {} });
      const u = g.u || "";
      e.units[u] = (e.units[u] || 0) + 1;
    });
  });
  return Object.values(map).map(e => {
    let best = "", n = 0;
    Object.keys(e.units).forEach(u => { if (e.units[u] > n) { n = e.units[u]; best = u; } });
    return { k: e.k, name: e.name, unit: best };
  });
}
