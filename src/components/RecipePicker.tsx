import { useEffect, useRef, useState } from "react";
import { useDrawerBehavior } from "../hooks/useDrawerBehavior";
import { fmtTime, ingOf, norm } from "../lib/format";
import { inSeason } from "../lib/season";
import type { Recipe } from "../types";
import { PlateIcon } from "./Icons";

type Props = {
  recipes: Recipe[];
  /** Recettes déjà dans le plan : signalées, mais on peut les reprendre. */
  taken: string[];
  onPick: (r: Recipe) => void;
  onClose: () => void;
};

/** Tiroir « Choisir un plat » : recherche, filtre « De saison », puis un toucher sur la recette. */
export function RecipePicker({ recipes, taken, onPick, onClose }: Props) {
  useDrawerBehavior(onClose);
  const [query, setQuery] = useState("");
  const [seasonOnly, setSeasonOnly] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);

  const q = norm(query.trim());
  const shown = recipes.filter(r => {
    if (seasonOnly && !inSeason(r)) return false;
    if (!q) return true;
    return norm(r.name).includes(q) || norm(r.category).includes(q) || ingOf(r).some(g => norm(g.n).includes(q));
  });

  return (
    <div className="drawer-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer picker" role="dialog" aria-modal="true" aria-labelledby="pickerTitle">
        <span className="grab" aria-hidden="true" />
        <button className="icon-btn drawer-close" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        <div className="drawer-body">
          <h2 id="pickerTitle">Choisir un plat</h2>
          <input ref={input} type="search" placeholder="Rechercher…" aria-label="Rechercher une recette" value={query} onChange={e => setQuery(e.target.value)} />
          <div className="chips">
            <button className="chip" type="button" aria-pressed={seasonOnly} onClick={() => setSeasonOnly(!seasonOnly)}>De saison</button>
          </div>
          <ul className="pick-list">
            {shown.map(r => (
              <li key={r.id}>
                <button type="button" onClick={() => onPick(r)}>
                  {r.thumb ? <img className="pick-img" src={r.thumb} alt="" loading="lazy" /> : <span className="pick-img ph"><PlateIcon /></span>}
                  <span className="pick-text">
                    <span className="name">{r.name}</span>
                    <span className="meta">
                      {r.time ? <span>{fmtTime(r.time)}</span> : null}
                      {taken.includes(r.id) ? <span className="tag">déjà choisi</span> : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {shown.length === 0 ? <p className="empty-line">Aucune recette trouvée.</p> : null}
        </div>
      </aside>
    </div>
  );
}
