import { CATS, ENVIES } from "../constants";
import type { Recipe } from "../types";
import { inSeason } from "./season";

export const FAV = "Favorites";
export const SEASON = "De saison";
export const READY = "Prêt à manger";

/** Filtres « type » : favorites, de saison, prêt à manger, puis les catégories. */
export const TYPE_FILTERS = [FAV, SEASON, READY, ...CATS];
/** Filtres « ambiance » : les ambiances d'une recette (Gourmand, Healthy…). */
export const MOOD_FILTERS = ENVIES;

/**
 * Une recette passe si elle respecte tous les filtres cochés, avec cette règle :
 * Favorites, De saison et Prêt à manger se cumulent (il faut tous les respecter),
 * tandis que plusieurs catégories, ou plusieurs ambiances, s'additionnent (l'une ou l'autre).
 */
export function recipeMatches(r: Recipe, filters: string[], season?: string): boolean {
  if (filters.includes(FAV) && !r.fav) return false;
  if (filters.includes(SEASON) && !inSeason(r, season)) return false;
  if (filters.includes(READY) && !r.readyMade) return false;
  const cats = filters.filter(f => CATS.includes(f));
  if (cats.length && !cats.includes(r.category)) return false;
  const moods = filters.filter(f => MOOD_FILTERS.includes(f));
  if (moods.length && !moods.some(m => (r.envies || []).includes(m))) return false;
  return true;
}

export function toggleFilter(filters: string[], f: string): string[] {
  return filters.includes(f) ? filters.filter(x => x !== f) : [...filters, f];
}
