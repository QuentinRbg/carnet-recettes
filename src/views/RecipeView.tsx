import { useState } from "react";
import { useApp } from "../AppContext";
import { CartButton } from "../components/CartButton";
import { BackIcon, PencilIcon, TrashIcon } from "../components/Icons";
import { Stepper } from "../components/Stepper";
import { fmtTime, ingOf, lines, qtyText } from "../lib/format";
import { EditForm } from "./EditForm";

export function RecipeView({ id }: { id: string }) {
  const { recipes, loaded, go, saveRecipe, askDelete } = useApp();
  const r = recipes.find(x => x.id === id);
  const [editing, setEditing] = useState(false);
  const [viewN, setViewN] = useState(1);

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
  return (
    <section className="view">
      {topbar}
      <div>
        <h1>{r.name}</h1>
        <p className="meta" style={{ margin: "8px 0 0" }}>
          <span className="tag">{r.category || "Autre"}</span>
          {r.time ? <span>{fmtTime(r.time)}</span> : null}
          {(r.envies || []).map(x => <span key={x} className="tag alt">{x}</span>)}
          {(r.composants || []).map(x => <span key={x} className="tag">{x}</span>)}
        </p>
      </div>

      <div className="panel">
        <div className="portions">
          <h3>Ingrédients</h3>
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
            <li key={i}><span>{g.n}</span><span className="q">{qtyText((Number(g.q) || 0) * viewN, g.u)}</span></li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3>Préparation</h3>
        {steps.length ? (
          <ol className="steps">
            {steps.map((s, i) => <li key={i}><span className="n">Étape {i + 1}</span><span>{s}</span></li>)}
          </ol>
        ) : <p className="empty-line">Pas encore d'étapes.</p>}
      </div>

      {r.notes ? <div className="panel"><h3>Notes</h3><p className="notes">{r.notes}</p></div> : null}
    </section>
  );
}
