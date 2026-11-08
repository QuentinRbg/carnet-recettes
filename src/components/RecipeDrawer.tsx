import { useDrawerBehavior } from "../hooks/useDrawerBehavior";
import { usePhoto } from "../hooks/usePhoto";
import { fmtTime, ingOf, lines, portionsOf, qtyText } from "../lib/format";
import type { Recipe } from "../types";
import { PlateIcon } from "./Icons";

type Props = {
  r: Recipe;
  /** Nombre de personnes par case. */
  persons: number;
  /** Nombre de cases que cette recette occupe dans le plan. */
  cases: number;
  onClose: () => void;
  /** Ouvre le choix d'un autre plat à la place de celui-ci. */
  onChange: () => void;
  /** Ouvre la fiche complète de la recette. */
  onOpen: () => void;
};

/**
 * Tiroir de la recette d'une case du batch : photo, ingrédients, étapes et notes.
 * Les quantités sont celles de TOUTES les cases de cette recette (on la cuisine une seule fois) :
 * 3 cases de 2 personnes = les quantités pour 6 personnes.
 */
export function RecipeDrawer({ r, persons, cases, onClose, onChange, onOpen }: Props) {
  useDrawerBehavior(onClose);
  const photo = usePhoto(r.id, r.thumb);
  const total = persons * cases;
  const base = portionsOf(r);
  const ing = ingOf(r), steps = lines(r.steps);

  return (
    <div className="drawer-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer recipe-drawer" role="dialog" aria-modal="true" aria-labelledby="recipeDrawerTitle">
        <span className="grab" aria-hidden="true" />
        <button className="icon-btn drawer-close" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        {photo
          ? <img className="drawer-img" src={photo} alt="" />
          : <span className="drawer-img ph"><PlateIcon /></span>}
        <div className="drawer-body">
          <div>
            <h2 id="recipeDrawerTitle">{r.name}</h2>
            <p className="meta" style={{ margin: "6px 0 0" }}>
              <span className="tag">{r.category || "Autre"}</span>
              {r.time ? <span>{fmtTime(r.time)}</span> : null}
              {(r.envies || []).map(x => <span key={x} className="tag alt">{x}</span>)}
            </p>
          </div>

          <div className="actions">
            <button className="btn small" type="button" onClick={onChange}>Changer de plat</button>
            <button className="btn small" type="button" onClick={onOpen}>Voir la fiche</button>
          </div>

          <div className="drawer-section">
            <h3 className="label-up">Ingrédients</h3>
            <p className="sub" style={{ margin: 0 }}>
              Pour {total} pers.{cases > 1 ? " (" + cases + " plats × " + persons + " pers.)" : ""}
            </p>
            <ul className="ings">
              {ing.length === 0
                ? <li><span className="empty-line">Pas d'ingrédients.</span></li>
                : ing.map((g, i) => (
                  <li key={i}><span>{g.n}</span><span className="q">{qtyText((Number(g.q) || 0) * total / base, g.u)}</span></li>
                ))}
            </ul>
          </div>

          {steps.length ? (
            <div className="drawer-section">
              <h3 className="label-up">Préparation</h3>
              <ol className="steps">
                {steps.map((t, i) => <li key={i}><span className="n">Étape {i + 1}</span><span>{t}</span></li>)}
              </ol>
            </div>
          ) : null}

          {r.notes ? (
            <div className="drawer-section">
              <h3 className="label-up">Notes</h3>
              <p className="notes">{r.notes}</p>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
