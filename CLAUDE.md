# Carnet de recettes : notes pour Claude

Site statique d'un seul fichier (`index.html`, HTML + CSS + JS sans build ni framework). Hébergé sur GitHub Pages, données dans Firebase (Firestore, offre gratuite), connexion par e-mail et mot de passe pour 2 personnes. Interface et textes en français, tutoiement.

## Fichiers
- `index.html` : toute l'app. Le script commence par les constantes (`ENVIES`, `COMPS`, `BASICS`, `ALERTS`), puis le routage par hash, le panier, la liste, la fiche, la page Courses, le Meal finder, et se termine par la connexion Firebase (`startApp` / `stopApp`).
- `firebase-config.js` : configuration Firebase du projet (pas secrète).
- `firestore.rules` : règle de sécurité (lecture et écriture limitées à 2 e-mails). À publier dans la console Firebase, pas lue par le site.
- `LISEZMOI.md` : guide de mise en ligne.

## Données (Firestore)
- `recettes/{id}` : `name`, `category` (Entrée, Plat, Dessert, Apéro, Petit-déj, Autre), `time` (minutes, 0 = inconnu), `ing` (liste de `{n, q, u}`), `steps` (une étape par ligne), `notes`, `fav`, `createdAt` (ms), `envies` (liste parmi `ENVIES`), `composants` (liste parmi `COMPS`).
- `panier/main` : `items` (liste de `{rid, n}`, n = nombre de personnes) et `checked` (clés `nom normalisé|unité` cochées).
- Les quantités `q` sont **par personne**. La fiche et la liste de courses les multiplient. Les unités sont dans `UNITS` (g, kg, ml, cl, l, càs, càc, pincée, gousse, pièce, tranche, feuille, poignée, bouquet, botte). La liste de courses additionne par nom normalisé et unité, en convertissant g/kg et ml/cl/l.
- À savoir : les données renvoyées par `onSnapshot` ne doivent pas être modifiées sur place, on les copie (`Object.assign({}, d.data(), {id})`).

## Meal finder
Questionnaire en 7 étapes (`QUIZ`), puis proposition classée par `rank()`. Les réponses « oui » à l'alerte sont décrites dans la table `ALERTS` (libellé, message, boutons : recette en mode `random`, `estomac` ou `fast`, ou idées sans recette). Pour ajouter une réponse ou une idée, modifier cette table. « Rapide » = 30 minutes maximum (`> 30` dans `rank()`).

## Conventions
- Jamais de `localStorage` pour des données partagées. Seul `recettes.cat` (dernière catégorie utilisée) y est stocké.
- Pas d'`alert()` ni de `confirm()` : les confirmations sont des fenêtres dans la page (`confirmBox`, `confirmDelete`, `confirmLeave`).
- Couleurs via variables CSS (thème clair et sombre). Police : Bricolage Grotesque (titres) et DM Sans (texte).
- Quitter le Meal finder en cours de route ouvre une confirmation et réinitialise le questionnaire.

## À faire / idées en suspens
- Champ « pour combien de personnes » par recette : cannelloni, quiche et tarte épinards-chèvre ont des quantités de plat entier (mentionné dans leurs notes), la tatin a été ramenée à 1 portion.
- Composant « Légumineuses » ou « Végé » pour le Meal finder.
- Valeurs nutritionnelles encore dans les notes (pas de champ dédié).
