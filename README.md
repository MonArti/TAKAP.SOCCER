# Takap.Soccer

Application web **React + Vite + Tailwind CSS v4** avec **Supabase** (Auth, Postgres, RLS) pour organiser des matchs entre joueurs.

## Prérequis

- Node.js 20+ recommandé
- Un projet [Supabase](https://supabase.com/) (gratuit)

## 1. Base de données Supabase

1. Crée un projet sur [supabase.com](https://supabase.com/).
2. Va dans **SQL Editor** → **New query**.
3. Copie-colle tout le fichier `supabase/schema.sql` puis exécute **Run**.

Cela crée les tables `profiles`, `matchs`, `participations`, `notes`, les politiques RLS, les triggers (profil à l’inscription, note moyenne, compteur de matchs terminés) et les énumérations nécessaires.

4. **Authentication** → **Providers** : active **Email** (mot de passe).
5. Pour tester sans email de confirmation : **Authentication** → **Providers** → **Email** → désactive *Confirm email* (à réactiver en production).

## 2. Variables d’environnement

À la racine du projet :

```bash
copy .env.example .env
```

Renseigne dans `.env` les valeurs **Project URL** et **anon public** key (menu **Settings** → **API** du dashboard Supabase).

## 3. Installation et lancement

```bash
cd takap-soccer
npm install
npm run dev
```

Ouvre l’URL affichée (souvent `http://localhost:5173`).

## Fonctionnalités V1

- Inscription / connexion email + mot de passe (pseudo transmis en métadonnée pour le profil).
- Profil : pseudo, âge, taille, poids ; note moyenne et nombre de matchs (mis à jour côté base).
- Création d’un match : date, heure, lieu, prix, nombre max de joueurs (défaut 10).
- Liste publique des matchs **ouverts** avec places restantes.
- Réservation d’une place (sans paiement réel, champ `a_paye` à `false`).
- L’organisateur voit les inscrits et peut cliquer **Match terminé** à partir du **jour du match** (date prévue).
- Après clôture : chaque inscrit peut noter les **autres** sur 5 étoiles (une note par paire donneur/receveur/match).
- Fiche joueur publique : moyenne des notes reçues, nombre de matchs joués.

## Scripts npm

| Commande        | Description        |
|----------------|--------------------|
| `npm run dev`  | Serveur de dev     |
| `npm run build`| Build production   |
| `npm run preview` | Prévisualiser le build |

## Structure des dossiers

- `src/components` — UI réutilisable (layout, boutons, étoiles).
- `src/contexts` — authentification Supabase.
- `src/lib` — client Supabase, formatage.
- `src/pages` — écrans (liste, détail match, profil, etc.).
- `src/types` — types TypeScript alignés sur la base.
- `supabase/schema.sql` — schéma à exécuter dans le dashboard.

## Licence

Projet exemple pour usage personnel ou apprentissage.
