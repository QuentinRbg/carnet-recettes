import { SAISONS } from "../constants";

/** Saison du jour au sens du calendrier : printemps mars-mai, été juin-août, automne sept.-nov., hiver déc.-fév. */
export function currentSeason(d: Date = new Date()): string {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return "Printemps";
  if (m >= 6 && m <= 8) return "Été";
  if (m >= 9 && m <= 11) return "Automne";
  return "Hiver";
}

type WithSeasons = { saisons?: string[] };

/** La recette convient à cette saison (par défaut la saison du jour). */
export function inSeason(r: WithSeasons, season: string = currentSeason()): boolean {
  return (r.saisons || []).includes(season);
}

/**
 * Recette vraiment saisonnière : elle a au moins une saison mais pas les quatre.
 * Seules celles-là passent devant les autres dans le Meal finder.
 */
export function isSeasonal(r: WithSeasons): boolean {
  const n = (r.saisons || []).filter(s => SAISONS.includes(s)).length;
  return n > 0 && n < SAISONS.length;
}
