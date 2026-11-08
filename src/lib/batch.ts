import type { Cart } from "../types";

/** Une case du plan : une recette et le nombre de personnes. rid vide = case libre. */
export type BatchSlot = { rid: string; n: number };

/** Plan de batch cooking : les cases, ce qui est coché dans la liste de courses, et le nombre de personnes proposé par défaut. */
export type Batch = { slots: BatchSlot[]; checked: string[]; persons: number };

export const MIN_SLOTS = 1;
export const MAX_SLOTS = 12;
export const DEFAULT_SLOTS = 6;

const emptySlot = (): BatchSlot => ({ rid: "", n: 1 });

export function defaultBatch(): Batch {
  return { slots: Array.from({ length: DEFAULT_SLOTS }, emptySlot), checked: [], persons: 2 };
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Remet en forme ce qui vient de Firestore (document absent, ancien ou abîmé). */
export function normalizeBatch(d: unknown): Batch {
  if (!d || typeof d !== "object") return defaultBatch();
  const x = d as { slots?: unknown; checked?: unknown; persons?: unknown };
  const slots = Array.isArray(x.slots)
    ? x.slots.slice(0, MAX_SLOTS).map((s: { rid?: unknown; n?: unknown } | null) => ({
        rid: s && typeof s.rid === "string" ? s.rid : "",
        n: clamp(Math.round(Number(s?.n)) || 1, 1, 99)
      }))
    : defaultBatch().slots;
  return {
    slots: slots.length ? slots : defaultBatch().slots,
    checked: Array.isArray(x.checked) ? x.checked.filter((k): k is string => typeof k === "string") : [],
    persons: clamp(Math.round(Number(x.persons)) || 2, 1, 99)
  };
}

/**
 * Change le nombre de cases. En réduisant, on enlève d'abord les cases libres en partant de la fin,
 * pour ne pas perdre un plat choisi tant qu'il reste une case libre à retirer.
 */
export function resizeSlots(slots: BatchSlot[], count: number): BatchSlot[] {
  const target = clamp(Math.round(count), MIN_SLOTS, MAX_SLOTS);
  if (target >= slots.length) return [...slots, ...Array.from({ length: target - slots.length }, emptySlot)];
  const out = [...slots];
  for (let i = out.length - 1; i >= 0 && out.length > target; i--) {
    if (!out[i].rid) out.splice(i, 1);
  }
  return out.slice(0, target);
}

export const filledSlots = (b: Batch): BatchSlot[] => b.slots.filter(s => s.rid);

/** Le plan sous forme de panier : sert à calculer la liste de courses avec la même fonction `aggregate`. */
export function batchToCart(b: Batch): Cart {
  return { items: filledSlots(b).map(s => ({ rid: s.rid, n: s.n })), checked: b.checked };
}

/** Vide les cases qui pointent vers une recette supprimée. */
export function dropRecipe(b: Batch, rid: string): Batch {
  return { ...b, slots: b.slots.map(s => (s.rid === rid ? emptySlot() : s)) };
}

/** Une recette tirée au hasard occupe 2 ou 3 cases : en batch cooking, on cuisine un plat pour plusieurs repas. */
export const GROUP_MIN = 2;
export const GROUP_MAX = 3;

/**
 * Répartit `total` cases en groupes de 2 ou 3, au hasard : 6 cases peuvent donner 3 + 3, 2 + 2 + 2, 2 + 3 + 1…
 * Une case isolée n'arrive que s'il n'y a qu'une case : on ne laisse jamais un « 1 » en bout de liste quand on peut l'éviter.
 */
export function randomGroups(total: number, rand: () => number = Math.random): number[] {
  const out: number[] = [];
  let left = Math.max(0, Math.floor(total));
  while (left > 0) {
    if (left <= GROUP_MAX) { out.push(left); break; }
    let size = GROUP_MIN + Math.floor(rand() * (GROUP_MAX - GROUP_MIN + 1));
    if (left - size === 1) size = GROUP_MIN;
    out.push(size);
    left -= size;
  }
  return out;
}

/**
 * Remplit les cases libres au hasard. Chaque recette tirée occupe 2 ou 3 cases (voir randomGroups), l'une à côté de l'autre,
 * avec le nombre de personnes réglé en haut. On ne reprend pas une recette déjà dans le plan.
 * S'il n'y a pas assez de recettes, les cases se répartissent entre celles qui existent.
 */
export function fillRandom(b: Batch, candidates: string[], rand: () => number = Math.random): Batch {
  const free = b.slots.map((s, i) => (s.rid ? -1 : i)).filter(i => i >= 0);
  const taken = new Set(filledSlots(b).map(s => s.rid));
  const pool = candidates.filter(id => !taken.has(id));
  if (!free.length || !pool.length) return b;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let sizes = randomGroups(free.length, rand);
  if (pool.length < sizes.length) {
    sizes = Array.from({ length: pool.length }, () => 0);
    for (let k = 0; k < free.length; k++) sizes[k % pool.length]++;
  }
  const slots = [...b.slots];
  let at = 0;
  sizes.forEach((size, g) => {
    for (let k = 0; k < size; k++) slots[free[at++]] = { rid: pool[g], n: b.persons };
  });
  return { ...b, slots };
}
