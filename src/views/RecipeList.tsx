import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useApp } from "../AppContext";
import { CartButton } from "../components/CartButton";
import { Dialog } from "../components/Dialog";
import { PlateIcon } from "../components/Icons";
import { CATS } from "../constants";
import { fmtTime, ingOf, norm } from "../lib/format";
import { inSeason } from "../lib/season";
import type { Recipe } from "../types";

const READY = "Prêt à manger";
const SEASON = "De saison";

export type ListUi = { filterCat: string; query: string };

function matches(r: Recipe, ui: ListUi): boolean {
  if (ui.filterCat === "Favorites" && !r.fav) return false;
  if (ui.filterCat === READY && !r.readyMade) return false;
  if (ui.filterCat === SEASON && !inSeason(r)) return false;
  if (ui.filterCat !== "Toutes" && ui.filterCat !== "Favorites" && ui.filterCat !== READY && ui.filterCat !== SEASON && r.category !== ui.filterCat) return false;
  if (!ui.query.trim()) return true;
  const q = norm(ui.query.trim());
  if (norm(r.name).includes(q) || norm(r.category).includes(q)) return true;
  return ingOf(r).some(g => norm(g.n).includes(q));
}

function readLastCat(): string {
  try {
    const lc = localStorage.getItem("recettes.cat");
    if (lc && CATS.includes(lc)) return lc;
  } catch { /* pas de stockage disponible */ }
  return "Plat";
}

export function RecipeList({ ui, setUi }: { ui: ListUi; setUi: (u: ListUi) => void }) {
  const { recipes, loaded, go } = useApp();
  const [adding, setAdding] = useState(false);
  const shown = recipes.filter(r => matches(r, ui));

  return (
    <section className="view">
      <div className="searchrow">
        <input type="search" placeholder="Rechercher…" aria-label="Rechercher" value={ui.query}
          onChange={e => setUi({ ...ui, query: e.target.value })} />
        <button className="btn primary" type="button" onClick={() => setAdding(true)}>Ajouter</button>
      </div>
      <div className="chips" role="group" aria-label="Filtrer par catégorie">
        {["Toutes", "Favorites", SEASON, READY, ...CATS].map(c => {
          const n = recipes.filter(r => c === "Toutes" ? true : c === "Favorites" ? r.fav : c === SEASON ? inSeason(r) : c === READY ? !!r.readyMade : r.category === c).length;
          if (n === 0 && c !== "Toutes" && c !== ui.filterCat) return null;
          return (
            <button key={c} className="chip" type="button" aria-pressed={ui.filterCat === c}
              onClick={() => setUi({ ...ui, filterCat: c })}>{c} {n}</button>
          );
        })}
      </div>
      <ul className="list">
        {shown.map(r => {
          return (
            <li key={r.id} className="card">
              <button className="card-main" type="button" onClick={() => go("r-" + r.id)}>
                {r.thumb
                  ? <img className="card-img" src={r.thumb} alt="" loading="lazy" />
                  : <span className="card-img ph"><PlateIcon /></span>}
                <span className="card-body">
                <span className="name">{r.name}</span>
                {r.time ? <span className="meta">{fmtTime(r.time)}</span> : null}
                </span>
              </button>
              {r.fav ? <span className="fav" role="img" aria-label="Favorite">★</span> : null}
              <CartButton r={r} />
            </li>
          );
        })}
      </ul>
      {loaded && recipes.length === 0 ? (
        <div className="state"><strong>Ton carnet est vide</strong>Appuie sur « Ajouter » pour ta première recette.</div>
      ) : loaded && shown.length === 0 ? (
        <div className="state"><strong>Aucun résultat</strong>Essaie un autre mot ou une autre catégorie.</div>
      ) : null}
      {adding ? <AddDialog initialName={ui.query.trim()}onClose={() => setAdding(false)} /> : null}
    </section>
  );
}

/** Petite fenêtre pour créer une recette (seul le nom est obligatoire). */
function AddDialog({ initialName, onClose }: { initialName: string; onClose: () => void }) {
  const { addRecipe, toast } = useApp();
  const [name, setName] = useState(initialName);
  const [cat, setCat] = useState(readLastCat);
  const [time, setTime] = useState("");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); nameRef.current?.select(); }, []);

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const n = name.trim();
    if (!n) { nameRef.current?.focus(); return; }
    try { localStorage.setItem("recettes.cat", cat); } catch { /* pas de stockage disponible */ }
    addRecipe({ name: n, category: cat, time: Number(time) || 0, portions: 1, readyMade: ready, ing: [], steps: "", notes: "", envies: [], composants: [], fav: false, createdAt: Date.now() })
      .then(() => { onClose(); toast("« " + n + " » ajoutée"); })
      .catch(() => setErr("Ajout impossible, réessaie."));
  }

  return (
    <Dialog title="Nouvelle recette" titleId="addTitle" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label htmlFor="newName">Nom
          <input ref={nameRef} type="text" id="newName" maxLength={120} placeholder="Nom de la recette" autoComplete="off"
            value={name} onChange={e => setName(e.target.value)} />
        </label>
        <div className="two">
          <label htmlFor="newCat">Catégorie
            <select id="newCat" value={cat} onChange={e => setCat(e.target.value)}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label htmlFor="newTime">{ready ? "Temps de cuisson (minutes)" : "Temps total (minutes)"}
            <input type="number" id="newTime" min={0} inputMode="numeric" placeholder="Minutes" value={time} onChange={e => setTime(e.target.value)} />
          </label>
        </div>
        <label className="check" htmlFor="newReady">
          <input type="checkbox" id="newReady" checked={ready} onChange={e => setReady(e.target.checked)} />
          <span>Plat déjà préparé, sans recette (pizza surgelée…)</span>
        </label>
        <p className="hint">{err}</p>
        <div className="actions" style={{ justifyContent: "flex-end" }}>
          <button className="btn" type="button" onClick={onClose}>Annuler</button>
          <button className="btn primary" type="submit">Ajouter</button>
        </div>
      </form>
    </Dialog>
  );
}
