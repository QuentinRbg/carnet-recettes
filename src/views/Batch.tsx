import { useState } from "react";
import { useApp } from "../AppContext";
import { PlateIcon } from "../components/Icons";
import { RecipePicker } from "../components/RecipePicker";
import { ShopList } from "../components/ShopList";
import { Stepper } from "../components/Stepper";
import { CoursesSwitch } from "./Courses";
import { MAX_SLOTS, MIN_SLOTS, batchToCart, fillRandom, filledSlots, resizeSlots } from "../lib/batch";
import { aggregate, fmtTime, lines } from "../lib/format";

/** Batch cooking : on choisit le nombre de plats, on remplit les cases, et on obtient la liste de courses et les recettes. */
export function Batch() {
  const { recipes, loaded, batch, updateBatch, go } = useApp();
  const [picking, setPicking] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const byId = (id: string) => recipes.find(r => r.id === id);
  const filled = filledSlots(batch).filter(s => byId(s.rid));
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
                  <button className="card-main" type="button" aria-label={"Changer le plat " + (i + 1) + " : " + r.name} onClick={() => setPicking(i)}>
                    {r.thumb ? <img className="card-img" src={r.thumb} alt="" loading="lazy" /> : <span className="card-img ph"><PlateIcon /></span>}
                    <span className="card-body">
                      <span className="name">{r.name}</span>
                      {r.time ? <span className="meta">{fmtTime(r.time)}</span> : null}
                    </span>
                  </button>
                  <button className="icon-btn cart" type="button" aria-label={"Retirer le plat " + (i + 1)}
                    onClick={() => updateBatch(b => ({ ...b, slots: b.slots.map((x, k) => k === i ? { rid: "", n: 1 } : x) }))}>×</button>
                  <div className="slot-foot">
                    <Stepper small value={s.n} min={1} max={99}
                      onChange={v => updateBatch(b => ({ ...b, slots: b.slots.map((x, k) => k === i ? { ...x, n: v } : x) }))} />
                    <span className="sub" style={{ margin: 0 }}>pers.</span>
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
              onClick={() => { updateBatch(b => ({ ...b, slots: b.slots.map(() => ({ rid: "", n: 1 })), checked: [] })); setConfirmClear(false); }}>Confirmer : vider le plan</button>
            <button className="btn small" type="button" onClick={() => setConfirmClear(false)}>Annuler</button>
          </>
        ) : (
          <button className="btn small danger" type="button" disabled={filled.length === 0} onClick={() => setConfirmClear(true)}>Vider le plan</button>
        )}
      </div>
      <p className="hint" id="randomHint">Au hasard : chaque plat a 2 ou 3 portions.</p>

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
            <h3>Recettes à cuisiner ({filled.length})</h3>
            <ul className="batch-recipes">
              {filled.map((s, i) => {
                const r = byId(s.rid)!;
                const steps = lines(r.steps);
                return (
                  <li key={i}>
                    <details>
                      <summary>
                        <span className="name">{r.name}</span>
                        <span className="sub" style={{ margin: 0 }}>{s.n} pers.{r.time ? " · " + fmtTime(r.time) : ""}</span>
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

      {picking !== null ? (
        <RecipePicker recipes={recipes} taken={filledSlots(batch).map(s => s.rid)}
          onClose={() => setPicking(null)}
          onPick={r => {
            const i = picking;
            setPicking(null);
            updateBatch(b => ({ ...b, slots: b.slots.map((x, k) => k === i ? { rid: r.id, n: b.persons } : x) }));
          }} />
      ) : null}
    </section>
  );
}
