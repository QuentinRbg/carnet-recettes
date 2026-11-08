import { useState } from "react";
import { useApp } from "../AppContext";
import { CartButton } from "../components/CartButton";
import { BackIcon, PencilIcon, TrashIcon } from "../components/Icons";
import { Stepper } from "../components/Stepper";
import { fmtTime, ingOf, lines, portionsOf, qtyText } from "../lib/format";
import { EditForm } from "./EditForm";

export function RecipeView({ id }: { id: string }) {
  const { recipes, loaded, go, saveRecipe, askDelete } = useApp();
  const r = recipes.find(x => x.id === id);
  const [editing, setEditing] = useState(false);
  // null = pas touché : on affiche la recette pour son nombre de personnes recommandé.
  const [pickedN, setViewN] = useState<number | null>(null);

  const topbar = (
    <div className="topbar">
      <button className="back" type="button" onClick={() => go("")}><BackIcon />Recettes</button>
      <span className="spacer" />
      {r && !editing ? (
        <>
          <button className="icon-btn" type="button" aria-pressed={!!r.fav} aria-label={r.fav ? "Retirer des favorites" : "Ajouter aux favorites"}
            onClick={() => saveRecipe(r.id, { fav: !r.fav })}>{r.fav ? "★" : "☆"}</button>
          <CartButton r={r} />
          <button className="icon-btn" type="button" aria-label="Modifier la recette" title="Modifier" onClick={() => setEditing(true)}><PencilIcon /></button>
          <button className="icon-btn danger-ic" type="button" aria-label="Supprimer la recette" title="Supprimer" onClick={() => askDelete(r)}><TrashIcon /></button>
        </>
      ) : null}
    </div>
  );

  if (!r) {
    return (
      <section className="view">
        {topbar}
        <div className="state">
          <strong>{loaded ? "Recette introuvable" : "Chargement…"}</strong>
          {loaded ? "Elle a peut-être été supprimée." : ""}
        </div>
      </section>
    );
  }

  if (editing) {
    return (
      <section className="view">
        {topbar}
        <EditForm r={r} onCancel={() => setEditing(false)}
          onSave={patch => { setEditing(false); saveRecipe(r.id, patch); }} />
      </section>
    );
  }

  const ing = ingOf(r), steps = lines(r.steps);
  const base = portionsOf(r);
  const viewN = pickedN ?? base;
  return (
    <section className="view">
      {topbar}
      <div>
        <h1>{r.name}</h1>
        <p className="meta" style={{ margin: "8px 0 0" }}>
          <span className="tag">{r.category || "Autre"}</span>
          {r.readyMade ? <span className="tag">Prêt à manger</span> : null}
          {r.time ? <span>{r.readyMade ? "Cuisson " : ""}{fmtTime(r.time)}</span> : null}
          {base > 1 ? <span>{base} pers.</span> : null}
          {(r.envies || []).map(x => <span key={x} className="tag alt">{x}</span>)}
          {(r.composants || []).map(x => <span key={x} className="tag">{x}</span>)}
        </p>
      </div>

      {r.readyMade && ing.length === 0 ? null : <div className="panel">
        <div className="portions">
          <h3>{r.readyMade ? "À acheter" : "Ingrédients"}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="sub" style={{ margin: 0 }}>Pour</span>
            <Stepper value={viewN} min={1} max={99} onChange={setViewN} />
            <span className="sub" style={{ margin: 0 }}>pers.</span>
          </div>
        </div>
        <ul className="ings">
          {ing.length === 0 ? (
            <li><span className="empty-line">Pas encore d'ingrédients.</span></li>
          ) : ing.map((g, i) => (
            <li key={i}><span>{g.n}</span><span className="q">{qtyText((Number(g.q) || 0) * viewN / base, g.u)}</span></li>
          ))}
        </ul>
      </div>}

      {r.readyMade && steps.length === 0 ? null : <div className="panel">
        <h3>{r.readyMade ? "Cuisson" : "Préparation"}</h3>
        {steps.length ? (
          <ol className="steps">
            {steps.map((s, i) => <li key={i}><span className="n">Étape {i + 1}</span><span>{s}</span></li>)}
          </ol>
        ) : <p className="empty-line">Pas encore d'étapes.</p>}
      </div>}

      {r.notes ? <div className="panel"><h3>Notes</h3><p className="notes">{r.notes}</p></div> : null}
    </section>
  );
}
