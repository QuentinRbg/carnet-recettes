import { plainName } from "./emoji";

export type RayonId = "fruits" | "boulangerie" | "viandes" | "cremerie" | "epicerie" | "epices" | "surgeles" | "autre";

/**
 * Les rayons, dans l'ordre d'un parcours de magasin : on commence par les fruits et légumes
 * et on finit par les surgelés, pour qu'ils ne décongèlent pas dans le caddie.
 */
export const RAYONS: { id: RayonId; label: string }[] = [
  { id: "fruits", label: "Fruits & légumes" },
  { id: "boulangerie", label: "Boulangerie" },
  { id: "viandes", label: "Viandes & poissons" },
  { id: "cremerie", label: "Crèmerie & frais" },
  { id: "epicerie", label: "Épicerie" },
  { id: "epices", label: "Épices & condiments" },
  { id: "surgeles", label: "Surgelés" },
  { id: "autre", label: "Autre" }
];

/**
 * Règles dans l'ordre : la première qui correspond gagne, donc les cas particuliers passent avant
 * (« lait de coco » est à l'épicerie, « lait » à la crèmerie ; « thon en boîte » à l'épicerie, « thon » aux poissons).
 * Un aliment qu'aucune règle ne reconnaît va dans « Autre ».
 */
const RULES: [RegExp, RayonId][] = [
  [/surgele|\bpizza\b|\bfrites?\b/, "surgeles"],
  [/\bpain\b|tortilla/, "boulangerie"],
  [/\bsel\b|poivre\b|piment|poudre|cumin|curcuma|curry|paprika|cannelle|gingembre|muscade|ras el hanout|epices|origan|vinaigre|moutarde|ketchup|mayonnaise|harissa|sauce soja/, "epices"],
  [/coco|bechamel|en boite|conserve|concass|coulis|concentre|jus de|bouillon|soupe|puree|olive|huile|\bmais\b|pois chiche|haricot|lentille|cornichon|pesto|sauce|sucre|miel|levure|maizena|semoule|farine|\bvin\b|rhum|pates|spaghetti|macaroni|penne|rigatoni|orzo|lasagne|cannelloni|nouilles|\briz\b|noix|graine|petits pois/, "epicerie"],
  [/fromage|cheddar|comte|gruyere|parmesan|pecorino|mozzarella|ricotta|feta|camembert|tomme|chevre|raclette|emmental|creme|yaourt|\blait\b|beurre|\boeufs?\b|tofu|hache vegetal|pate (brisee|feuilletee)|crepes/, "cremerie"],
  [/poulet|volaille|boeuf|steak|\bhache|jambon|lardon|guanciale|pancetta|coppa|\blard\b|saucisse|saucisson|saumon|thon|colin|poisson/, "viandes"],
  [/tomate|pomme|patate|carotte|navet|aubergine|courgette|concombre|courge|potiron|potimarron|butternut|brocoli|chou|epinard|salade|roquette|mache|poireau|celeri|avocat|champignon|poivron|\bail\b|oignon|echalote|citron|basilic|persil|coriandre|ciboulette|thym|laurier|bouquet garni|menthe|legumes|orange|banane|fraise/, "fruits"]
];

/** Rayon d'un ingrédient d'après son nom, pour regrouper la liste de courses comme on fait ses courses. */
export function rayonFor(name: string): RayonId {
  const n = plainName(name);
  for (const [re, id] of RULES) if (re.test(n)) return id;
  return "autre";
}
