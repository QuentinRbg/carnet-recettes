import type { Cart } from "../types";

/** Une case du plan : une recette, pour une portion (le nombre de personnes est réglé une fois pour tout le plan). rid vide = case libre. */
export type BatchSlot = { rid: string };

/** Plan de batch cooking : les cases, ce qui est coché dans la liste de courses, et le nombre de personnes pour chaque case. */
export type Batch = { slots: BatchSlot[]; checked: string[]; persons: number };

export const MIN_SLOTS = 1;
export const MAX_SLOTS = 12;
export const DEFAULT_SLOTS = 6;

const emptySlot = (): BatchSlot => ({ rid: "" });

export function defaultBatch(): Batch {
  return { slots: Array.from({ length: DEFAULT_SLOTS }, emptySlot), checked: [], persons: 2 };
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Les plats d'abord, puis les cases libres, sans changer l'ordre des plats : jamais de trou entre deux plats. */
export function compactSlots(slots: BatchSlot[]): BatchSlot[] {
  return [...slots.filter(s => s.rid), ...slots.filter(s => !s.rid)];
}

/** Remet en forme ce qui vient de Firestore (document absent, ancien ou abîmé). */
export function normalizeBatch(d: unknown): Batch {
  if (!d || typeof d !== "object") return defaultBatch();
  const x = d as { slots?: unknown; checked?: unknown; persons?: unknown };
  const slots = Array.isArray(x.slots)
    ? x.slots.slice(0, MAX_SLOTS).map((s: { rid?: unknown } | null) => ({ rid: s && typeof s.rid === "string" ? s.rid : "" }))
    : defaultBatch().slots;
  return {
    slots: slots.length ? compactSlots(slots) : defaultBatch().slots,
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

/** Le plan sous forme de panier : sert à calculer la liste de courses avec la même fonction `aggregate`. Chaque case compte pour `persons` personnes. */
export function batchToCart(b: Batch): Cart {
  return { items: filledSlots(b).map(s => ({ rid: s.rid, n: b.persons })), checked: b.checked };
}

/** Vide les cases qui pointent vers une recette supprimée : les plats suivants remontent. */
export function dropRecipe(b: Batch, rid: string): Batch {
  return { ...b, slots: compactSlots(b.slots.map(s => (s.rid === rid ? emptySlot() : s))) };
}

/** Retire le plat d'une case : tous les plats d'après remontent d'une case, il n'y a pas de trou. */
export function clearSlot(b: Batch, index: number): Batch {
  return { ...b, slots: compactSlots(b.slots.map((s, i) => (i === index ? emptySlot() : s))) };
}

/**
 * Met une recette dans une case. Sur une case occupée, elle remplace le plat à sa place.
 * Sur une case libre, elle prend la première case libre : les plats restent groupés au début.
 */
export function setSlot(b: Batch, index: number, rid: string): Batch {
  return { ...b, slots: compactSlots(b.slots.map((s, i) => (i === index ? { rid } : s))) };
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
 * pour le nombre de personnes réglé en haut. On ne reprend pas une recette déjà dans le plan.
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
    for (let k = 0; k < size; k++) slots[free[at++]] = { rid: pool[g] };
  });
  return { ...b, slots: compactSlots(slots) };
}

/**
 * Ajoute une portion d'un plat : la recette de la case `index` occupe une case libre de plus.
 * La nouvelle case se place juste après les cases de cette recette (elles restent côte à côte) ;
 * on retire pour cela une case libre ailleurs, donc le nombre de cases ne change pas.
 * Sans case libre, ou si la case est libre, rien ne change.
 */
export function addPortion(b: Batch, index: number): Batch {
  const rid = b.slots[index]?.rid;
  if (!rid) return b;
  const free = b.slots.findIndex(s => !s.rid);
  if (free < 0) return b;
  const slots = b.slots.filter((_, i) => i !== free);
  let last = free < index ? index - 1 : index;
  while (slots[last + 1]?.rid === rid) last++;
  slots.splice(last + 1, 0, { rid });
  return { ...b, slots: compactSlots(slots) };
}

/** Il reste au moins une case libre : on peut ajouter une portion. */
export const hasFreeSlot = (b: Batch): boolean => b.slots.some(s => !s.rid);
