# YoMan!

**YoMan!** est une plateforme web de petites annonces **entre particuliers**, pensée pour le Burkina Faso. Elle permet à n'importe quel utilisateur de publier, consulter et contacter des vendeurs autour de lui pour acheter, vendre ou échanger biens et services — de l'immobilier aux véhicules en passant par l'agriculture, l'électronique ou la mode.

L'application est mono-page (SPA) en React, déployable comme un site statique, et s'appuie sur Firebase pour l'authentification et la base de données, ainsi que sur Cloudinary pour l'hébergement des photos.

---

## Fonctionnalités

### Authentification
- Inscription par e-mail et mot de passe (avec nom, téléphone et numéro WhatsApp).
- Connexion classique e-mail / mot de passe.
- Connexion en un clic via **Google** (OAuth popup).
- Réinitialisation de mot de passe par e-mail.
- Persistance de session via `onAuthStateChanged` de Firebase Auth.

### Publication d'annonces
- Formulaire complet : titre, catégorie, prix, ville, quantité, description.
- Marquage d'une annonce comme **Urgent** (badge animé sur la fiche).
- Upload de **jusqu'à 3 photos** par annonce via Cloudinary (la première est désignée comme photo principale).
- Modification et suppression de ses propres annonces depuis l'espace profil.

### Catégories
Onze catégories prédéfinies, chacune associée à une icône :
Immobilier, Véhicules, Électronique, Agriculture, Vêtements & Mode, Maison & Mobilier, Emploi & Services, Éducation, Alimentation, Santé & Beauté, Animaux.

### Recherche, filtres et navigation
- Barre de recherche plein-texte sur le titre et la description.
- Filtres avancés : ville (liste de villes du Burkina Faso), prix minimum, prix maximum.
- Filtre par catégorie via une grille dépliable.
- **Pagination** : 9 annonces par page.
- Onglet **Favoris** pour retrouver rapidement les annonces sauvegardées.

### Favoris
- Bouton cœur sur chaque annonce.
- La liste des favoris est synchronisée par utilisateur dans Firestore (collection `favoris`).

### Fiche annonce et contact
- Modale détaillée avec carrousel de photos (navigation gauche/droite et points indicateurs).
- Mode **plein écran** pour zoomer sur une image.
- Bouton **WhatsApp** générant un lien `wa.me` pré-rempli avec un message d'introduction et le titre de l'annonce — le contact se fait directement entre acheteur et vendeur, sans intermédiaire.

### Profil utilisateur
- Avatar avec l'initiale du nom.
- Statistiques : nombre d'annonces publiées, nombre de favoris.
- Liste des annonces personnelles avec actions (éditer / supprimer).

### Interface
- Design responsive (mobile et desktop).
- Identité visuelle dédiée : palette bleu nuit / bleu vif / or, polices Montserrat et Nunito, logo SVG sur mesure.
- Animations légères (apparitions, badges pulsants pour les annonces urgentes).

---

## Stack technique

| Couche | Technologie |
| --- | --- |
| Framework UI | React 19 |
| Build / dev server | Vite 8 |
| Authentification | Firebase Auth (e-mail + Google) |
| Base de données | Cloud Firestore |
| Hébergement d'images | Cloudinary (upload preset non signé) |
| Lint | ESLint 9 + plugins React Hooks / React Refresh |

Structure principale :

```
yoman/
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── public/
│   └── icons.svg
└── src/
    ├── main.jsx        // point d'entrée React
    ├── App.jsx         // composant racine YoMan (toute l'app)
    ├── firebase.js     // initialisation Firebase (Auth + Firestore)
    ├── index.css
    ├── App.css
    └── assets/
```

---

## Démarrage rapide

### Prérequis
- **Node.js 18+** (recommandé 20+)
- **npm** (livré avec Node) ou tout équivalent (pnpm, yarn)

### Installation

Cloner le dépôt puis, à la racine du projet :

```bash
npm install
```

### Lancer en développement

```bash
npm run dev
```

Vite démarre un serveur de développement (par défaut sur `http://localhost:5173`) avec rechargement à chaud (HMR).

### Compiler pour la production

```bash
npm run build
```

Le résultat optimisé est généré dans le dossier `dist/`.

### Prévisualiser le build de production

```bash
npm run preview
```

### Lancer le linter

```bash
npm run lint
```

---

## Configuration externe

L'application dépend de deux services tiers déjà configurés dans le code :

### Firebase
La configuration est codée en dur dans `src/firebase.js` (projet `yoman-d45bf`). Pour utiliser ton propre projet Firebase :

1. Crée un projet sur [console.firebase.google.com](https://console.firebase.google.com).
2. Active **Authentication** (méthodes E-mail/Mot de passe et Google).
3. Active **Cloud Firestore** et déploie des règles de sécurité adaptées.
4. Remplace l'objet `firebaseConfig` dans `src/firebase.js` par celui de ton projet.

Collections Firestore utilisées :
- `annonces` — toutes les annonces publiées.
- `users` — profils utilisateurs (créés à l'inscription).
- `favoris` — un document par utilisateur listant les IDs d'annonces sauvegardées.

### Cloudinary
Les constantes en haut de `src/App.jsx` :

```js
const CLOUDINARY_CLOUD_NAME    = "dw4clwa2b";
const CLOUDINARY_UPLOAD_PRESET = "yo man";
```

Pour utiliser ton propre compte Cloudinary, crée un **upload preset non signé** et remplace ces deux valeurs.

---

## Bonnes pratiques avant déploiement

- Sortir les clés Firebase et Cloudinary dans des variables d'environnement Vite (`import.meta.env.VITE_*`) plutôt que de les laisser en dur.
- Restreindre la clé API Firebase aux domaines autorisés depuis la console Google Cloud.
- Mettre en place des règles Firestore strictes (lecture publique des annonces, écriture limitée au propriétaire).
- Activer la modération côté serveur (Cloud Functions) pour les contenus signalés.

---

## Licence

Projet privé (`"private": true` dans `package.json`). Aucune licence open source n'est attachée à ce dépôt.
