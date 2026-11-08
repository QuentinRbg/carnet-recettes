import { norm } from "./format";

/** Emoji de repli : un aliment qu'aucune règle ne reconnaît (conserve, produit d'épicerie). */
export const FALLBACK_EMOJI = "🥫";

/**
 * Règles dans l'ordre : la première qui correspond gagne, donc le plus précis passe avant le plus général
 * (« pomme de terre » avant « pomme », « lait de coco » avant « lait », « bouillon de volaille » avant « volaille »…).
 * Le nom est comparé sans accents ni majuscules, « œ » devenant « oe ».
 */
const RULES: [RegExp, string][] = [
  [/bouillon/, "🍲"],
  [/coco/, "🥥"],
  [/hache vegetal|tofu/, "🌱"],
  [/pate (brisee|feuilletee)/, "🥧"],
  [/pizza/, "🍕"],
  [/pain a burger/, "🍔"],
  [/tortilla/, "🫓"],
  [/\bpain\b/, "🍞"],
  [/\bfrites?\b/, "🍟"],
  [/\bpuree\b/, "🥔"],
  [/pomme de terre/, "🥔"],
  [/patate douce/, "🍠"],
  [/\bpommes?\b/, "🍎"],
  [/tomate/, "🍅"],
  [/fromage|cheddar|comte|gruyere|parmesan|pecorino|mozzarella|ricotta|feta|camembert|tomme|chevre|raclette|emmental/, "🧀"],
  [/saucisse\b/, "🌭"],
  [/vinaigre/, "🫙"],
  [/sauce|ketchup|mayonnaise|moutarde|pesto|harissa|bechamel/, "🫙"],
  [/citron/, "🍋"],
  [/olive|huile/, "🫒"],
  [/\bsel\b|\bpoivre\b/, "🧂"],
  [/poivron/, "🫑"],
  [/piment/, "🌶️"],
  [/basilic|persil|coriandre|ciboulette|thym|laurier|bouquet garni|origan|menthe/, "🌿"],
  [/cumin|curcuma|curry|paprika|cannelle|gingembre|muscade|ras el hanout|epices/, "🧂"],
  [/\bail\b/, "🧄"],
  [/oignon|echalote/, "🧅"],
  [/creme|yaourt|\blait\b/, "🥛"],
  [/beurre/, "🧈"],
  [/\boeufs?\b/, "🥚"], // \b : « bœuf » contient « œuf » mais n'est pas un œuf
  [/poulet|volaille/, "🍗"],
  [/boeuf|steak|hache/, "🥩"],
  [/jambon|lardon|guanciale|pancetta|coppa|\blard\b|saucisson/, "🥓"],
  [/saumon|thon|colin|poisson/, "🐟"],
  [/pates|spaghetti|macaroni|penne|rigatoni|orzo|lasagne|cannelloni|nouilles/, "🍝"],
  [/\briz\b/, "🍚"],
  [/semoule|farine|maizena|levure/, "🌾"],
  [/carotte/, "🥕"],
  [/navet/, "🌱"],
  [/aubergine/, "🍆"],
  [/courgette|concombre|cornichon/, "🥒"],
  [/courge|potiron|potimarron|butternut/, "🎃"],
  [/brocoli|chou-fleur|chou fleur|legumes pour wok/, "🥦"],
  [/\bchou\b|epinard|salade|roquette|mache|poireau|celeri/, "🥬"],
  [/avocat/, "🥑"],
  [/champignon/, "🍄"],
  [/\bmais\b/, "🌽"],
  [/petits pois/, "🫛"],
  [/pois chiche|haricot|lentille/, "🫘"],
  [/noix|noisette|amande|cacahuete/, "🥜"],
  [/sucre/, "🍬"],
  [/miel/, "🍯"],
  [/rhum/, "🥃"],
  [/\bvin\b/, "🍷"],
  [/\beau\b/, "💧"],
  [/soupe/, "🍲"],
  [/\bcrepes?\b/, "🥞"]
];

/** Emoji d'un ingrédient d'après son nom, pour repérer d'un coup d'œil dans une longue liste de courses. */
export function emojiFor(name: string): string {
  const n = norm(name).replace(/œ/g, "oe");
  for (const [re, emoji] of RULES) if (re.test(n)) return emoji;
  return FALLBACK_EMOJI;
}
