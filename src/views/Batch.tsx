import { useState } from "react";
import { useApp } from "../AppContext";
import { PlateIcon } from "../components/Icons";
import { RecipeDrawer } from "../components/RecipeDrawer";
import { RecipePicker } from "../components/RecipePicker";
import { ShopList } from "../components/ShopList";
import { Stepper } from "../components/Stepper";
import { CoursesSwitch } from "./Courses";
import { MAX_SLOTS, MIN_SLOTS, addPortion, batchToCart, clearSlot, fillRandom, filledSlots, hasFreeSlot, resizeSlots, setSlot } from "../lib/batch";
import { aggregate, fmtTime, lines } from "../lib/format";

/** Batch cooking : on choisit le nombre de plats, on remplit les cases, et on obtient la liste de courses et les recettes. */
export function Batch() {
  const { recipes, loaded, batch, updateBatch, go } = useApp();
  const [picking, setPicking] = useState<number | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const byId = (id: string) => recipes.find(r => r.id === id);
  const filled = filledSlots(batch).filter(s => byId(s.rid));
  // Une recette qui occupe plusieurs cases n'apparaît qu'une fois dans « Recettes à cuisiner », avec le total de personnes.
  const cooking = filled.reduce<{ rid: string; cases: number }[]>((acc, s) => {
    const e = acc.find(x => x.rid === s.rid);
    if (e) e.cases++; else acc.push({ rid: s.rid, cases: 1 });
    return acc;
  }, []);
  const shop = aggregate(batchToCart(batch), recipes);
  const isOn = (key: string) => batch.checked.includes(key);
  const doneCount = shop.filter(x => isOn(x.key)).length;
  const empties = batch.slots.filter(s => !byId(s.rid)).length;

  return (
    <section className="view">
      <CoursesSwitch current="batch" />

      <div className="panel">
        <div className="portions">
          <h3>Combien de plats ?</h3>
          <Stepper value={batch.slots.length} min={MIN_SLOTS} max={MAX_SLOTS}
            onChange={v => updateBatch(b => ({ ...b, slots: resizeSlots(b.slots, v) }))} />
        </div>
        <div className="portions">
          <span className="sub" style={{ margin: 0 }}>Pour combien de personnes, par plat ?</span>
          <Stepper small value={batch.persons} min={1} max={99} onChange={v => updateBatch(b => ({ ...b, persons: v }))} />
        </div>
      </div>

      <ul className="slots">
        {batch.slots.map((s, i) => {
          const r = byId(s.rid);
          return (
            <li key={i} className={"slot" + (r ? "" : " empty")}>
              <span className="slot-num" aria-hidden="true">{i + 1}</span>
              {r ? (
                <>
                  <button className="card-main" type="button" aria-label={"Voir la recette du plat " + (i + 1) + " : " + r.name} onClick={() => setViewing(i)}>
                    {r.thumb ? <img className="card-img" src={r.thumb} alt="" loading="lazy" /> : <span className="card-img ph"><PlateIcon /></span>}
                    <span className="card-body">
                      <span className="name">{r.name}</span>
                      {r.time ? <span className="meta">{fmtTime(r.time)}</span> : null}
                    </span>
                  </button>
                  <button className="icon-btn cart" type="button" aria-label={"Retirer le plat " + (i + 1)}
                    onClick={() => updateBatch(b => clearSlot(b, i))}>×</button>
                  <div className="slot-foot">
                    <button className="btn small" type="button" disabled={!hasFreeSlot(batch)}
                      aria-label={"Ajouter une portion de " + r.name + " (prend une case libre)"}
                      title={hasFreeSlot(batch) ? "Prend une case libre de plus" : "Plus de case libre"}
                      onClick={() => updateBatch(b => addPortion(b, i))}>+ 1 portion</button>
                  </div>
                </>
              ) : (
                <button className="slot-empty" type="button" aria-label={"Choisir le plat " + (i + 1)} onClick={() => setPicking(i)}>
                  <span className="plus" aria-hidden="true">+</span>
                  <span>Choisir un plat</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="actions">
        <button className="btn small" type="button" disabled={empties === 0 || !loaded} aria-describedby="randomHint"
          onClick={() => updateBatch(b => fillRandom(b, recipes.filter(r => r.category !== "Autre" && !r.readyMade).map(r => r.id)))}>
          Remplir au hasard
        </button>
        {confirmClear ? (
          <>
            <button className="btn small danger" type="button"
              onClick={() => { updateBatch(b => ({ ...b, slots: b.slots.map(() => ({ rid: "" })), checked: [] })); setConfirmClear(false); }}>Confirmer : vider le plan</button>
            <button className="btn small" type="button" onClick={() => setConfirmClear(false)}>Annuler</button>
          </>
        ) : (
          <button className="btn small danger" type="button" disabled={filled.length === 0} onClick={() => setConfirmClear(true)}>Vider le plan</button>
        )}
      </div>
      <p className="hint" id="randomHint">Au hasard : chaque recette occupe 2 ou 3 cases.</p>

      {filled.length === 0 ? (
        <div className="state">
          <strong>Aucun plat choisi</strong>
          Touche une case pour choisir un plat. La liste de courses et les recettes apparaissent dès le premier.
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="row-between">
              <h3>Liste de courses</h3>
              <span className="sub" style={{ margin: 0 }}>{doneCount} / {shop.length} cochés</span>
            </div>
            {shop.length === 0 ? <p className="empty-line">Rien à acheter pour ces recettes.</p> : null}
            <ShopList lines={shop} isOn={isOn}
              onToggle={key => updateBatch(b => ({ ...b, checked: b.checked.includes(key) ? b.checked.filter(k => k !== key) : [...b.checked, key] }))} />
            <div className="actions">
              <button className="btn small" type="button" disabled={doneCount === 0}
                onClick={() => updateBatch(b => ({ ...b, checked: [] }))}>Tout décocher</button>
            </div>
          </div>

          <div className="panel">
            <h3>Recettes à cuisiner ({cooking.length})</h3>
            <ul className="batch-recipes">
              {cooking.map((s, i) => {
                const r = byId(s.rid)!;
                const steps = lines(r.steps);
                return (
                  <li key={i}>
                    <details>
                      <summary>
                        <span className="name">{r.name}</span>
                        <span className="sub" style={{ margin: 0 }}>{s.cases * batch.persons} pers.{s.cases > 1 ? " · " + s.cases + " plats" : ""}{r.time ? " · " + fmtTime(r.time) : ""}</span>
                      </summary>
                      {steps.length ? (
                        <ol className="steps">
                          {steps.map((t, k) => <li key={k}><span className="n">Étape {k + 1}</span><span>{t}</span></li>)}
                        </ol>
                      ) : <p className="empty-line">Pas d'étapes.</p>}
                      <button className="btn small" type="button" onClick={() => go("r-" + r.id)}>Voir la fiche</button>
                    </details>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {viewing !== null && byId(batch.slots[viewing]?.rid) ? (
        <RecipeDrawer r={byId(batch.slots[viewing].rid)!} persons={batch.persons}
          cases={batch.slots.filter(s => s.rid === batch.slots[viewing].rid).length}
          onClose={() => setViewing(null)}
          onChange={() => { const i = viewing; setViewing(null); setPicking(i); }}
          onOpen={() => go("r-" + batch.slots[viewing].rid)} />
      ) : null}

      {picking !== null ? (
        <RecipePicker recipes={recipes} taken={filledSlots(batch).map(s => s.rid)}
          onClose={() => setPicking(null)}
          onPick={r => {
            const i = picking;
            setPicking(null);
            updateBatch(b => setSlot(b, i, r.id));
          }} />
      ) : null}
    </section>
  );
}
