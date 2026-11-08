# Carnet de recettes : notes pour Claude

Application React + TypeScript construite avec Vite. Hébergée sur GitHub Pages (déploiement par GitHub Action à chaque push sur `main`), données dans Firebase (Firestore, offre gratuite), connexion par e-mail et mot de passe pour 2 personnes. Interface et textes en français, tutoiement.

Commandes : `npm run dev` (http://localhost:5173/carnet-recettes/), `npm test`, `npm run build`.

## Fichiers
- `index.html` : page racine de Vite (charge `src/main.tsx` et les polices).
- `src/main.tsx`, `src/App.tsx` : point d'entrée, connexion, onglets, routage par hash (`#courses`, `#finder`, `#r-<id>`), fenêtres de confirmation, export/import.
- `src/constants.ts` : `CATS`, `UNITS`, `ENVIES`, `COMPS`, `BASICS`, `ALERTS`.
- `src/lib/emoji.ts` : emoji d'un ingrédient d'après son nom (règles dans l'ordre, la première qui correspond gagne ; 🥫 par défaut), affiché dans `ShopList` (liste de courses du panier et du batch). `src/lib/rayon.ts` : rayon d'un ingrédient (fruits et légumes, boulangerie, viandes et poissons, crèmerie, épicerie, épices et condiments, surgelés, autre), dans l'ordre d'un parcours de magasin ; `ShopList` regroupe par rayon. Même principe de règles ordonnées : le cas particulier avant le général. Pour un nouvel ingrédient mal reconnu, ajouter une règle AVANT la plus générale et un cas dans `lib.test.ts`. Les emojis choisis à la main sont dans le dictionnaire `ingredients/emojis` (`map` : nom d'ingrédient sans accents ni majuscules → un emoji, valable pour toutes les recettes) ; `emojiOf(nom, dictionnaire)` prend le choix manuel avant la règle. Choix depuis le bouton emoji de chaque ligne d'ingrédient du formulaire d'édition (`EmojiPicker`) ; l'export et l'import JSON contiennent `emojis`. Dans un brouillon pour le script d'ajout, `e` sur une ligne d'ingrédient (un seul emoji) l'enregistre dans le dictionnaire : à utiliser quand l'emoji automatique se trompe ou tombe sur 🥫.
- `src/lib/format.ts` (formats, `aggregate`, catalogue d'ingrédients), `src/lib/finder.ts` (`QUIZ`, `rank`, `propose`), `src/lib/route.ts`. Testés dans `src/lib/lib.test.ts`.
- `src/hooks/useData.ts` : recettes et panier en direct depuis Firestore. `src/hooks/useAuth.ts` : connexion.
- `src/views/` : `RecipeList`, `RecipeView`, `EditForm`, `Courses`, `Batch`, `MealFinder`, `Login`. `src/components/` : `Dialog`, `Stepper`, `Toast`, icônes.
- `src/firebase.ts` : configuration Firebase du projet (pas secrète).
- `src/styles.css` : tout le CSS (variables, thème clair et sombre).
- `public/` : manifest et icônes. `.github/workflows/deploy.yml` : build et déploiement.
- `scripts/add-recipes.ts` : ajout de recettes en base (voir « Ajouter des recettes »).
- `firestore.rules` : règle de sécurité (lecture et écriture limitées à 2 e-mails). À publier dans la console Firebase, pas lue par le site.
- `LISEZMOI.md` : guide de mise en ligne.

## Données (Firestore)
- `recettes/{id}` : `name`, `category` (Entrée, Plat, Dessert, Apéro, Petit-déj, Autre), `time` (minutes, 0 = inconnu), `readyMade` (plat déjà préparé, sans recette : pizza surgelée… ; `time` y est le temps de cuisson, `ing` et `steps` facultatifs), `portions` (nombre de personnes pour lequel les quantités sont écrites, 1 si absent), `ing` (liste de `{n, q, u}`), `steps` (une étape par ligne), `notes`, `fav`, `createdAt` (ms), `envies` (liste parmi `ENVIES`), `composants` (liste parmi `COMPS`), `saisons` (liste parmi `SAISONS` : Printemps, Été, Automne, Hiver ; les quatre = toute l'année ; vide = non renseigné).
- `photos/{id}` (id = celui de la recette) : `data`, la grande photo (JPEG en data URL, 1200 px max, moins de 700 000 caractères). La miniature de 360 px est dans la recette (`thumb`) : elle sert à la liste, la grande photo n'est chargée qu'à la fiche (`usePhoto`). Pas de Cloud Storage : il demande le forfait payant Blaze. Les photos sont réduites dans le navigateur (`src/lib/image.ts`) ; la sauvegarde JSON (version 2) les contient (`photos`). Le script d'ajout de recettes ne gère pas les photos.
- `panier/main` : `items` (liste de `{rid, n}`, n = nombre de personnes) et `checked` (clés `nom normalisé|unité` cochées).
- `batch/main` : plan de batch cooking. `slots` (liste de `{rid, n}` : recette et nombre de personnes ; `rid` vide = case libre, 1 à 12 cases), `checked` (cases cochées de la liste de courses du batch, mêmes clés que le panier) et `persons` (nombre de personnes proposé par défaut). La liste de courses du batch réutilise `aggregate` via `batchToCart` (`src/lib/batch.ts`). « Remplir au hasard » donne 2 ou 3 portions à chaque plat tiré (plus si `persons` est réglé plus haut). Page `#batch`, atteinte par le sélecteur « Panier / Batch cooking » de l'onglet Courses. Supprimer une recette vide ses cases ; l'export et l'import JSON contiennent `batch`.
- Les quantités `q` sont celles de la recette pour `portions` personnes (1 par défaut, donc par personne). La fiche et la liste de courses les ramènent au nombre de personnes choisi : `q × n / portions`. La fiche et la fenêtre « Ajouter au panier » démarrent à `portions`. Les unités sont dans `UNITS` (g, kg, ml, cl, l, càs, càc, pincée, gousse, pièce, tranche, feuille, poignée, bouquet, botte). La liste de courses additionne par nom normalisé et unité, en convertissant g/kg et ml/cl/l.
- À savoir : les données renvoyées par `onSnapshot` ne doivent pas être modifiées sur place, on les copie (`{ ...d.data(), id }`). L'état du Meal finder est copié (`structuredClone`) avant chaque modification.

## Ajouter des recettes (pour Claude)
Quand l'utilisateur donne une recette à mettre en base, ne pas passer par l'app : utiliser `scripts/add-recipes.ts` (Firebase Admin, écrit directement dans Firestore, la même base qu'en ligne).
1. Écrire un brouillon `recettes-a-ajouter.json` (ignoré par git) : liste d'objets `{ name, category, time, portions, ing: [{n, q, u}], steps (texte ou liste), notes, envies, composants, saisons, readyMade (true pour un plat déjà préparé : ing et steps peuvent alors être absents) }`. `category`, `u`, `envies`, `composants` doivent venir de `src/constants.ts`. `q` est pour `portions` personnes. Renseigner `envies`, `composants` et `saisons` (le filtre « De saison » et le Meal finder s'en servent ; saisons au sens du calendrier : printemps mars-mai, été juin-août, automne sept.-nov., hiver déc.-fév.) et mettre les infos nutritionnelles dans `notes`. Ne rien inventer : si une quantité ou un temps manque, estimer et le dire dans la réponse.
2. Vérifier sans écrire : `node scripts/add-recipes.ts recettes-a-ajouter.json`.
3. Montrer le résultat à l'utilisateur et **attendre son accord**, puis écrire : `node scripts/add-recipes.ts recettes-a-ajouter.json --write`. L'identifiant est le nom sans accents (`tarte-epinards-chevre`) ; une recette déjà présente n'est jamais écrasée.
La clé de compte de service est à la racine du dépôt (`service-account.json` ou le `…-firebase-adminsdk-….json` téléchargé, ignorés par git) ou dans `~/.config/carnet-recettes/service-account.json` ; le script la trouve seul. Ne jamais la lire, la copier, l'afficher ni la committer (vérifier avec `git check-ignore`). Le script refuse une clé d'un autre projet. Si elle manque, indiquer à l'utilisateur comment la créer : console Firebase > Paramètres du projet > Comptes de service > Générer une nouvelle clé privée.

## Meal finder
Questionnaire en 7 étapes (`QUIZ`), puis proposition classée par `rank()`. Les recettes vraiment saisonnières (1 à 3 saisons, dont la saison du jour) passent devant, avec « de saison » dans les raisons (`src/lib/season.ts`). Les plats « prêt à manger » du carnet s'ajoutent aux idées « Plat déjà préparé » de l'alerte (`withReadyMade`). Les réponses « oui » à l'alerte sont décrites dans la table `ALERTS` (libellé, message, boutons : recette en mode `random`, `estomac` ou `fast`, ou idées sans recette). Pour ajouter une réponse ou une idée, modifier cette table (`src/constants.ts`). « Rapide » = 30 minutes maximum (`> 30` dans `rank()`).

## Conventions
- Jamais de `localStorage` pour des données partagées. Seul `recettes.cat` (dernière catégorie utilisée) y est stocké.
- Pas d'`alert()` ni de `confirm()` : les confirmations sont des fenêtres dans la page (composants `Dialog` et `ConfirmBox`).
- Couleurs via variables CSS (thème clair et sombre). Police : Bricolage Grotesque (titres) et DM Sans (texte).
- Quitter le Meal finder en cours de route ouvre une confirmation et réinitialise le questionnaire.

## À faire / idées en suspens
- Composant « Légumineuses » ou « Végé » pour le Meal finder.
- Valeurs nutritionnelles encore dans les notes (pas de champ dédié).
