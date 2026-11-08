import { useState } from "react";
import { useApp } from "../AppContext";
import { ShopList } from "../components/ShopList";
import { Stepper } from "../components/Stepper";
import { aggregate } from "../lib/format";

/** Sélecteur en haut des courses : le panier habituel ou le plan de batch cooking. */
export function CoursesSwitch({ current }: { current: "courses" | "batch" }) {
  const { go } = useApp();
  return (
    <div className="seg full" role="group" aria-label="Type de courses">
      <button type="button" aria-pressed={current === "courses"} onClick={() => go("courses")}>Panier</button>
      <button type="button" aria-pressed={current === "batch"} onClick={() => go("batch")}>Batch cooking</button>
    </div>
  );
}

export function Courses() {
  const { recipes, cart, updateCart, go } = useApp();
  const [confirmClear, setConfirmClear] = useState(false);

  if (!cart.items.length) {
    return (
      <section className="view">
        <CoursesSwitch current="courses" />
        <div className="state">
          <strong>Ton panier est vide</strong>
          Appuie sur le caddie d'une recette pour l'ajouter. Les ingrédients et les quantités se calculent tout seuls.
          <button className="btn primary" type="button" onClick={() => go("")}>Voir les recettes</button>
        </div>
      </section>
    );
  }

  const list = aggregate(cart, recipes);
  const isOn = (key: string) => cart.checked.includes(key);
  const doneCount = list.filter(x => isOn(x.key)).length;
  list.sort((a, b) => Number(isOn(a.key)) - Number(isOn(b.key)));

  return (
    <section className="view">
      <CoursesSwitch current="courses" />
      <div className="panel">
        <h3>Recettes au panier</h3>
        <ul className="cart-recipes">
          {cart.items.map((it, idx) => {
            const r = recipes.find(x => x.id === it.rid);
            return (
              <li key={it.rid}>
                {r
                  ? <button className="nm" type="button" onClick={() => go("r-" + r.id)}>{r.name}</button>
                  : <span className="nm empty-line">Recette supprimée</span>}
                <span className="sub" style={{ margin: 0 }}>pers.</span>
                <Stepper small value={it.n} min={1} max={99}
                  onChange={v => updateCart(c => ({ ...c, items: c.items.map((x, i) => i === idx ? { ...x, n: v } : x) }))} />
                <button className="icon-btn" type="button" aria-label="Retirer du panier"
                  onClick={() => updateCart(c => ({ ...c, items: c.items.filter((_, i) => i !== idx) }))}>×</button>
              </li>
            );
          })}
        </ul>
        <div className="actions">
          {confirmClear ? (
            <>
              <button className="btn small danger" type="button"
                onClick={() => { updateCart(() => ({ items: [], checked: [] })); setConfirmClear(false); }}>Confirmer : vider le panier</button>
              <button className="btn small" type="button" onClick={() => setConfirmClear(false)}>Annuler</button>
            </>
          ) : (
            <button className="btn small danger" type="button" onClick={() => setConfirmClear(true)}>Vider le panier</button>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="row-between">
          <h3>Liste de courses</h3>
          <span className="sub" style={{ margin: 0 }}>{doneCount} / {list.length} cochés</span>
        </div>
        {list.length === 0 ? <p className="empty-line">Rien à acheter pour ces recettes.</p> : null}
        <ShopList lines={list} isOn={isOn}
          onToggle={key => updateCart(c => ({ ...c, checked: c.checked.includes(key) ? c.checked.filter(k => k !== key) : [...c.checked, key] }))} />
        <div className="actions">
          <button className="btn small" type="button" disabled={doneCount === 0}
            onClick={() => updateCart(c => ({ ...c, checked: [] }))}>Tout décocher</button>
        </div>
      </div>
    </section>
  );
}
