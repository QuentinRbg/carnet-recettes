import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useApp } from "../AppContext";
import { CATS, COMPS, ENVIES, SAISONS, UNITS } from "../constants";
import { usePhoto } from "../hooks/usePhoto";
import { ingCatalog, ingOf, norm, portionsOf } from "../lib/format";
import { processPhoto } from "../lib/image";
import type { Photo } from "../lib/image";
import type { CatalogEntry } from "../lib/format";
import type { Recipe, RecipeInput } from "../types";

type Row = { id: number; n: string; q: string; u: string };
let rowSeq = 0;
const newRow = (n = "", q = "", u = ""): Row => ({ id: ++rowSeq, n, q, u });

/** Grand champ qui s'agrandit avec le texte. */
function AutoTextarea(props: { id: string; value: string; onChange: (v: string) => void; placeholder: string; minHeight: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = ref.current; if (!t) return;
    const y = window.scrollY;
    t.style.height = "auto";
    t.style.height = (t.scrollHeight + 2) + "px";
    window.scrollTo(0, y);
  }, [props.value]);
  return (
    <textarea ref={ref} id={props.id} placeholder={props.placeholder} value={props.value}
      style={{ minHeight: props.minHeight }} onChange={e => props.onChange(e.target.value)} />
  );
}

function ChipGroup({ options, sel, onToggle }: { options: string[]; sel: string[]; onToggle: (o: string) => void }) {
  return (
    <div className="choices">
      {options.map(o => (
        <button key={o} className="choice" type="button" aria-pressed={sel.includes(o)} onClick={() => onToggle(o)}>{o}</button>
      ))}
    </div>
  );
}

type PickerProps = {
  value: string;
  label: string;
  catalog: CatalogEntry[];
  onText: (v: string) => void;
  onPick: (unit: string) => void;
};

type Suggestion = { add?: boolean; name: string; unit: string };

/** Champ « ingrédient » avec suggestions tirées des ingrédients déjà utilisés dans le carnet. */
function IngredientPicker({ value, label, catalog, onText, onPick }: PickerProps) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  function suggest(v: string) {
    const t = v.trim();
    if (!t) { setOpen(false); return; }
    const qk = norm(t);
    const found = catalog.filter(c => c.k.includes(qk));
    found.sort((a, b) => (a.k.startsWith(qk) ? 0 : 1) - (b.k.startsWith(qk) ? 0 : 1) || a.name.localeCompare(b.name, "fr"));
    const list: Suggestion[] = found.slice(0, 6);
    if (!catalog.some(c => c.k === qk)) list.push({ add: true, name: t, unit: "" });
    setItems(list); setActive(-1); setOpen(true);
  }
  function choose(it: Suggestion) {
    onText(it.name); setOpen(false); setActive(-1);
    onPick(it.add ? "" : it.unit);
  }

  return (
    <div className="ac">
      <input type="text" value={value} placeholder="Ingrédient" aria-label={label} maxLength={80} autoComplete="off"
        role="combobox" aria-autocomplete="list" aria-expanded={open}
        onChange={e => { onText(e.target.value); suggest(e.target.value); }}
        onFocus={() => { if (value.trim()) suggest(value); }}
        onKeyDown={e => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((active + 1) % items.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((active - 1 + items.length) % items.length); }
          else if (e.key === "Enter") { e.preventDefault(); choose(items[active >= 0 ? active : 0]); }
          else if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
        }}
        onBlur={() => {
          setOpen(false);
          const hit = catalog.find(c => c.k === norm(value.trim()));
          if (hit) onText(hit.name);
        }} />
      <ul className="ac-list" role="listbox" hidden={!open}>
        {items.map((it, i) => (
          <li key={it.name + i} role="option" className={it.add ? "ac-add" : ""} aria-selected={i === active}
            onMouseDown={e => { e.preventDefault(); choose(it); }}>
            {it.add ? "+ Ajouter « " + it.name + " »" : it.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Changement de photo : une nouvelle photo, "remove" pour l'enlever, ou rien. */
export type PhotoChange = Photo | "remove" | undefined;

type Props = { r: Recipe; onSave: (patch: Partial<RecipeInput>, photo: PhotoChange) => void; onCancel: () => void };

export function EditForm({ r, onSave, onCancel }: Props) {
  const { recipes } = useApp();
  // L'état du formulaire est copié une fois : les mises à jour en direct n'écrasent pas la saisie.
  const [name, setName] = useState(r.name || "");
  const [cat, setCat] = useState(r.category);
  const [time, setTime] = useState(r.time ? String(r.time) : "");
  const [portions, setPortions] = useState(String(portionsOf(r)));
  const [ready, setReady] = useState(!!r.readyMade);
  const [steps, setSteps] = useState(r.steps || "");
  const [notes, setNotes] = useState(r.notes || "");
  const [envies, setEnvies] = useState<string[]>(r.envies || []);
  const [comps, setComps] = useState<string[]>(r.composants || []);
  const [saisons, setSaisons] = useState<string[]>(r.saisons || []);
  const [rows, setRows] = useState<Row[]>(() => {
    const init = ingOf(r).map(g => newRow(g.n || "", g.q ? String(g.q).replace(".", ",") : "", g.u || ""));
    return init.length ? init : [newRow()];
  });
  const [catalog] = useState(() => ingCatalog(recipes));
  const [newPhoto, setNewPhoto] = useState<Photo | null>(null);
  const [removed, setRemoved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const current = usePhoto(r.id, r.thumb);
  const preview = newPhoto ? newPhoto.full : removed ? undefined : current;

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoErr(""); setPhotoBusy(true);
    try { setNewPhoto(await processPhoto(file)); setRemoved(false); }
    catch (e) { setPhotoErr(e instanceof Error ? e.message : "Photo illisible."); }
    finally { setPhotoBusy(false); }
  }
  const nameRef = useRef<HTMLInputElement>(null);
  const qRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const lastAdded = useRef<number | null>(null);
  const rowsBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastAdded.current === null) return;
    lastAdded.current = null;
    rowsBox.current?.querySelector<HTMLInputElement>(".ing-row:last-child .ac input")?.focus();
  }, [rows.length]);

  const patchRow = (id: number, p: Partial<Row>) => setRows(rs => rs.map(x => x.id === id ? { ...x, ...p } : x));
  const toggle = (set: (f: (l: string[]) => string[]) => void) => (o: string) =>
    set(l => l.includes(o) ? l.filter(x => x !== o) : [...l, o]);

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const n = name.trim();
    if (!n) { nameRef.current?.focus(); return; }
    const ing = rows.filter(x => x.n.trim()).map(x => ({ n: x.n.trim(), q: Number(x.q.replace(",", ".")) || 0, u: x.u }));
    const p = Math.min(99, Math.max(1, Math.round(Number(portions)) || 1));
    onSave({ name: n, category: cat, time: Number(time) || 0, portions: p, readyMade: ready, ing, envies, composants: comps, saisons: SAISONS.filter(s => saisons.includes(s)), steps: steps.trim(), notes: notes.trim() },
      newPhoto ?? (removed ? "remove" : undefined));
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>Modifier la recette</h2>
      <label htmlFor="e-name">Nom
        <input ref={nameRef} type="text" id="e-name" maxLength={120} value={name} onChange={e => setName(e.target.value)} />
      </label>
      <label className="check" htmlFor="e-ready">
        <input type="checkbox" id="e-ready" checked={ready} onChange={e => setReady(e.target.checked)} />
        <span>Plat déjà préparé, sans recette (pizza surgelée…)</span>
      </label>
      <div className="form">
        <span className="label-up">Photo</span>
        {preview ? <img className="hero" src={preview} alt="" /> : null}
        <div className="actions">
          <button className="btn small" type="button" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
            {photoBusy ? "Traitement…" : preview ? "Changer la photo" : "Ajouter une photo"}
          </button>
          {preview ? <button className="btn small danger" type="button" disabled={photoBusy} onClick={() => { setNewPhoto(null); setRemoved(true); }}>Retirer la photo</button> : null}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; pickPhoto(f); }} />
        </div>
        {photoErr ? <p className="hint">{photoErr}</p> : null}
      </div>
      <div className="two">
        <label htmlFor="e-cat">Catégorie
          <select id="e-cat" value={cat} onChange={e => setCat(e.target.value)}>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label htmlFor="e-time">{ready ? "Temps de cuisson (minutes)" : "Temps total (minutes)"}
          <input type="number" id="e-time" min={0} inputMode="numeric" value={time} onChange={e => setTime(e.target.value)} />
        </label>
      </div>

      <label htmlFor="e-portions">Quantité recommandée : pour combien de personnes ?
        <input type="number" id="e-portions" min={1} max={99} inputMode="numeric" value={portions} onChange={e => setPortions(e.target.value)} />
      </label>

      <div className="form">
        <span className="label-up">{ready ? "À acheter" : "Ingrédients"}, pour {Math.max(1, Math.round(Number(portions)) || 1)} {Number(portions) > 1 ? "personnes" : "personne"}</span>
        <div className="ing-rows" ref={rowsBox}>
          {rows.map((row, i) => (
            <div className="ing-row" key={row.id}>
              <IngredientPicker value={row.n} label={"Ingrédient " + (i + 1)} catalog={catalog}
                onText={v => patchRow(row.id, { n: v })}
                onPick={unit => { if (unit && !row.u) patchRow(row.id, { u: unit }); qRefs.current[row.id]?.focus(); }} />
              <input ref={el => { qRefs.current[row.id] = el; }} type="text" inputMode="decimal" placeholder="Qté"
                aria-label={"Quantité " + (i + 1)} value={row.q} onChange={e => patchRow(row.id, { q: e.target.value })} />
              <select aria-label={"Unité " + (i + 1)} value={row.u} onChange={e => patchRow(row.id, { u: e.target.value })}>
                {UNITS.map(x => <option key={x[0]} value={x[0]}>{x[1]}</option>)}
              </select>
              <button className="icon-btn" type="button" aria-label={"Retirer l'ingrédient " + (i + 1)}
                onClick={() => setRows(rs => rs.length > 1 ? rs.filter(x => x.id !== row.id) : [newRow()])}>×</button>
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="btn small" type="button" onClick={() => { lastAdded.current = 1; setRows(rs => [...rs, newRow()]); }}>+ Ajouter un ingrédient</button>
        </div>
      </div>

      <label htmlFor="e-steps">{ready ? "Cuisson (facultatif)" : "Préparation"}
        <AutoTextarea id="e-steps" placeholder="Une étape par ligne" value={steps} onChange={setSteps} minHeight={320} />
      </label>
      <label htmlFor="e-notes">Notes
        <AutoTextarea id="e-notes" placeholder="Astuces, variantes, valeurs nutritionnelles…" value={notes} onChange={setNotes} minHeight={160} />
      </label>

      <div className="form">
        <span className="label-up">Ambiance (pour le Meal finder)</span>
        <ChipGroup options={ENVIES} sel={envies} onToggle={toggle(setEnvies)} />
      </div>
      <div className="form">
        <span className="label-up">Composants principaux (pour le Meal finder)</span>
        <ChipGroup options={COMPS} sel={comps} onToggle={toggle(setComps)} />
      </div>
      <div className="form">
        <span className="label-up">Saisons (pour « De saison » et le Meal finder)</span>
        <ChipGroup options={SAISONS} sel={saisons} onToggle={toggle(setSaisons)} />
        <p className="units-help">Coche les quatre pour un plat de toute l'année.</p>
      </div>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={photoBusy}>Enregistrer</button>
        <button className="btn" type="button" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}
