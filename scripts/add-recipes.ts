// Ajoute des recettes dans Firestore avec une clé de compte de service (Firebase Admin).
// Utilisé par Claude, voir « Ajouter des recettes » dans CLAUDE.md.
//
//   node scripts/add-recipes.ts recettes-a-ajouter.json            vérifie et affiche, n'écrit rien
//   node scripts/add-recipes.ts recettes-a-ajouter.json --write    écrit dans la base
//   ... --update                                                   modifie des recettes déjà en base (même identifiant),
//                                                                  en gardant favori et date de création
//
// La clé est cherchée dans cet ordre : CARNET_KEY=chemin, puis un fichier service-account*.json ou
// *-firebase-adminsdk-*.json à la racine du dépôt (ignoré par git), puis ~/.config/carnet-recettes/service-account.json.
// Elle ne doit JAMAIS être commitée.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { CATS, COMPS, ENVIES, UNITS } from "../src/constants.ts";

const PROJECT_ID = "carnet-recettes-bbbf7";
const ROOT = join(import.meta.dirname, "..");
function findKey(): string {
  if (process.env.CARNET_KEY) return process.env.CARNET_KEY;
  const local = readdirSync(ROOT).find(f => /^service-account.*\.json$/.test(f) || /-firebase-adminsdk-.*\.json$/.test(f));
  return local ? join(ROOT, local) : join(homedir(), ".config", "carnet-recettes", "service-account.json");
}
const KEY_PATH = findKey();

const [file, ...flags] = process.argv.slice(2);
const write = flags.includes("--write");
const update = flags.includes("--update");
if (!file) { console.error("Usage : node scripts/add-recipes.ts <fichier.json> [--write]"); process.exit(1); }

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slug = (s: string) => norm(s).replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const unitCodes = UNITS.map(u => u[0]).filter(Boolean);

type Draft = Record<string, unknown>;
const errors: string[] = [];
const warnings: string[] = [];

function check(d: Draft, i: number) {
  const where = "recette " + (i + 1) + (typeof d.name === "string" ? " (" + d.name + ")" : "");
  const err = (m: string) => errors.push(where + " : " + m);
  if (typeof d.name !== "string" || !d.name.trim()) err("nom manquant");
  if (!CATS.includes(d.category as string)) err("catégorie « " + d.category + " » inconnue, attendu : " + CATS.join(", "));
  if (!Number.isInteger(d.time) || (d.time as number) < 0) err("time doit être un nombre entier de minutes (0 = inconnu)");
  if (!Number.isInteger(d.portions) || (d.portions as number) < 1 || (d.portions as number) > 99) err("portions doit être un entier entre 1 et 99");
  const ready = d.readyMade === true;
  if (d.readyMade !== undefined && typeof d.readyMade !== "boolean") err("readyMade doit être true ou false");
  if (!Array.isArray(d.ing) && !(ready && d.ing === undefined)) err("ing doit être une liste");
  else if (!ready && (d.ing as unknown[]).length === 0) err("ing doit être une liste non vide (sauf plat déjà préparé : readyMade: true)");
  else (d.ing as Draft[] ?? []).forEach((g: Draft, k: number) => {
    if (typeof g.n !== "string" || !g.n.trim()) err("ingrédient " + (k + 1) + " sans nom");
    if (typeof g.q !== "number" || !(g.q >= 0)) err("ingrédient « " + g.n + " » : q doit être un nombre positif ou nul");
    if (g.u !== "" && !unitCodes.includes(g.u as string)) err("ingrédient « " + g.n + " » : unité « " + g.u + " » inconnue, attendu : " + unitCodes.join(", ") + " ou \"\"");
  });
  if (!(typeof d.steps === "string" || (Array.isArray(d.steps) && d.steps.every(s => typeof s === "string")) || (ready && d.steps === undefined))) err("steps doit être un texte ou une liste de textes");
  (d.envies as string[] | undefined ?? []).forEach(e => { if (!ENVIES.includes(e)) err("ambiance « " + e + " » inconnue, attendu : " + ENVIES.join(", ")); });
  (d.composants as string[] | undefined ?? []).forEach(c => { if (!COMPS.includes(c)) err("composant « " + c + " » inconnu, attendu : " + COMPS.join(", ")); });
  if (ready && !d.time) warnings.push(where + " : pas de temps de cuisson (il sert au filtre « rapide » du Meal finder)");
  if (!d.envies || !(d.envies as unknown[]).length) warnings.push(where + " : aucune ambiance (le Meal finder s'en sert)");
  if (!d.composants || !(d.composants as unknown[]).length) warnings.push(where + " : aucun composant (le Meal finder s'en sert)");
}

const drafts: Draft[] = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(drafts) || !drafts.length) { console.error("Le fichier doit contenir une liste de recettes."); process.exit(1); }
drafts.forEach(check);

const ids = drafts.map(d => slug(String(d.name || "")));
ids.forEach((id, i) => { if (!id) errors.push("recette " + (i + 1) + " : nom inutilisable pour l'identifiant"); });
ids.forEach((id, i) => { if (ids.indexOf(id) !== i) errors.push("recette " + (i + 1) + " : identifiant « " + id + " » en double dans le fichier"); });

// Clé de compte de service : facultative pour vérifier, obligatoire pour écrire.
let db: ReturnType<typeof getFirestore> | null = null;
if (existsSync(KEY_PATH)) {
  const key = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  if (key.project_id !== PROJECT_ID) { console.error("La clé est pour le projet « " + key.project_id + " », pas « " + PROJECT_ID + " ». J'arrête."); process.exit(1); }
  initializeApp({ credential: cert(key) });
  db = getFirestore();
} else if (write) {
  console.error("Clé introuvable : " + KEY_PATH); process.exit(1);
}

if (db) {
  const existing = await db.collection("recettes").get();
  const names = new Map(existing.docs.map(d => [norm(String(d.data().name || "")), d.id]));
  drafts.forEach((d, i) => {
    const exists = existing.docs.some(x => x.id === ids[i]);
    if (update) { if (!exists) errors.push("recette " + (i + 1) + " : --update, mais l'identifiant « " + ids[i] + " » n'existe pas dans la base"); }
    else if (exists) errors.push("recette " + (i + 1) + " : l'identifiant « " + ids[i] + " » existe déjà dans la base (utilise --update pour la modifier)");
    else if (names.has(norm(String(d.name)))) warnings.push("recette " + (i + 1) + " : une recette au même nom existe déjà (« " + names.get(norm(String(d.name))) + " »)");
  });
} else {
  if (update) { console.error("--update demande la clé : " + KEY_PATH); process.exit(1); }
  warnings.push("pas de clé : je n'ai pas pu vérifier les doublons dans la base");
}

drafts.forEach((d, i) => {
  const ing = (d.ing as { n: string; q: number; u: string }[]) || [];
  console.log("\n— " + (update ? "[MODIFIE] " : "") + ids[i] + " : " + d.name + " [" + d.category + (d.readyMade ? ", PRÊT À MANGER, cuisson " : ", ") + (d.time || "?") + " min, pour " + d.portions + " pers.]");
  ing.forEach(g => console.log("    " + g.q + " " + g.u + " " + g.n));
  console.log("    ambiance : " + ((d.envies as string[]) || []).join(", ") + " | composants : " + ((d.composants as string[]) || []).join(", "));
});
if (warnings.length) console.log("\nAvertissements :\n  - " + warnings.join("\n  - "));
if (errors.length) { console.error("\nErreurs :\n  - " + errors.join("\n  - ")); process.exit(1); }

if (!write) { console.log("\nVérification OK. Rien n'a été écrit (ajoute --write pour écrire)."); process.exit(0); }

let ok = 0;
for (const [i, d] of drafts.entries()) {
  const steps = Array.isArray(d.steps) ? (d.steps as string[]).map(s => s.trim()).filter(Boolean).join("\n") : String(d.steps ?? "").trim();
  const data = {
    name: String(d.name).trim(), category: d.category, time: d.time, portions: d.portions,
    readyMade: d.readyMade === true,
    ing: ((d.ing ?? []) as { n: string; q: number; u: string }[]).map(g => ({ n: g.n.trim(), q: g.q, u: g.u })),
    steps, notes: typeof d.notes === "string" ? d.notes.trim() : "",
    envies: d.envies ?? [], composants: d.composants ?? []
  };
  try {
    if (update) await db!.collection("recettes").doc(ids[i]).update(data);
    else await db!.collection("recettes").doc(ids[i]).create({ ...data, fav: false, createdAt: Date.now() + i });
    ok++; console.log((update ? "modifiée : " : "écrite : ") + ids[i]);
  }
  catch (e) { console.error("ÉCHEC " + ids[i] + " : " + (e as Error).message); }
}
console.log("\n" + ok + " / " + drafts.length + " recette(s) " + (update ? "modifiée(s)" : "écrite(s)") + ".");
process.exit(ok === drafts.length ? 0 : 1);
