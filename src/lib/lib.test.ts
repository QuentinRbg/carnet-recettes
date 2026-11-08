import { describe, expect, it } from "vitest";
import { aggregate, fmtTime, isComplete, norm, portionsOf, qtyText } from "./format";
import { newFinder, propose, rank } from "./finder";
import type { Recipe } from "../types";

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
