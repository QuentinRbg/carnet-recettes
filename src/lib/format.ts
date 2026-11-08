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

const FACULTATIF = /\(\s*facultatif\s*\)/i;

/** Singulier approximatif : retire le « s » final des mots de plus de 3 lettres (oignons → oignon). */
const singular = (w: string) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

/**
 * Clé d'un ingrédient dans la liste de courses : sans accents ni majuscules, sans « (facultatif) », au singulier.
 * « Oignons » et « Oignon », « Ciboulette (facultatif) » et « Ciboulette » donnent la même clé.
 */
export function ingredientKey(name: string): string {
  return norm(name).replace(/œ/g, "oe").replace(FACULTATIF, "")
    .split(/\s+/).filter(Boolean).map(singular).join(" ");
}

/** Ingrédients qu'on mesure en volume : grammes et millilitres se valent à peu près (1 g ≈ 1 ml), et une cuillère se convertit. */
const LIQUID = /creme|\blait\b|concass|coulis|sauce|huile|vinaigre|\bvin\b|bouillon|\bjus\b|soupe|rhum|miel|sirop/;

/**
 * Liste de courses. it.n = nombre de personnes ; les quantités de la recette sont pour `portions` personnes.
 * On additionne un même ingrédient (voir ingredientKey) en convertissant :
 * - g et kg ; ml, cl et l ; cuillères à soupe et à café (1 càs = 3 càc), qui restent donc des lignes distinctes des autres unités ;
 * - pour les liquides seulement (crème, lait, huile, sauces…), les grammes et les cuillères (1 càc = 5 ml) en millilitres,
 *   dès qu'il y a des grammes ou des millilitres ; s'il n'y a que des cuillères, on garde les cuillères.
 * Les pièces, pincées, gousses… ne se convertissent pas : une ligne par unité.
 */
export function aggregate(cart: Cart, recipes: Recipe[]): ShopLine[] {
  type Acc = { name: string; allOptional: boolean; mass: number; vol: number; spoon: number; other: Record<string, number> };
  const acc = new Map<string, Acc>();
  cart.items.forEach(it => {
    const r = recipes.find(x => x.id === it.rid);
    if (!r) return;
    ingOf(r).forEach(g => {
      if (!g.n || !g.n.trim()) return;
      const k = ingredientKey(g.n);
      if (!k) return;
      const optional = FACULTATIF.test(g.n);
      const e = acc.get(k) || { name: g.n.replace(FACULTATIF, "").trim(), allOptional: true, mass: 0, vol: 0, spoon: 0, other: {} };
      if (!optional) e.allOptional = false;
      const q = (Number(g.q) || 0) * it.n / portionsOf(r);
      const u = g.u || "";
      if (u === "g") e.mass += q; else if (u === "kg") e.mass += q * 1000;
      else if (u === "ml") e.vol += q; else if (u === "cl") e.vol += q * 10; else if (u === "l") e.vol += q * 1000;
      else if (u === "càc") e.spoon += q; else if (u === "càs") e.spoon += q * 3;
      else e.other[u] = (e.other[u] || 0) + q;
      acc.set(k, e);
    });
  });
  const out: ShopLine[] = [];
  acc.forEach((e, k) => {
    let { mass, vol, spoon } = e;
    if (LIQUID.test(k) && (mass > 0 || vol > 0)) { vol += mass + spoon * 5; mass = 0; spoon = 0; }
    const name = e.allOptional ? e.name + " (facultatif)" : e.name;
    if (mass) out.push({ key: k + "|g", name, u: "g", q: mass });
    if (vol) out.push({ key: k + "|ml", name, u: "ml", q: vol });
    if (spoon) out.push({ key: k + "|càc", name, u: "càc", q: spoon });
    Object.entries(e.other).forEach(([u, q]) => out.push({ key: k + "|" + u, name, u, q }));
  });
  return out.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Quantité d'une ligne de la liste de courses. Les cuillères à café s'affichent en cuillères à soupe quand il y en a assez (7 càc → 2 càs 1 càc). */
export function shopQtyText(x: ShopLine): string {
  if (x.u === "càc") {
    const t = Math.round(x.q * 100) / 100;
    if (t >= 3) {
      const spoons = Math.floor(t / 3 + 1e-9);
      const rest = Math.round((t - spoons * 3) * 100) / 100;
      return fmtNum(spoons) + " càs" + (rest > 0 ? " " + fmtNum(rest) + " càc" : "");
    }
    return fmtNum(t) + " càc";
  }
  return qtyText(x.q, x.u);
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
