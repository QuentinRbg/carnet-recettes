export const CATS = ["Entrée", "Plat", "Dessert", "Apéro", "Petit-déj", "Autre"];

export const UNITS: [string, string][] = [
  ["", "–"], ["g", "g"], ["kg", "kg"], ["ml", "ml"], ["cl", "cl"], ["l", "l"],
  ["càs", "càs"], ["càc", "càc"], ["pincée", "pincée"], ["gousse", "gousse"], ["pièce", "pièce"],
  ["tranche", "tranche"], ["feuille", "feuille"], ["poignée", "poignée"], ["bouquet", "bouquet"], ["botte", "botte"]
];

export const PLURAL: Record<string, string> = {
  "pincée": "pincées", "gousse": "gousses", "pièce": "pièces", "tranche": "tranches",
  "feuille": "feuilles", "poignée": "poignées", "bouquet": "bouquets", "botte": "bottes"
};

export const ENVIES = ["Réconfortant", "Léger et frais", "Gourmand", "Healthy", "Anti-inflammatoire", "Doux pour l'estomac"];
export const ENVIE_HINT: Record<string, string> = { "Anti-inflammatoire": "sans friture" };

export const COMPS = ["Riz", "Pâtes", "Viande", "Œufs", "Poisson", "Légumes", "Pommes de terre", "Purée"];
export const BASICS = ["sel", "poivre", "eau", "huile d'olive"];

export type Mode = "" | "random" | "estomac" | "fast";

export type RecipeAction = { label: string; kind: "recipe"; mode: Mode };
export type IdeasAction = { label: string; kind: "ideas"; title: string; items: string[]; withReadyMade?: boolean };
export type AlertAction = RecipeAction | IdeasAction;
export type AlertInfo = { label: string; title: string; intro: string; actions: AlertAction[] };

// Alerte « je n'arrive pas à me décider » : une entrée par réponse.
// label = réponse dans le questionnaire, title + intro = écran qui suit,
// actions = boutons de cet écran. kind "recipe" lance une proposition avec le mode donné
// (random, estomac, fast) ; kind "ideas" tire une idée au hasard dans items (sans recette).
export const ALERTS: Record<string, AlertInfo> = {
  appetit: {
    label: "Oui, je n'ai pas faim", title: "Pas faim ?",
    intro: "Si tu n'as pas faim et que rien ne t'inspire, choisis une recette sans te prendre la tête. Tu la mangeras plus tard, quand tu auras faim.",
    actions: [{ label: "Choisis-moi une recette", kind: "recipe", mode: "random" }]
  },
  estomac: {
    label: "Oui, ventre fragile ou patraque", title: "Ventre fragile ?",
    intro: "Va doucement : mange simple (riz, purée, bouillon) et bois de l'eau.",
    actions: [{ label: "Une recette douce", kind: "recipe", mode: "estomac" }]
  },
  fatigue: {
    label: "Oui, trop fatigué(e) pour cuisiner", title: "Trop fatigué(e) pour cuisiner ?",
    intro: "On part sur une recette rapide, ou sur encore plus simple.",
    actions: [
      { label: "Une recette rapide", kind: "recipe", mode: "fast" },
      { label: "Un plat déjà préparé", kind: "ideas", title: "Plat déjà préparé", withReadyMade: true, items: ["Pizza surgelée", "Plat surgelé au micro-ondes", "Soupe en brique", "Les restes du frigo", "Pâtes avec une sauce toute prête"] },
      { label: "De la nourriture à emporter", kind: "ideas", title: "À emporter", items: ["Chinois", "Pizzeria", "Kebab", "Sushi", "Burger", "Indien", "Poke bowl"] }
    ]
  }
};
