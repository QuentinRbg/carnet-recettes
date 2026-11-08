import { useState } from "react";
import { useDrawerBehavior } from "../hooks/useDrawerBehavior";
import { usePhoto } from "../hooks/usePhoto";
import { portionsOf } from "../lib/format";
import type { Recipe } from "../types";
import { PlateIcon } from "./Icons";
import { Stepper } from "./Stepper";

type Props = { r: Recipe; onClose: () => void; onAdd: (n: number) => void };

/**
 * « Ajouter au panier » : un tiroir avec la photo du plat.
 * Il monte depuis le bas sur téléphone et arrive par la droite sur grand écran.
 * Se ferme avec Échap, la croix ou un toucher sur le fond.
 */
export function CartDrawer({ r, onClose, onAdd }: Props) {
  const [n, setN] = useState(() => portionsOf(r));
  const photo = usePhoto(r.id, r.thumb);

  useDrawerBehavior(onClose);

  return (
    <div className="drawer-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle">
        <span className="grab" aria-hidden="true" />
        <button className="icon-btn drawer-close" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        {photo
          ? <img className="drawer-img" src={photo} alt="" />
          : <span className="drawer-img ph"><PlateIcon /></span>}
        <div className="drawer-body">
          <div>
            <h2 id="drawerTitle">Ajouter au panier</h2>
            <p className="sub">{r.name}</p>
          </div>
          <div className="portions">
            <span>Pour combien de personnes ?</span>
            <Stepper value={n} min={1} max={99} onChange={setN} />
          </div>
          <div className="actions drawer-actions">
            <button className="btn" type="button" onClick={onClose}>Annuler</button>
            <button className="btn primary" type="button" autoFocus onClick={() => onAdd(n)}>Ajouter au panier</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
