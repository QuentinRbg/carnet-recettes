import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { signOut } from "firebase/auth";
import { AppContext } from "./AppContext";
import type { AppCtx } from "./AppContext";
import { CartDrawer } from "./components/CartDrawer";
import { ConfirmBox } from "./components/Dialog";
import { useToast } from "./components/Toast";
import { auth } from "./firebase";
import { useAuth } from "./hooks/useAuth";
import { useData } from "./hooks/useData";
import { finderBusy, newFinder } from "./lib/finder";
import type { Finder } from "./lib/finder";
import { currentHash, getRoute } from "./lib/route";
import type { Cart, Recipe } from "./types";
import { Courses } from "./views/Courses";
import { Login } from "./views/Login";
import { MealFinder } from "./views/MealFinder";
import { RecipeList } from "./views/RecipeList";
import type { ListUi } from "./views/RecipeList";
import { RecipeView } from "./views/RecipeView";

export default function App() {
  const user = useAuth();
  if (user === undefined) return null;
  // Main est démonté à la déconnexion : tout l'état est réinitialisé.
  return user ? <Main /> : <Login />;
}

type ImportPlan = { list: Recipe[]; panier?: Cart; photos?: Record<string, string> };

function Main() {
  const { toast, node: toastNode } = useToast();
  const data = useData(toast);
  const [route, setRoute] = useState(getRoute);
  const [listUi, setListUi] = useState<ListUi>({ filterCat: "Toutes", query: "" });
  const [finder, setFinder] = useState<Finder | null>(null);
  const finderRef = useRef<Finder | null>(null);
  const lastView = useRef(route.v);
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const [cartFor, setCartFor] = useState<Recipe | null>(null);
  const [delFor, setDelFor] = useState<Recipe | null>(null);
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setFinderBoth = useCallback((f: Finder | null) => { finderRef.current = f; setFinder(f); }, []);
  const updateFinder = useCallback((fn: (f: Finder) => void) => {
    // Copie complète : l'état précédent n'est jamais modifié sur place.
    const c: Finder = structuredClone(finderRef.current ?? newFinder());
    fn(c);
    setFinderBoth(c);
  }, [setFinderBoth]);

  // Routage par hash. Quitter le Meal finder en cours de route demande confirmation.
  useEffect(() => {
    const onHash = () => {
      const rt = getRoute();
      if (lastView.current === "finder" && rt.v !== "finder") {
        if (finderBusy(finderRef.current)) {
          const target = currentHash();
          location.hash = "finder";
          setLeaveTarget(target);
          return;
        }
        setFinderBoth(null);
      }
      lastView.current = rt.v;
      setRoute(rt);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [setFinderBoth]);

  const go = useCallback((hs: string) => {
    const leaving = getRoute().v === "finder" && hs !== "finder";
    if (leaving && finderBusy(finderRef.current)) { setLeaveTarget(hs); return; }
    if (leaving) setFinderBoth(null);
    if (currentHash() !== hs) location.hash = hs;
  }, [setFinderBoth]);

  const ctx: AppCtx = useMemo(() => ({
    ...data, go, toast, openCart: setCartFor, askDelete: setDelFor
  }), [data, go, toast]);

  function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed: { recettes?: Recipe[]; panier?: Cart; photos?: Record<string, unknown> };
      try { parsed = JSON.parse(String(reader.result)); } catch { toast("Fichier illisible."); return; }
      const list = Array.isArray(parsed.recettes)
        ? parsed.recettes.filter(r => r && typeof r.id === "string" && r.id && !r.id.includes("/")) : [];
      if (!list.length) { toast("Aucune recette dans ce fichier."); return; }
      const p = parsed.panier;
      const panier = p && Array.isArray(p.items) ? { items: p.items, checked: Array.isArray(p.checked) ? p.checked : [] } : undefined;
      const photos: Record<string, string> = {};
      Object.entries(parsed.photos ?? {}).forEach(([k, v]) => { if (typeof v === "string" && v.startsWith("data:image/")) photos[k] = v; });
      setImportPlan({ list, panier, photos });
    };
    reader.readAsText(f);
  }

  async function exportAll() {
    let photos: Record<string, string> = {};
    try { photos = await data.fetchPhotos(); } catch { toast("Les photos n'ont pas pu être exportées."); }
    const out = { app: "carnet-recettes", version: 2, exportedAt: new Date().toISOString(), recettes: data.recipes, panier: data.cart, photos };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "recettes-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const tab = (current: boolean) => ({ "aria-current": current ? "page" as const : "false" as const });

  return (
    <AppContext.Provider value={ctx}>
      <main className={route.v === "list" ? "wide" : undefined}>
        {data.notice ? <header><p className="sub">{data.notice}</p></header> : null}

        <nav className="tabs" aria-label="Sections">
          <button className="tab" type="button" {...tab(route.v === "list" || route.v === "recipe")} onClick={() => go("")}><span>Recettes</span></button>
          <button className="tab" type="button" {...tab(route.v === "finder")} onClick={() => go("finder")}><span>Meal finder</span></button>
          <button className="tab" type="button" {...tab(route.v === "courses")} onClick={() => go("courses")}>
            <span>Courses</span>
            <span className="badge">{data.cart.items.length ? data.cart.items.length : ""}</span>
          </button>
        </nav>

        {route.v === "list" ? <RecipeList ui={listUi} setUi={setListUi} /> : null}
        {route.v === "recipe" ? <RecipeView key={route.id} id={route.id} /> : null}
        {route.v === "finder" ? <MealFinder finder={finder} update={updateFinder} reset={setFinderBoth} /> : null}
        {route.v === "courses" ? <Courses /> : null}

        <footer className="foot">
          <button className="linkbtn" type="button" onClick={exportAll}>Exporter mes recettes</button>
          <button className="linkbtn" type="button" onClick={() => fileRef.current?.click()}>Importer</button>
          <button className="linkbtn" type="button" onClick={() => signOut(auth)}>Se déconnecter</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
        </footer>
      </main>

      {cartFor ? <CartDrawer r={cartFor} onClose={() => setCartFor(null)} onAdd={n => { data.addToCart(cartFor, n); setCartFor(null); }} /> : null}
      {delFor ? (
        <ConfirmBox title="Supprimer cette recette ?" text={"« " + delFor.name + " » sera supprimée définitivement."}
          okLabel="Supprimer" danger onCancel={() => setDelFor(null)}
          onOk={() => { const id = delFor.id; setDelFor(null); data.removeRecipe(id); go(""); }} />
      ) : null}
      {leaveTarget !== null ? (
        <ConfirmBox title="Quitter le Meal finder ?" text="Ton questionnaire sera réinitialisé." okLabel="Quitter" cancelLabel="Rester"
          onCancel={() => setLeaveTarget(null)}
          onOk={() => { const t = leaveTarget; setLeaveTarget(null); setFinderBoth(null); location.hash = t; }} />
      ) : null}
      {importPlan ? (
        <ConfirmBox title={"Importer " + importPlan.list.length + (importPlan.list.length > 1 ? " recettes ?" : " recette ?")}
          text="Les recettes qui ont le même identifiant seront remplacées." okLabel="Importer"
          onCancel={() => setImportPlan(null)}
          onOk={() => {
            const plan = importPlan; setImportPlan(null);
            data.importAll(plan.list, plan.panier, plan.photos)
              .then(() => toast(plan.list.length + (plan.list.length > 1 ? " recettes importées" : " recette importée")))
              .catch(() => toast("Import impossible, réessaie."));
          }} />
      ) : null}
      {toastNode}
    </AppContext.Provider>
  );
}
