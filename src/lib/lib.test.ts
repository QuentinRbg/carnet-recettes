import { describe, expect, it } from "vitest";
import { aggregate, fmtTime, isComplete, norm, portionsOf, qtyText } from "./format";
import { newFinder, propose, rank } from "./finder";
import { currentSeason, inSeason, isSeasonal } from "./season";
import { recipeMatches, toggleFilter } from "./filters";
import { emojiFor, emojiKey, emojiOf, FALLBACK_EMOJI, firstEmoji, normalizeEmojis } from "./emoji";
import { RAYONS, rayonFor } from "./rayon";
import type { RayonId } from "./rayon";
import { batchToCart, defaultBatch, dropRecipe, fillRandom, filledSlots, normalizeBatch, resizeSlots } from "./batch";
import type { Recipe } from "../types";
import { fitSize } from "./image";

const base = { category: "Plat", time: 20, steps: "", notes: "", fav: false, createdAt: 0, envies: [], composants: [] };
const r = (id: string, over: Partial<Recipe>): Recipe => ({ id, name: id, ...base, ...over });

describe("format", () => {
  it("normalise les accents et la casse", () => {
    expect(norm("Crème Brûlée")).toBe("creme brulee");
  });
  it("formate le temps", () => {
    expect(fmtTime(0)).toBe("");
    expect(fmtTime(45)).toBe("45 min");
    expect(fmtTime(65)).toBe("1 h 05");
  });
  it("convertit g en kg et met au pluriel", () => {
    expect(qtyText(1500, "g")).toMatch(/^1,5 kg$/);
    expect(qtyText(3, "gousse")).toBe("3 gousses");
    expect(qtyText(0, "g")).toBe("");
  });
});

describe("aggregate", () => {
  it("additionne par nom et unité, avec conversion", () => {
    const recipes = [
      r("a", { ing: [{ n: "Farine", q: 100, u: "g" }, { n: "Lait", q: 10, u: "cl" }] }),
      r("b", { ing: [{ n: "farine", q: 0.1, u: "kg" }, { n: "Lait", q: 1, u: "ml" }] })
    ];
    const out = aggregate({ items: [{ rid: "a", n: 2 }, { rid: "b", n: 1 }], checked: [] }, recipes);
    expect(out.find(x => x.key === "farine|g")?.q).toBe(300);
    expect(out.find(x => x.key === "lait|ml")?.q).toBe(201);
  });
  it("divise par le nombre de personnes de la recette", () => {
    const quiche = r("q", { portions: 4, ing: [{ n: "Œuf", q: 3, u: "pièce" }, { n: "Brocoli", q: 300, u: "g" }] });
    const out = aggregate({ items: [{ rid: "q", n: 2 }], checked: [] }, [quiche]);
    expect(out.find(x => x.key === "œuf|pièce")?.q).toBe(1.5);
    expect(out.find(x => x.key === "brocoli|g")?.q).toBe(150);
    expect(aggregate({ items: [{ rid: "q", n: 4 }], checked: [] }, [quiche]).find(x => x.key === "brocoli|g")?.q).toBe(300);
  });
  it("portions absent ou invalide = 1", () => {
    expect(portionsOf(r("a", {}))).toBe(1);
    expect(portionsOf(r("b", { portions: 0 }))).toBe(1);
    expect(portionsOf(r("c", { portions: 4 }))).toBe(4);
  });
  it("ignore les recettes supprimées", () => {
    expect(aggregate({ items: [{ rid: "x", n: 1 }], checked: [] }, [])).toEqual([]);
  });
});

describe("plat déjà préparé", () => {
  it("n'est pas « à compléter » même sans ingrédients ni étapes", () => {
    expect(isComplete(r("v", {}))).toBe(false);
    expect(isComplete(r("p", { readyMade: true }))).toBe(true);
    expect(isComplete(r("i", { ing: [{ n: "Sel", q: 1, u: "pincée" }] }))).toBe(true);
  });
  it("sans ingrédients, il ne change pas la liste de courses", () => {
    const pizza = r("pizza", { readyMade: true, time: 10 });
    expect(aggregate({ items: [{ rid: "pizza", n: 2 }], checked: [] }, [pizza])).toEqual([]);
  });
  it("sert au filtre « rapide » grâce à son temps de cuisson", () => {
    const pizza = r("pizza", { readyMade: true, time: 10 });
    const f = newFinder(); f.a.fast = true;
    expect(rank(f, [pizza, r("long", { time: 90 })]).map(x => x.r.id)).toEqual(["pizza"]);
  });
});

describe("meal finder", () => {
  const recipes = [
    r("rapide", { time: 15, composants: ["Riz"] }),
    r("long", { time: 90 }),
    r("viande", { time: 20, composants: ["Viande"] })
  ];
  it("rapide = 30 minutes maximum", () => {
    const f = newFinder();
    f.a.fast = true;
    expect(rank(f, recipes).map(x => x.r.id).sort()).toEqual(["rapide", "viande"]);
  });
  it("écarte les composants à éviter", () => {
    const f = newFinder();
    f.a.avoid = ["Viande"];
    expect(rank(f, recipes).map(x => x.r.id)).not.toContain("viande");
  });
  it("ne repropose jamais une recette déjà vue, puis termine", () => {
    const f = newFinder();
    for (let i = 0; i < recipes.length; i++) propose(f, recipes);
    expect(new Set(f.shown).size).toBe(3);
    propose(f, recipes);
    expect(f.phase).toBe("none");
  });
});

describe("photo", () => {
  it("réduit sans déformer ni agrandir", () => {
    expect(fitSize(4000, 3000, 1200)).toEqual({ w: 1200, h: 900 });
    expect(fitSize(3000, 4000, 240)).toEqual({ w: 180, h: 240 });
    expect(fitSize(300, 200, 1200)).toEqual({ w: 300, h: 200 });
    expect(fitSize(1, 5000, 100).w).toBe(1);
  });
});

describe("saisons", () => {
  it("donne la saison du jour au sens du calendrier", () => {
    expect(currentSeason(new Date(2026, 1, 28))).toBe("Hiver");   // 28 février
    expect(currentSeason(new Date(2026, 2, 1))).toBe("Printemps"); // 1er mars
    expect(currentSeason(new Date(2026, 4, 31))).toBe("Printemps");
    expect(currentSeason(new Date(2026, 5, 1))).toBe("Été");
    expect(currentSeason(new Date(2026, 7, 31))).toBe("Été");
    expect(currentSeason(new Date(2026, 8, 1))).toBe("Automne");
    expect(currentSeason(new Date(2026, 10, 30))).toBe("Automne");
    expect(currentSeason(new Date(2026, 11, 1))).toBe("Hiver");
    expect(currentSeason(new Date(2026, 0, 15))).toBe("Hiver");
  });
  it("sait si une recette est de saison ou vraiment saisonnière", () => {
    expect(inSeason({ saisons: ["Été", "Automne"] }, "Été")).toBe(true);
    expect(inSeason({ saisons: ["Hiver"] }, "Été")).toBe(false);
    expect(inSeason({}, "Été")).toBe(false);
    expect(isSeasonal({ saisons: ["Hiver"] })).toBe(true);
    expect(isSeasonal({ saisons: ["Printemps", "Été", "Automne", "Hiver"] })).toBe(false);
    expect(isSeasonal({ saisons: [] })).toBe(false);
  });
  it("le Meal finder met les recettes de saison devant, sans favoriser celles de toute l'année", () => {
    const recettes = [
      r("hiver", { saisons: ["Hiver"] }),
      r("ete", { saisons: ["Été"] }),
      r("toute", { saisons: ["Printemps", "Été", "Automne", "Hiver"] }),
      r("vide", {})
    ];
    for (let i = 0; i < 20; i++) {
      const top = rank(newFinder(), recettes, "Été")[0];
      expect(top.r.id).toBe("ete");
      expect(top.why).toContain("de saison");
    }
    const sansBoost = rank(newFinder(), recettes, "Été").filter(x => x.r.id !== "ete");
    sansBoost.forEach(x => expect(x.why).not.toContain("de saison"));
  });
});

describe("filtres de la liste", () => {
  const A = r("a", { category: "Plat", envies: ["Gourmand"], fav: true, saisons: ["Hiver"] });
  const B = r("b", { category: "Dessert", envies: ["Healthy", "Gourmand"], saisons: ["Été"] });
  const C = r("c", { category: "Plat", envies: ["Anti-inflammatoire"], readyMade: true });
  it("sans filtre, tout passe", () => {
    [A, B, C].forEach(x => expect(recipeMatches(x, [])).toBe(true));
  });
  it("une ambiance seule", () => {
    expect([A, B, C].filter(x => recipeMatches(x, ["Gourmand"])).map(x => x.id)).toEqual(["a", "b"]);
  });
  it("plusieurs ambiances : l'une ou l'autre", () => {
    expect([A, B, C].filter(x => recipeMatches(x, ["Healthy", "Anti-inflammatoire"])).map(x => x.id)).toEqual(["b", "c"]);
  });
  it("catégorie et ambiance se cumulent", () => {
    expect([A, B, C].filter(x => recipeMatches(x, ["Plat", "Gourmand"])).map(x => x.id)).toEqual(["a"]);
  });
  it("plusieurs catégories : l'une ou l'autre", () => {
    expect([A, B, C].filter(x => recipeMatches(x, ["Plat", "Dessert"])).length).toBe(3);
  });
  it("De saison, Favorites et Prêt à manger se cumulent", () => {
    expect([A, B, C].filter(x => recipeMatches(x, ["De saison"], "Été")).map(x => x.id)).toEqual(["b"]);
    expect([A, B, C].filter(x => recipeMatches(x, ["Favorites", "De saison"], "Hiver")).map(x => x.id)).toEqual(["a"]);
    expect([A, B, C].filter(x => recipeMatches(x, ["Prêt à manger"])).map(x => x.id)).toEqual(["c"]);
    expect([A, B, C].filter(x => recipeMatches(x, ["Prêt à manger", "Favorites"])).length).toBe(0);
  });
  it("coche et décoche un filtre", () => {
    expect(toggleFilter([], "Gourmand")).toEqual(["Gourmand"]);
    expect(toggleFilter(["Gourmand", "Plat"], "Gourmand")).toEqual(["Plat"]);
  });
});

describe("batch cooking", () => {
  const full = (ids: string[]) => ({ ...defaultBatch(), slots: ids.map(id => ({ rid: id, n: 2 })), persons: 3 });
  it("démarre avec 6 cases libres, pour 2 personnes", () => {
    const b = defaultBatch();
    expect(b.slots).toHaveLength(6);
    expect(filledSlots(b)).toHaveLength(0);
    expect(b.persons).toBe(2);
  });
  it("ajoute des cases libres en augmentant le nombre de plats", () => {
    const s = resizeSlots([{ rid: "a", n: 2 }], 3);
    expect(s).toHaveLength(3);
    expect(s[0].rid).toBe("a");
    expect(s[2].rid).toBe("");
  });
  it("en réduisant, retire d'abord les cases libres sans perdre de plat", () => {
    const s = resizeSlots([{ rid: "a", n: 1 }, { rid: "", n: 1 }, { rid: "b", n: 1 }, { rid: "", n: 1 }], 2);
    expect(s.map(x => x.rid)).toEqual(["a", "b"]);
  });
  it("en réduisant encore, retire les dernières cases pleines", () => {
    const s = resizeSlots([{ rid: "a", n: 1 }, { rid: "b", n: 1 }, { rid: "c", n: 1 }], 2);
    expect(s.map(x => x.rid)).toEqual(["a", "b"]);
  });
  it("garde le nombre de plats entre 1 et 12", () => {
    expect(resizeSlots([], 0)).toHaveLength(1);
    expect(resizeSlots([], 50)).toHaveLength(12);
  });
  it("devient un panier, ce qui donne la liste de courses avec les bonnes quantités", () => {
    const recettes = [r("a", { portions: 2, ing: [{ n: "Riz", q: 100, u: "g" }] }), r("b", { ing: [{ n: "Riz", q: 50, u: "g" }] })];
    const b = { ...full(["a", "b", ""]), checked: ["riz|g"] };
    const cart = batchToCart(b);
    expect(cart.items).toEqual([{ rid: "a", n: 2 }, { rid: "b", n: 2 }]);
    expect(cart.checked).toEqual(["riz|g"]);
    // a : 100 g pour 2 pers., on en veut 2 → 100 g ; b : 50 g par pers., on en veut 2 → 100 g
    expect(aggregate(cart, recettes).find(x => x.key === "riz|g")?.q).toBe(200);
  });
  it("vide les cases d'une recette supprimée", () => {
    const b = dropRecipe(full(["a", "b", "a"]), "a");
    expect(b.slots.map(x => x.rid)).toEqual(["", "b", ""]);
  });
  it("remplit au hasard seulement les cases libres, sans doublon, au bon nombre de personnes", () => {
    const b = { ...defaultBatch(), slots: [{ rid: "a", n: 4 }, { rid: "", n: 1 }, { rid: "", n: 1 }], persons: 3 };
    const out = fillRandom(b, ["a", "b", "c", "d"], () => 0.5);
    expect(out.slots[0]).toEqual({ rid: "a", n: 4 });
    const ids = out.slots.map(x => x.rid);
    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain("");
    expect(out.slots[1].n).toBe(3);
  });
  it("laisse des cases libres s'il n'y a pas assez de recettes", () => {
    const out = fillRandom(defaultBatch(), ["a", "b"], () => 0.1);
    expect(filledSlots(out)).toHaveLength(2);
  });
  it("remet en forme un document abîmé ou absent", () => {
    expect(normalizeBatch(null)).toEqual(defaultBatch());
    expect(normalizeBatch({ slots: "x" }).slots).toHaveLength(6);
    const n = normalizeBatch({ slots: [null, { rid: "a", n: 500 }, { rid: 3 }], checked: ["k", 4], persons: 0 });
    expect(n.slots).toEqual([{ rid: "", n: 1 }, { rid: "a", n: 99 }, { rid: "", n: 1 }]);
    expect(n.checked).toEqual(["k"]);
    expect(n.persons).toBe(2);
  });
});

describe("emojis des ingrédients", () => {
  const cas: [string, string][] = [
    ["Tomate", "🍅"], ["Tomate concassée", "🍅"], ["Coulis de tomate", "🍅"],
    ["Pomme de terre", "🥔"], ["Pomme", "🍎"], ["Patate douce", "🍠"], ["Purée Mousline (flocons)", "🥔"],
    ["Lait", "🥛"], ["Lait de coco", "🥥"], ["Lait de brebis", "🥛"], ["Crème fraîche épaisse", "🥛"],
    ["Poivre", "🧂"], ["Poivron rouge", "🫑"], ["Piment d'Espelette", "🌶️"],
    ["Œuf", "🥚"], ["Jaune d'œuf", "🥚"], ["Bœuf haché", "🥩"], ["Steak haché de bœuf", "🥩"], ["Haché végétal", "🌱"],
    ["Blanc de poulet", "🍗"], ["Bouillon de volaille", "🍲"], ["Saucisse de volaille", "🌭"], ["Saucisson", "🥓"],
    ["Pâtes", "🍝"], ["Pâtes Orzo", "🍝"], ["Plaques de lasagnes", "🍝"], ["Pâte feuilletée", "🥧"], ["Pâte brisée", "🥧"],
    ["Riz Arborio", "🍚"], ["Vinaigre de riz", "🫙"], ["Pain à burger", "🍔"], ["Pain de campagne", "🍞"],
    ["Fromage ail & fines herbes", "🧀"], ["Tomme de brebis", "🧀"], ["Ail", "🧄"], ["Échalote", "🧅"],
    ["Courgette", "🥒"], ["Courge butternut", "🎃"], ["Noix de muscade", "🧂"], ["Noix de pécan", "🥜"],
    ["Jus de citron vert", "🍋"], ["Huile d'olive", "🫒"], ["Maïs en conserve", "🌽"], ["Maïzena", "🌾"],
    ["CAROTTE", "🥕"], ["  carotte  ", "🥕"]
  ];
  it.each(cas)("%s → %s", (nom, emoji) => { expect(emojiFor(nom)).toBe(emoji); });
  it("un aliment inconnu reçoit l'emoji de repli", () => {
    expect(emojiFor("Truc inconnu")).toBe(FALLBACK_EMOJI);
    expect(emojiFor("")).toBe(FALLBACK_EMOJI);
  });
});

describe("rayons de la liste de courses", () => {
  const cas: [string, RayonId][] = [
    ["Tomate", "fruits"], ["Tomate concassée", "epicerie"], ["Coulis de tomate", "epicerie"], ["Pomme de terre", "fruits"],
    ["Lait", "cremerie"], ["Lait de coco", "epicerie"], ["Lait de brebis", "cremerie"], ["Crème végétale", "cremerie"],
    ["Thon en boîte", "epicerie"], ["Pavé de saumon", "viandes"], ["Saumon fumé", "viandes"], ["Bœuf haché", "viandes"], ["Haché végétal", "cremerie"],
    ["Œuf", "cremerie"], ["Jaune d'œuf", "cremerie"], ["Beurre", "cremerie"], ["Fromage ail & fines herbes", "cremerie"], ["Pâte feuilletée", "cremerie"],
    ["Pâtes", "epicerie"], ["Riz", "epicerie"], ["Vinaigre de riz", "epices"], ["Sel", "epices"], ["Poivre", "epices"], ["Poivron rouge", "fruits"],
    ["Cumin en poudre", "epices"], ["Ail en poudre", "epices"], ["Ail", "fruits"], ["Noix de muscade", "epices"], ["Noix de pécan", "epicerie"],
    ["Persil", "fruits"], ["Origan séché", "epices"], ["Lentilles vertes (sèches)", "epicerie"], ["Maïs en conserve", "epicerie"],
    ["Pain de campagne", "boulangerie"], ["Pain à burger", "boulangerie"], ["Tortillas", "boulangerie"],
    ["Frites surgelées", "surgeles"], ["Pizza surgelée", "surgeles"], ["Petits pois surgelés", "surgeles"],
    ["Jus de citron", "epicerie"], ["Citron jaune", "fruits"], ["Sauce soja", "epices"], ["Sauce arrabbiata", "epicerie"],
    ["Truc inconnu", "autre"], ["", "autre"]
  ];
  it.each(cas)("%s → %s", (nom, rayon) => { expect(rayonFor(nom)).toBe(rayon); });
  it("les rayons sont dans l'ordre d'un parcours de magasin, surgelés en dernier avant « Autre »", () => {
    const ids = RAYONS.map(r => r.id);
    expect(ids[0]).toBe("fruits");
    expect(ids.indexOf("surgeles")).toBeLessThan(ids.indexOf("autre"));
    expect(ids.indexOf("surgeles")).toBe(ids.length - 2);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("emoji choisi à la main", () => {
  it("la clé ne dépend ni des accents, ni des majuscules, ni des espaces autour", () => {
    expect(emojiKey("Pêche")).toBe("peche");
    expect(emojiKey("  PÊCHE ")).toBe("peche");
    expect(emojiKey("Œuf")).toBe("oeuf");
    expect(emojiKey("Jaune d'œuf")).toBe("jaune d'oeuf");
  });
  it("l'emoji choisi passe avant celui deviné, et sert pour toutes les graphies du nom", () => {
    const dict = { peche: "🍑", tomate: "🍎" };
    expect(emojiOf("Pêche", dict)).toBe("🍑");
    expect(emojiOf("PÊCHE", dict)).toBe("🍑");
    expect(emojiOf("Tomate", dict)).toBe("🍎");
    expect(emojiOf("Carotte", dict)).toBe("🥕");
    expect(emojiOf("Pêche")).toBe(FALLBACK_EMOJI);
  });
  it("trouve le premier emoji d'un texte, même assemblé", () => {
    expect(firstEmoji("🍑")).toBe("🍑");
    expect(firstEmoji("ma pêche 🍑 mûre")).toBe("🍑");
    expect(firstEmoji("🧑‍🍳 cuisinier")).toBe("🧑‍🍳");
    expect(firstEmoji("🌶️")).toBe("🌶️");
    expect(firstEmoji("pas d'emoji")).toBeNull();
    expect(firstEmoji("")).toBeNull();
  });
  it("remet en forme le dictionnaire venu de Firestore", () => {
    expect(normalizeEmojis(null)).toEqual({});
    expect(normalizeEmojis({})).toEqual({});
    expect(normalizeEmojis({ map: { peche: "🍑", vide: "", texte: "abc", " ": "🍎", nombre: 4, long: "🍑 mûre" } })).toEqual({ peche: "🍑", long: "🍑" });
  });
});
