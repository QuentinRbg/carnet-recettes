import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import type { Photo } from "../lib/image";
import type { Cart, Recipe, RecipeInput } from "../types";

const EMPTY_CART: Cart = { items: [], checked: [] };

export type Data = ReturnType<typeof useData>;

/**
 * Recettes et panier, synchronisés en direct avec Firestore.
 * Les données de onSnapshot ne sont jamais modifiées sur place : on les copie.
 */
export function useData(toast: (msg: string) => void) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const cartRef = useRef<Cart>(EMPTY_CART);
  const writing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setNotice("Les recettes mettent du temps à arriver…"), 10000);
    const unsubRecipes = onSnapshot(
      query(collection(db, "recettes"), orderBy("createdAt", "desc")),
      snap => {
        setRecipes(snap.docs.map(d => ({ ...(d.data() as Omit<Recipe, "id">), id: d.id })));
        if (!snap.metadata.fromCache || snap.docs.length) { setLoaded(true); clearTimeout(timer); }
        setNotice("");
      },
      () => { clearTimeout(timer); setLoaded(true); setNotice("Lecture impossible pour le moment"); }
    );
    const unsubCart = onSnapshot(doc(db, "panier", "main"), snap => {
      // Pendant qu'on écrit le panier, on ignore ce qui arrive pour ne pas l'écraser.
      if (writing.current || dirty.current) return;
      const d = snap.exists() ? snap.data() : null;
      const next: Cart = {
        items: d && Array.isArray(d.items) ? d.items.map((x: { rid: string; n: unknown }) => ({ rid: x.rid, n: Number(x.n) || 1 })) : [],
        checked: d && Array.isArray(d.checked) ? [...d.checked] : []
      };
      cartRef.current = next;
      setCart(next);
    }, () => {});
    return () => { clearTimeout(timer); unsubRecipes(); unsubCart(); };
  }, []);

  const persistCart = useCallback(() => {
    if (writing.current) { dirty.current = true; return; }
    writing.current = true; dirty.current = false;
    const { items, checked } = cartRef.current;
    setDoc(doc(db, "panier", "main"), { items, checked })
      .catch(() => toast("Le panier n'a pas pu être enregistré."))
      .then(() => {
        writing.current = false;
        if (dirty.current) persistCart();
      });
  }, [toast]);

  const updateCart = useCallback((fn: (c: Cart) => Cart) => {
    const next = fn(cartRef.current);
    cartRef.current = next;
    setCart(next);
    persistCart();
  }, [persistCart]);

  const addToCart = useCallback((r: Recipe, n: number) => {
    updateCart(c => {
      const found = c.items.some(it => it.rid === r.id);
      return {
        ...c,
        items: found
          ? c.items.map(it => it.rid === r.id ? { ...it, n: Math.min(99, it.n + n) } : it)
          : [...c.items, { rid: r.id, n }]
      };
    });
    toast("« " + r.name + " » ajoutée au panier");
  }, [updateCart, toast]);

  const saveRecipe = useCallback((id: string, patch: Partial<RecipeInput>) =>
    updateDoc(doc(db, "recettes", id), patch).catch(() => toast("Impossible d'enregistrer, réessaie.")), [toast]);

  const addRecipe = useCallback((data: RecipeInput) => addDoc(collection(db, "recettes"), data), []);

  /** Photo : la miniature est dans la recette (liste), la grande version dans photos/{id} (fiche). */
  const savePhoto = useCallback((id: string, p: Photo) =>
    setDoc(doc(db, "photos", id), { data: p.full })
      .then(() => updateDoc(doc(db, "recettes", id), { thumb: p.thumb }))
      .catch(() => toast("La photo n'a pas pu être enregistrée.")), [toast]);

  const deletePhoto = useCallback((id: string) =>
    updateDoc(doc(db, "recettes", id), { thumb: deleteField() })
      .then(() => deleteDoc(doc(db, "photos", id)))
      .catch(() => toast("La photo n'a pas pu être supprimée.")), [toast]);

  const loadPhoto = useCallback(async (id: string): Promise<string | null> => {
    const snap = await getDoc(doc(db, "photos", id));
    return snap.exists() ? (snap.data().data as string) : null;
  }, []);

  /** Toutes les grandes photos, pour la sauvegarde. */
  const fetchPhotos = useCallback(async (): Promise<Record<string, string>> => {
    const snap = await getDocs(collection(db, "photos"));
    const out: Record<string, string> = {};
    snap.docs.forEach(d => { out[d.id] = d.data().data as string; });
    return out;
  }, []);

  const removeRecipe = useCallback((id: string) => {
    deleteDoc(doc(db, "photos", id)).catch(() => {});
    deleteDoc(doc(db, "recettes", id)).then(() => {
      if (cartRef.current.items.some(it => it.rid === id)) {
        updateCart(c => ({ ...c, items: c.items.filter(it => it.rid !== id) }));
      }
    }).catch(() => toast("Suppression impossible, réessaie."));
  }, [updateCart, toast]);

  /** Importe une sauvegarde : les recettes de même identifiant sont remplacées. */
  const importAll = useCallback(async (list: Recipe[], panier?: Cart, photos?: Record<string, string>) => {
    const items: { path: [string, string]; data: Record<string, unknown> }[] = list.map(r => {
      const { id, ...rest } = r;
      return { path: ["recettes", id], data: rest };
    });
    if (panier) items.push({ path: ["panier", "main"], data: { items: panier.items, checked: panier.checked } });
    for (let k = 0; k < items.length; k += 400) {
      const b = writeBatch(db);
      items.slice(k, k + 400).forEach(it => b.set(doc(db, it.path[0], it.path[1]), it.data));
      await b.commit();
    }
    // Les photos pèsent lourd : une par une.
    for (const r of list) {
      const data = photos?.[r.id];
      if (data) await setDoc(doc(db, "photos", r.id), { data });
    }
  }, []);

  return { recipes, loaded, notice, cart, updateCart, addToCart, saveRecipe, addRecipe, removeRecipe, importAll, savePhoto, deletePhoto, loadPhoto, fetchPhotos };
}
