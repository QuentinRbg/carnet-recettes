# Mon carnet de recettes : mise en ligne gratuite

Ce dossier contient tout le site. Il n'a pas besoin de serveur à toi : il tourne sur un hébergement gratuit et enregistre les recettes dans une base gratuite (Firebase). Vous vous connectez tous les deux avec un e-mail et un mot de passe, depuis le téléphone ou l'ordinateur.

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'application (page, styles, script) |
| `firebase-config.js` | À remplir avec la configuration de ton projet Firebase (étape 4) |
| `firestore.rules` | Règle de sécurité à copier dans Firebase (étape 3) |
| `manifest.webmanifest`, `icon*.png`, `icon.svg`, `apple-touch-icon.png` | Permet d'ajouter l'app à l'écran d'accueil du téléphone |

Ne mets pas le fichier `recettes-export.json` dans le dépôt public : il contient tes recettes. Il sert seulement à l'import (étape 7).

## Ce dont tu as besoin (tout est gratuit)
- Un compte Google, pour Firebase.
- Un compte GitHub, pour héberger le site. (Alternative sans GitHub : Netlify Drop, voir l'étape 6.)
- À ma connaissance, l'offre gratuite de Firebase (« Spark ») suffit largement pour 2 personnes et quelques dizaines de recettes. Vérifie les conditions actuelles sur firebase.google.com/pricing.

## Étape 1 : créer le projet Firebase
1. Va sur https://console.firebase.google.com et connecte-toi avec ton compte Google.
2. « Ajouter un projet », donne-lui un nom (par exemple `carnet-recettes`). Tu peux désactiver Google Analytics.

## Étape 2 : activer la connexion par e-mail
1. Dans le menu de gauche : **Build > Authentication > Commencer**.
2. Onglet « Sign-in method » : active **E-mail/Mot de passe**.
3. Onglet « Users » : **Ajouter un utilisateur** pour toi, puis un second pour ta copine (e-mail et mot de passe de votre choix).
   Il n'y a pas de bouton d'inscription dans l'app : seules ces personnes pourront se connecter.

## Étape 3 : créer la base et la protéger
1. **Build > Firestore Database > Créer une base de données**. Choisis un emplacement en Europe (par exemple `eur3`) et le mode **production**.
2. Onglet **Règles**. Efface tout, colle le contenu de `firestore.rules`, remplace les deux adresses par les e-mails de l'étape 2, puis **Publier**.
   Sans cette règle, personne ne peut lire ni écrire. Avec elle, seules vos deux adresses y ont accès.

## Étape 4 : relier le site à Firebase
1. Dans Firebase, roue dentée > **Paramètres du projet** > « Vos applications » > icône **Web** (`</>`).
2. Donne un nom (par exemple `site`), ne coche pas « Firebase Hosting », puis **Enregistrer**.
3. Firebase affiche un bloc `firebaseConfig`. Recopie ses valeurs dans le fichier `firebase-config.js` à la place des `COLLE_ICI` (garde les guillemets).
   Ces valeurs ne sont pas secrètes : c'est la règle de l'étape 3 qui protège les données.

## Étape 5 : mettre le code sur GitHub
1. Sur https://github.com, crée un dépôt (bouton **New**), par exemple `carnet-recettes`. Mets-le en **Public** (GitHub Pages gratuit l'exige).
2. Dans le dépôt : **Add file > Upload files**, glisse tous les fichiers du dossier (sans `recettes-export.json`), puis **Commit changes**.
3. **Settings > Pages** : « Source » = **Deploy from a branch**, branche **main**, dossier **/ (root)**, **Save**.
4. Au bout d'une minute, l'adresse du site apparaît (de la forme `https://ton-nom.github.io/carnet-recettes/`).

## Étape 6 (alternative sans GitHub) : Netlify Drop
1. Va sur https://app.netlify.com/drop et crée un compte gratuit.
2. Glisse le dossier du site (avec `firebase-config.js` rempli) dans la zone de dépôt. Netlify te donne une adresse.

## Étape 7 : première connexion et import de tes recettes
1. Ouvre l'adresse du site, connecte-toi avec ton e-mail et ton mot de passe.
2. En bas de la page, touche **Importer** et choisis le fichier `recettes-export.json` (livré à part). Tes 25 recettes et ton panier arrivent.
3. Ta copine ouvre la même adresse et se connecte avec ses identifiants. Vous voyez les mêmes recettes en direct.

## Installer sur le téléphone
- **iPhone (Safari)** : bouton Partager > « Sur l'écran d'accueil ».
- **Android (Chrome)** : menu ⋮ > « Installer l'application » ou « Ajouter à l'écran d'accueil ».

## Sauvegarde
En bas de la page, **Exporter mes recettes** télécharge un fichier JSON de toutes les recettes et du panier. Fais-le de temps en temps. **Importer** le remet en place.

## Modifier le site plus tard
Remplace `index.html` dans le dépôt (Add file > Upload files, même nom) : le site se met à jour tout seul. Tu peux aussi me redemander des modifications, puis recoller le nouveau fichier.
