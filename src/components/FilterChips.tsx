import { FILTER_HINTS, MOOD_FILTERS, TYPE_FILTERS, recipeMatches, toggleFilter } from "../lib/filters";
import type { Recipe } from "../types";

type Props = {
  recipes: Recipe[];
  /** Filtres cochés (plusieurs possibles). */
  filters: string[];
  onChange: (filters: string[]) => void;
};

/**
 * Les filtres des recettes, sur une ligne qu'on fait défiler : Toutes, Favorites, De saison, Rapide, Prêt à manger,
 * les catégories, puis les ambiances. Le nombre affiché est celui des recettes de ce filtre seul.
 * Un filtre sans aucune recette n'est montré que s'il est coché. Utilisé par la liste et par le tiroir « Choisir un plat ».
 */
export function FilterChips({ recipes, filters, onChange }: Props) {
  const chip = (c: string) => {
    const n = recipes.filter(r => recipeMatches(r, [c])).length;
    const on = filters.includes(c);
    if (n === 0 && !on) return null;
    return (
      <button key={c} className="chip" type="button" aria-pressed={on} title={FILTER_HINTS[c]}
        onClick={() => onChange(toggleFilter(filters, c))}>{c} {n}</button>
    );
  };
  return (
    <div className="chips" role="group" aria-label="Filtrer les recettes">
      <button className="chip" type="button" aria-pressed={filters.length === 0} onClick={() => onChange([])}>Toutes {recipes.length}</button>
      {TYPE_FILTERS.map(chip)}
      <span className="chip-sep" aria-hidden="true" />
      {MOOD_FILTERS.map(chip)}
    </div>
  );
}
