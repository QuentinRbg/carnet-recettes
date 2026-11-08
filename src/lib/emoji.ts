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

/** Nom sans accents ni majuscules, « œ » devenant « oe » : base de toutes les règles. */
export const plainName = (name: string): string => norm(name).replace(/œ/g, "oe");

/** Emoji d'un ingrédient d'après son nom, pour repérer d'un coup d'œil dans une longue liste de courses. */
export function emojiFor(name: string): string {
  const n = plainName(name);
  for (const [re, emoji] of RULES) if (re.test(n)) return emoji;
  return FALLBACK_EMOJI;
}

/** Dictionnaire d'emojis choisis à la main : clé = nom d'ingrédient (voir emojiKey), valeur = un emoji. */
export type EmojiDict = Record<string, string>;

/** Clé d'un ingrédient dans le dictionnaire : son nom sans accents ni majuscules. « Tomate » et « tomate » donnent la même clé. */
export const emojiKey = (name: string): string => plainName(name).trim();

/** Emoji d'un ingrédient : celui choisi à la main s'il existe, sinon celui deviné d'après le nom. */
export function emojiOf(name: string, dict: EmojiDict = {}): string {
  return dict[emojiKey(name)] || emojiFor(name);
}

/** Premier emoji d'un texte (un emoji complet, avec ses variantes et ses assemblages), ou null s'il n'y en a pas. */
export function firstEmoji(text: string): string | null {
  const seg = new Intl.Segmenter("fr", { granularity: "grapheme" });
  for (const { segment } of seg.segment(text)) {
    if (/\p{Extended_Pictographic}/u.test(segment)) return segment;
  }
  return null;
}

/** Remet en forme le dictionnaire venu de Firestore : on ne garde que des clés non vides associées à un emoji. */
export function normalizeEmojis(data: unknown): EmojiDict {
  const map = data && typeof data === "object" ? (data as { map?: unknown }).map : null;
  const out: EmojiDict = {};
  if (map && typeof map === "object") {
    for (const [k, v] of Object.entries(map as Record<string, unknown>)) {
      const e = typeof v === "string" ? firstEmoji(v) : null;
      if (k.trim() && e) out[k] = e;
    }
  }
  return out;
}

/** Choix proposés dans le sélecteur d'emoji, par famille d'aliments. */
export const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Légumes", emojis: ["🥬", "🥦", "🥕", "🌽", "🥒", "🍆", "🫑", "🌶️", "🥔", "🍠", "🧅", "🧄", "🍄", "🫛", "🫘", "🎃", "🍅", "🥗"] },
  { label: "Fruits", emojis: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥭", "🍍", "🥝", "🥑", "🥥", "🫒", "🍈"] },
  { label: "Viandes et poissons", emojis: ["🥩", "🍗", "🍖", "🥓", "🌭", "🐟", "🍤", "🦐", "🦑", "🐙", "🦪"] },
  { label: "Crèmerie et œufs", emojis: ["🥛", "🧀", "🧈", "🥚", "🍦"] },
  { label: "Féculents et pain", emojis: ["🍞", "🥖", "🥐", "🥨", "🫓", "🥞", "🧇", "🍝", "🍜", "🍚", "🌾", "🥟", "🍕", "🍟", "🥧"] },
  { label: "Épicerie et épices", emojis: ["🥫", "🫙", "🧂", "🍯", "🍬", "🍫", "🥜", "🌰", "🍲", "🥣", "🧊"] },
  { label: "Herbes", emojis: ["🌿", "🍃", "🌱", "☘️"] },
  { label: "Boissons", emojis: ["💧", "🍷", "🥃", "🍺", "☕", "🍵", "🧃", "🥤"] }
];
