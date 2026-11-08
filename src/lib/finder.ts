import { ALERTS, BASICS, CATS, COMPS, ENVIES } from "../constants";
import type { IdeasAction, Mode } from "../constants";
import type { Recipe } from "../types";
import { ingOf, norm } from "./format";
import { currentSeason, inSeason, isSeasonal } from "./season";

export type Answers = {
  cat: string;
  fast: boolean;
  envies: string[];
  avoid: string[];
  want: string[];
  have: string[];
  haveMode: "pref" | "any";
  mood: string;
  any: Record<string, boolean>;
  done: Record<string, boolean>;
};

export type Scored = { r: Recipe; s: number; why: string[]; owned: string[]; buy: string[] };

export type Phase = "quiz" | "ask" | "alert" | "ideas" | "none" | "result";

export type Finder = {
  step: number;
  a: Answers;
  phase: Phase;
  shown: string[];
  rej: string[];
  cur: Scored | null;
  askSel: string[];
  askUnknown: boolean;
  mode: Mode;
  idea: { act: IdeasAction; i: number } | null;
};

export type QuizKey = "cat" | "fast" | "envies" | "avoid" | "want" | "have" | "mood";
export type Opt = [string | boolean, string];
export type Question =
  | { key: QuizKey; type: "single"; title: string; sub?: string; opts: Opt[] }
  | { key: QuizKey; type: "multi"; title: string; sub?: string; opts: string[]; any: string }
  | { key: QuizKey; type: "have"; title: string; sub?: string };

export const QUIZ: Question[] = [
  { key: "cat", type: "single", title: "Tu cherches quoi ?", opts: [...CATS.filter(c => c !== "Autre").map((c): Opt => [c, c]), ["", "Peu importe"]] },
  { key: "fast", type: "single", title: "Tu veux une recette rapide ?", opts: [[true, "Oui, 30 min max"], [false, "Peu importe"]] },
  { key: "envies", type: "multi", title: "Tu as envie de quoi ?", sub: "Plusieurs choix possibles", opts: ENVIES.filter(e => e !== "Doux pour l'estomac"), any: "Peu importe" },
  { key: "avoid", type: "multi", title: "Flemme d'un ingrédient ?", opts: COMPS, any: "Aucun" },
  { key: "want", type: "multi", title: "Un ingrédient te donne envie ?", sub: "Je mets en avant les recettes qui en contiennent.", opts: COMPS, any: "Peu importe" },
  { key: "have", type: "have", title: "Des ingrédients à utiliser chez toi ?" },
  {
    key: "mood", type: "single", title: "ALERTE : tu n'arrives pas à te décider ?", sub: "Parce que tu n'as pas faim ou que tu te sens patraque.",
    opts: [["", "Non, ça va"], ...Object.keys(ALERTS).map((k): Opt => [k, ALERTS[k].label])]
  }
];

export function newFinder(prev?: Finder | null, keep = false): Finder {
  const a: Answers = keep && prev ? prev.a : { cat: "", fast: false, envies: [], avoid: [], want: [], have: [], haveMode: "pref", mood: "", any: {}, done: {} };
  return { step: 0, a, phase: "quiz", shown: [], rej: [], cur: null, askSel: [], askUnknown: false, mode: "", idea: null };
}

/** Le questionnaire est en cours s'il y a eu au moins une réponse ou une proposition. */
export function finderBusy(f: Finder | null): boolean {
  return !!f && (f.phase !== "quiz" || f.step > 0);
}

export function haveOptions(recipes: Recipe[]): { k: string; name: string }[] {
  const seen: Record<string, boolean> = {}, out: { k: string; name: string }[] = [];
  recipes.forEach(r => {
    ingOf(r).forEach(g => {
      const k = norm((g.n || "").trim());
      if (!k || BASICS.includes(k) || seen[k]) return;
      seen[k] = true;
      out.push({ k, name: g.n.trim() });
    });
  });
  return out.sort((x, y) => x.name.localeCompare(y.name, "fr"));
}

/** Ne propose que les réponses pour lesquelles il existe au moins une recette (catégorie, ambiance). */
export function withAvailable(q: Question, recipes: Recipe[]): Question {
  if (q.key === "cat" && q.type === "single") {
    return { ...q, opts: q.opts.filter(o => o[0] === "" || recipes.some(r => r.category === o[0])) };
  }
  if (q.key === "envies" && q.type === "multi") {
    return { ...q, opts: q.opts.filter(o => recipes.some(r => (r.envies || []).includes(o))) };
  }
  return q;
}

const shuffle = () => Math.random() - 0.5;

export function rank(f: Finder, recipes: Recipe[], season: string = currentSeason()): Scored[] {
  const a = f.a;
  if (f.mode === "random") {
    const any = recipes.filter(r => !f.shown.includes(r.id) && !(r.composants || []).some(c => f.rej.includes(c)));
    any.sort(shuffle);
    return any.map(r => ({ r, s: 0, why: ["au hasard, à manger quand tu auras faim"], owned: [], buy: [] }));
  }
  const fast = a.fast || f.mode === "fast";
  const pool = recipes.filter(r => {
    if (f.shown.includes(r.id)) return false;
    if (a.cat && r.category !== a.cat) return false;
    if (fast && Number(r.time) > 30) return false;
    return !(r.composants || []).some(c => a.avoid.includes(c) || f.rej.includes(c));
  });
  pool.sort(shuffle);
  const scored = pool.map((r): Scored => {
    let s = 0;
    const why: string[] = [];
    if (a.cat) why.push(r.category);
    if (isSeasonal(r) && inSeason(r, season)) { s += 2; why.push("de saison"); }
    if (fast && Number(r.time) > 0) { s += 2; why.push("30 min maximum"); }
    const soft = (r.envies || []).includes("Doux pour l'estomac");
    if (f.mode === "estomac") {
      if (soft) { s += 4; why.push("doux pour l'estomac"); }
      s += (r.composants || []).filter(c => c === "Riz" || c === "Purée" || c === "Pommes de terre").length;
    }
    const env = (r.envies || []).filter(e => a.envies.includes(e));
    s += env.length * 2;
    env.forEach(e => why.push(e));
    const want = (r.composants || []).filter(c => a.want.includes(c));
    s += want.length * 2;
    want.forEach(c => why.push("avec " + c.toLowerCase()));
    const ings = ingOf(r).filter(g => g.n && !BASICS.includes(norm(g.n.trim())));
    const owned: string[] = [], buy: string[] = [];
    ings.forEach(g => { (a.have.includes(norm(g.n.trim())) ? owned : buy).push(g.n.trim()); });
    if (a.haveMode === "pref" && a.have.length && owned.length) {
      s += 4 * owned.length / ings.length;
      why.push(owned.length + (owned.length > 1 ? " ingrédients déjà chez toi" : " ingrédient déjà chez toi"));
    }
    return { r, s, why, owned, buy };
  });
  scored.sort((x, y) => y.s - x.s);
  return scored;
}

/** Choisit la prochaine recette (modifie f). */
export function propose(f: Finder, recipes: Recipe[], season: string = currentSeason()): void {
  const list = rank(f, recipes, season);
  if (!list.length) { f.phase = "none"; f.cur = null; }
  else { f.cur = list[0]; f.shown.push(list[0].r.id); f.phase = "result"; }
}

/** Tire une idée au hasard, différente de la précédente (modifie f). */
export function nextIdea(f: Finder): void {
  if (!f.idea) return;
  const items = f.idea.act.items;
  let i: number;
  do { i = Math.floor(Math.random() * items.length); } while (items.length > 1 && i === f.idea.i);
  f.idea.i = i;
}
