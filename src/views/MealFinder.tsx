import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useApp } from "../AppContext";
import { CartIcon, ReloadIcon } from "../components/Icons";
import { ALERTS, ENVIE_HINT } from "../constants";
import { fmtTime, norm } from "../lib/format";
import {
  QUIZ, haveOptions, newFinder, nextIdea, propose, withAvailable
} from "../lib/finder";
import type { Finder } from "../lib/finder";

type Update = (fn: (f: Finder) => void) => void;

/** La carte de question descend toujours jusqu'en bas de l'écran, quelle que soit la question. */
function FillPanel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const p = ref.current; if (!p) return;
    const top = p.getBoundingClientRect().top + (window.scrollY || 0);
    p.style.setProperty("--fill", Math.max(420, window.innerHeight - top - 28) + "px");
  });
  return <div className="panel fill" ref={ref}>{children}</div>;
}

function Choice(p: { label: string; pressed: boolean; onClick: () => void; sub?: string; ghost?: boolean }) {
  return (
    <button className={"choice" + (p.ghost ? " ghost" : "")} type="button" aria-pressed={p.pressed} onClick={p.onClick}>
      {p.label}{p.sub ? <small>{p.sub}</small> : null}
    </button>
  );
}

const toggle = (arr: string[], v: string) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };

type Props = { finder: Finder | null; update: Update; reset: (f: Finder | null) => void };

export function MealFinder({ finder: stored, update, reset }: Props) {
  const { recipes, loaded, go } = useApp();
  const finder = stored ?? newFinder();

  if (!loaded) return <section className="view"><div className="state"><strong>Chargement…</strong></div></section>;
  if (!recipes.length) {
    return (
      <section className="view">
        <div className="state"><strong>Ton carnet est vide</strong>Ajoute quelques recettes pour que je puisse t'en proposer.
          <button className="btn primary" type="button" onClick={() => go("")}>Voir les recettes</button>
        </div>
      </section>
    );
  }

  let body: ReactNode;
  if (finder.phase === "quiz") body = <Quiz finder={finder} update={update} />;
  else if (finder.phase === "ask") body = <Ask finder={finder} update={update} />;
  else if (finder.phase === "alert") body = <AlertScreen finder={finder} update={update} />;
  else if (finder.phase === "ideas") body = <Ideas finder={finder} update={update} />;
  else if (finder.phase === "none") body = <None finder={finder} reset={reset} />;
  else body = <Result finder={finder} update={update} reset={reset} />;

  return <section className="view"><h1>Meal finder</h1>{body}</section>;
}

function Quiz({ finder, update }: { finder: Finder; update: Update }) {
  const { recipes } = useApp();
  const q = withAvailable(QUIZ[finder.step], recipes), a = finder.a;
  const last = finder.step === QUIZ.length - 1;

  function next() {
    update(f => {
      if (f.step < QUIZ.length - 1) f.step++;
      else if (f.a.mood) f.phase = "alert";
      else { f.mode = ""; f.shown = []; f.rej = []; propose(f, recipes); }
    });
  }
  // Avec « De préférence » et aucun ingrédient coché, on ne peut pas continuer.
  function blocked(): boolean {
    if (q.type === "single") return !a.done[q.key];
    if (q.type === "multi") return (a[q.key as "envies" | "avoid" | "want"]).length === 0 && !a.any[q.key];
    return a.haveMode === "pref" && a.have.length === 0;
  }

  return (
    <FillPanel>
      <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={QUIZ.length} aria-valuenow={finder.step + 1}>
        <span style={{ width: Math.round((finder.step + 1) / QUIZ.length * 100) + "%" }} />
      </div>
      <span className="label-up">Question {finder.step + 1} sur {QUIZ.length}</span>
      <div>
        <h2 className="q-title">{q.title}</h2>
        {q.sub ? <p className="q-sub">{q.sub}</p> : null}
      </div>

      {q.type === "single" ? (
        <div className="choices">
          {q.opts.map(o => (
            <Choice key={String(o[0])} label={o[1]} pressed={!!a.done[q.key] && (a as unknown as Record<string, unknown>)[q.key] === o[0]}
              onClick={() => update(f => { (f.a as unknown as Record<string, unknown>)[q.key] = o[0]; f.a.done[q.key] = true; })} />
          ))}
        </div>
      ) : q.type === "multi" ? (
        <div className="choices cols2">
          <Choice label={q.any} pressed={!!a.any[q.key]}
            onClick={() => update(f => { f.a[q.key as "envies" | "avoid" | "want"] = []; f.a.any[q.key] = true; })} />
          {q.opts.map(o => (
            <Choice key={o} label={o} pressed={a[q.key as "envies" | "avoid" | "want"].includes(o)} sub={ENVIE_HINT[o]}
              onClick={() => update(f => { toggle(f.a[q.key as "envies" | "avoid" | "want"], o); delete f.a.any[q.key]; })} />
          ))}
        </div>
      ) : (
        <HavePicker finder={finder} update={update} />
      )}

      <div className="actions">
        <button className="btn" type="button" disabled={finder.step === 0} onClick={() => update(f => { f.step--; })}>Retour</button>
        <button className="btn primary" type="button" disabled={blocked()} onClick={next}>
          {last && !a.mood ? "Trouver ma recette" : "Suivant"}
        </button>
      </div>
    </FillPanel>
  );
}

function HavePicker({ finder, update }: { finder: Finder; update: Update }) {
  const { recipes } = useApp();
  const a = finder.a;
  const [search, setSearch] = useState("");
  const opts = haveOptions(recipes);
  const qs = norm(search.trim());
  const shownOpts = opts.filter(o => !qs || o.k.includes(qs) || a.have.includes(o.k));
  return (
    <>
      <div className="seg" role="group" aria-label="Mode">
        <button type="button" aria-pressed={a.haveMode === "pref"} onClick={() => update(f => { f.a.haveMode = "pref"; })}>De préférence</button>
        <button type="button" aria-pressed={a.haveMode === "any"} onClick={() => update(f => { f.a.haveMode = "any"; })}>Je peux tout acheter</button>
      </div>
      {a.haveMode === "pref" ? (
        opts.length ? (
          <>
            <input type="search" placeholder="Chercher un ingrédient" aria-label="Chercher un ingrédient" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="choices cols2 ing-pick">
              {shownOpts.length === 0 ? <p className="empty-line">Aucun ingrédient trouvé.</p> : null}
              {shownOpts.map(o => (
                <Choice key={o.k} label={o.name} pressed={a.have.includes(o.k)} onClick={() => update(f => { toggle(f.a.have, o.k); })} />
              ))}
            </div>
          </>
        ) : <p className="empty-line">Aucun ingrédient enregistré dans tes recettes pour l'instant.</p>
      ) : <p className="q-sub">Je ne tiens pas compte de ce que tu as chez toi.</p>}
    </>
  );
}

function Result({ finder, update, reset }: { finder: Finder; update: Update; reset: Props["reset"] }) {
  const { recipes, go, openCart } = useApp();
  const c = finder.cur!, r = c.r, a = finder.a;
  return (
    <>
      <div className="panel">
        <span className="label-up">{finder.shown.length > 1 ? "Proposition " + finder.shown.length : "Ma proposition"}</span>
        <h2 className="pick-name">{r.name}</h2>
        <div className="why">
          <span className="tag">{r.category || "Autre"}</span>
          {r.time ? <span className="tag">{fmtTime(r.time)}</span> : null}
          {(r.envies || []).map(x => <span key={x} className="tag alt">{x}</span>)}
          {(r.composants || []).map(x => <span key={x} className="tag">{x}</span>)}
        </div>
        {c.why.length ? <p className="owned"><b>Pourquoi : </b>{c.why.join(", ")}</p> : null}
        {a.haveMode === "pref" && a.have.length ? (
          <>
            <p className="owned"><b>Déjà chez toi : </b>{c.owned.length ? c.owned.join(", ") : "rien pour cette recette"}</p>
            {c.buy.length ? <p className="owned"><b>À acheter : </b>{c.buy.join(", ")}</p> : null}
          </>
        ) : null}
        <div className="actions">
          <button className="btn primary" type="button" onClick={() => go("r-" + r.id)}>Voir la recette</button>
          <button className="btn" type="button" onClick={() => openCart(r)}><CartIcon />Ajouter au panier</button>
        </div>
      </div>
      {/* Action principale : une grande touche. Les actions secondaires sont des liens discrets en dessous. */}
      <button className="btn wide" type="button" onClick={() => update(f => {
        if ((r.composants || []).length) { f.askSel = []; f.askUnknown = false; f.phase = "ask"; } else propose(f, recipes);
      })}><ReloadIcon />Nouvelle proposition</button>
      <div className="linkrow">
        {a.mood ? <button className="linkbtn" type="button" onClick={() => update(f => { f.phase = "alert"; })}>Autres options</button> : null}
        <button className="linkbtn" type="button" onClick={() => reset(newFinder(finder, true))}>Modifier mes réponses</button>
        <button className="linkbtn" type="button" onClick={() => reset(newFinder())}>Recommencer</button>
      </div>
    </>
  );
}

function Ask({ finder, update }: { finder: Finder; update: Update }) {
  const { recipes } = useApp();
  const r = finder.cur!.r, comps = r.composants || [], sel = finder.askSel;
  return (
    <FillPanel>
      <div>
        <h2 className="q-title">Qu'est-ce qui ne te donne pas envie ?</h2>
        <p className="q-sub">Dans « {r.name} ».</p>
      </div>
      <div className="choices cols2">
        {comps.map(o => (
          <Choice key={o} label={o} pressed={sel.includes(o)} onClick={() => update(f => { toggle(f.askSel, o); f.askUnknown = false; })} />
        ))}
        <Choice label="Je ne sais pas" pressed={finder.askUnknown} onClick={() => update(f => { f.askSel = []; f.askUnknown = true; })} />
      </div>
      <div className="actions">
        <button className="btn" type="button" onClick={() => update(f => { f.phase = "result"; })}>Retour</button>
        <button className="btn primary" type="button" disabled={sel.length === 0 && !finder.askUnknown}
          onClick={() => update(f => {
            f.askSel.forEach(c => { if (!f.rej.includes(c)) f.rej.push(c); });
            f.askSel = [];
            propose(f, recipes);
          })}>Nouvelle proposition</button>
      </div>
    </FillPanel>
  );
}

/** Écran qui suit une réponse « oui » à l'alerte, construit à partir de ALERTS. */
function AlertScreen({ finder, update }: { finder: Finder; update: Update }) {
  const { recipes } = useApp();
  const al = ALERTS[finder.a.mood];
  return (
    <FillPanel>
      <div>
        <h2 className="q-title">{al.title}</h2>
        <p className="q-sub">{al.intro}</p>
      </div>
      <div className="choices">
        {al.actions.map(act => (
          <Choice key={act.label} label={act.label} pressed={false} onClick={() => update(f => {
            if (act.kind === "ideas") { f.idea = { act, i: -1 }; nextIdea(f); f.phase = "ideas"; }
            else { f.mode = act.mode; f.shown = []; f.rej = []; propose(f, recipes); }
          })} />
        ))}
      </div>
      <div className="actions">
        <button className="btn" type="button" onClick={() => update(f => { f.phase = "quiz"; })}>Retour</button>
      </div>
    </FillPanel>
  );
}

function Ideas({ finder, update }: { finder: Finder; update: Update }) {
  const id = finder.idea!;
  return (
    <FillPanel>
      <span className="label-up">{id.act.title}</span>
      <h2 className="pick-name">{id.act.items[id.i]}</h2>
      <div className="actions">
        <button className="btn" type="button" onClick={() => update(f => { f.phase = "alert"; })}>Retour</button>
        <button className="btn primary" type="button" onClick={() => update(f => { nextIdea(f); })}>Une autre idée</button>
      </div>
    </FillPanel>
  );
}

function None({ finder, reset }: { finder: Finder; reset: Props["reset"] }) {
  return (
    <div className="state">
      <strong>Plus rien à te proposer</strong>
      {finder.shown.length
        ? "Tu as fait le tour des recettes qui correspondent à tes réponses."
        : "Aucune recette ne correspond à ces réponses. Vérifie aussi que tes recettes ont leur ambiance, leurs composants et leur temps renseignés."}
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="btn primary" type="button" onClick={() => reset(newFinder(finder, true))}>Modifier mes réponses</button>
        <button className="btn" type="button" onClick={() => reset(newFinder())}>Recommencer</button>
      </div>
    </div>
  );
}
