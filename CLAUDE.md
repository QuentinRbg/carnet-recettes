# Carnet de recettes : notes pour Claude

Application React + TypeScript construite avec Vite. Hébergée sur GitHub Pages (déploiement par GitHub Action à chaque push sur `main`), données dans Firebase (Firestore, offre gratuite), connexion par e-mail et mot de passe pour 2 personnes. Interface et textes en français, tutoiement.

Commandes : `npm run dev` (http://localhost:5173/carnet-recettes/), `npm test`, `npm run build`.

## Fichiers
- `index.html` : page racine de Vite (charge `src/main.tsx` et les polices).
- `src/main.tsx`, `src/App.tsx` : point d'entrée, connexion, onglets, routage par hash (`#courses`, `#finder`, `#r-<id>`), fenêtres de confirmation, export/import.
- `src/constants.ts` : `CATS`, `UNITS`, `ENVIES`, `COMPS`, `BASICS`, `ALERTS`.
- `src/lib/format.ts` (formats, `aggregate`, catalogue d'ingrédients), `src/lib/finder.ts` (`QUIZ`, `rank`, `propose`), `src/lib/route.ts`. Testés dans `src/lib/lib.test.ts`.
- `src/hooks/useData.ts` : recettes et panier en direct depuis Firestore. `src/hooks/useAuth.ts` : connexion.
- `src/views/` : `RecipeList`, `RecipeView`, `EditForm`, `Courses`, `MealFinder`, `Login`. `src/components/` : `Dialog`, `Stepper`, `Toast`, icônes.
- `src/firebase.ts` : configuration Firebase du projet (pas secrète).
- `src/styles.css` : tout le CSS (variables, thème clair et sombre).
- `public/` : manifest et icônes. `.github/workflows/deploy.yml` : build et déploiement.
- `firestore.rules` : règle de sécurité (lecture et écriture limitées à 2 e-mails). À publier dans la console Firebase, pas lue par le site.
- `LISEZMOI.md` : guide de mise en ligne.

## Données (Firestore)
- `recettes/{id}` : `name`, `category` (Entrée, Plat, Dessert, Apéro, Petit-déj, Autre), `time` (minutes, 0 = inconnu), `ing` (liste de `{n, q, u}`), `steps` (une étape par ligne), `notes`, `fav`, `createdAt` (ms), `envies` (liste parmi `ENVIES`), `composants` (liste parmi `COMPS`).
- `panier/main` : `items` (liste de `{rid, n}`, n = nombre de personnes) et `checked` (clés `nom normalisé|unité` cochées).
- Les quantités `q` sont **par personne**. La fiche et la liste de courses les multiplient. Les unités sont dans `UNITS` (g, kg, ml, cl, l, càs, càc, pincée, gousse, pièce, tranche, feuille, poignée, bouquet, botte). La liste de courses additionne par nom normalisé et unité, en convertissant g/kg et ml/cl/l.
- À savoir : les données renvoyées par `onSnapshot` ne doivent pas être modifiées sur place, on les copie (`{ ...d.data(), id }`). L'état du Meal finder est copié (`structuredClone`) avant chaque modification.

## Meal finder
Questionnaire en 7 étapes (`QUIZ`), puis proposition classée par `rank()`. Les réponses « oui » à l'alerte sont décrites dans la table `ALERTS` (libellé, message, boutons : recette en mode `random`, `estomac` ou `fast`, ou idées sans recette). Pour ajouter une réponse ou une idée, modifier cette table (`src/constants.ts`). « Rapide » = 30 minutes maximum (`> 30` dans `rank()`).

## Conventions
- Jamais de `localStorage` pour des données partagées. Seul `recettes.cat` (dernière catégorie utilisée) y est stocké.
- Pas d'`alert()` ni de `confirm()` : les confirmations sont des fenêtres dans la page (composants `Dialog` et `ConfirmBox`).
- Couleurs via variables CSS (thème clair et sombre). Police : Bricolage Grotesque (titres) et DM Sans (texte).
- Quitter le Meal finder en cours de route ouvre une confirmation et réinitialise le questionnaire.

## À faire / idées en suspens
- Champ « pour combien de personnes » par recette : cannelloni, quiche et tarte épinards-chèvre ont des quantités de plat entier (mentionné dans leurs notes), la tatin a été ramenée à 1 portion.
- Composant « Légumineuses » ou « Végé » pour le Meal finder.
- Valeurs nutritionnelles encore dans les notes (pas de champ dédié).
