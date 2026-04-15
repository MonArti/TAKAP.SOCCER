# Takap.Soccer — Rapport projet & mode d’emploi

Ce document récapitule les **outils**, **liens**, **comptes** et **étapes** pour développer et faire tourner l’application.  
**Important :** ne jamais écrire tes **mots de passe** ni tes **clés secrètes** dans un fichier versionné ou partagé publiquement. Garde-les dans un **gestionnaire de mots de passe** ou uniquement dans **Supabase / Vercel / `.env` local**.

---

## 1. Vue d’ensemble

| Élément | Rôle |
|--------|------|
| **Application web** | React 19 + TypeScript + Vite + Tailwind — liste de matchs, inscription, profils, notes |
| **Backend / données** | Supabase (PostgreSQL, Auth, RLS) |
| **Hébergement du site** | Vercel (ou équivalent) |
| **Code source** | Dépôt Git (ex. GitHub) |

---

## 2. Comptes et liens utiles (à compléter chez toi)

Remplace les exemples par **tes** URLs réelles. Ne partage pas tes mots de passe.

| Service | À quoi ça sert | Lien typique |
|--------|----------------|--------------|
| **GitHub** (ou autre Git) | Stockage du code, déploiement Vercel | `https://github.com/TON_UTILISATEUR/TON_DEPOT` |
| **Vercel** | Site public (HTTPS) | `https://ton-projet.vercel.app` + [dashboard Vercel](https://vercel.com) |
| **Supabase** | Base de données + authentification | [supabase.com](https://supabase.com) → ton projet |

**Mots de passe :** tu utilises les identifiants **de chaque service** (email + mot de passe GitHub, etc.). Pour `git push` en HTTPS, GitHub utilise souvent un **Personal Access Token** à la place du mot de passe — ce token est **secret** (comme un mot de passe).

---

## 3. Secrets techniques (sans valeurs dans ce fichier)

Ces **noms** de variables sont utilisés par l’app. Les **valeurs** viennent du dashboard Supabase (**Settings → API**).

| Où | Variable | Contenu attendu |
|----|----------|------------------|
| Fichier local **`.env`** (non versionné) | `VITE_SUPABASE_URL` | URL du projet, ex. `https://xxxx.supabase.co` |
| Idem | `VITE_SUPABASE_ANON_KEY` | Clé **anon** / **publishable** (publique côté navigateur) |
| **Vercel** → Environment Variables | Mêmes noms | **Exactement** les mêmes paires clé/valeur, puis **Redeploy** |

**À ne jamais mettre dans le front ou sur GitHub :** la clé **service_role** Supabase (droits admin, contourne la RLS).

---

## 4. Structure du dépôt (local)

```
takap-soccer/
├── src/                 # Application React
├── public/              # Fichiers statiques (favicon)
├── supabase/            # SQL : schéma, correctifs RLS, RPC
│   ├── schema.sql       # Schéma complet (nouvelle base)
│   ├── fix_rls_recursion.sql
│   ├── fix_matchs_insert_select.sql
│   └── fix_matchs_create_rpc.sql
├── .env                 # Tes secrets locaux (créé par toi, ignoré par Git)
├── .env.example         # Modèle sans secrets
├── vercel.json          # Réécritures SPA pour Vercel
├── netlify.toml         # Option Netlify
└── package.json
```

---

## 5. Base de données Supabase

1. **Première installation :** dans le dashboard Supabase → **SQL Editor** → exécuter le contenu de `supabase/schema.sql` (sur un projet vide ou après sauvegarde).
2. **Si tu as déjà appliqué une ancienne version :** exécuter dans l’ordre les scripts de correctif fournis (récurse RLS, insert match, RPC `create_match`) selon les erreurs rencontrées à l’époque.
3. **Création de match :** l’app utilise la fonction RPC **`create_match`** (évite certains blocages RLS côté client).

**Fichiers SQL dans le repo :** servent de **référence** et de **migration manuelle** ; l’app ne les exécute pas toute seule.

---

## 6. Configuration Auth (indispensable pour les testeurs)

Dans Supabase → **Authentication** → **URL Configuration** :

- **Site URL** : URL **publique** du site, ex. `https://ton-projet.vercel.app`  
- **Redirect URLs** : au minimum  
  - `https://ton-projet.vercel.app`  
  - `https://ton-projet.vercel.app/**`  
  - (optionnel pour le dev) `http://localhost:5173/**`

Si **Site URL** reste sur **localhost**, les liens e-mail ou certaines redirections envoient vers une machine locale → **site inaccessible** pour les autres.

L’inscription envoie **`emailRedirectTo`** vers l’origine de la page (Vercel ou local) ; les URLs ci-dessus doivent être **autorisées** dans Supabase.

---

## 7. Développement en local

Prérequis : **Node.js** (LTS), **npm**, **Git**.

```bash
cd chemin/vers/takap-soccer
cp .env.example .env
# Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env
npm install
npm run dev
```

Ouvre l’URL affichée (souvent `http://localhost:5173`). Le terminal doit rester ouvert **tant que tu développes en local**.

---

## 8. Build de production (vérification)

```bash
npm run build
```

Le dossier **`dist/`** contient le site statique (ignoré par Git sauf build local).

---

## 9. Mise en ligne (Vercel + Git)

1. Pousser le code sur GitHub : `git add` / `commit` / `push`.
2. Sur [vercel.com](https://vercel.com) : importer le dépôt, framework **Vite**, build `npm run build`, sortie **`dist`**.
3. Ajouter les variables **`VITE_SUPABASE_URL`** et **`VITE_SUPABASE_ANON_KEY`** (voir §3), puis **Redeploy**.
4. Mettre à jour **Site URL** et **Redirect URLs** dans Supabase (§6).

Le site en ligne **ne dépend pas** de ton PC une fois déployé.

---

## 10. Dépannage rapide

| Symptôme | Piste |
|----------|--------|
| Page blanche sur Vercel | Variables `VITE_*` absentes ou mauvais noms → Vercel → Redeploy après correction |
| Récursion RLS / erreur policies | Scripts `fix_rls_recursion.sql` (déjà intégré dans `schema.sql` pour les nouvelles installs) |
| Création de match refusée | Vérifier RPC `create_match` + policies ; exécuter `fix_matchs_create_rpc.sql` si besoin |
| Redirection vers `localhost` après e-mail | Corriger **Site URL** et **Redirect URLs** Supabase (§6) |
| `git` non reconnu | Installer [Git for Windows](https://git-scm.com/download/win), redémarrer le terminal |

---

## 11. Sécurité — bonnes pratiques

- Ne **commite** jamais **`.env`** (déjà dans `.gitignore`).
- Ne publie **ni** token GitHub **ni** clé **service_role** Supabase.
- Si une clé a fuité : **la régénérer** dans le dashboard concerné et mettre à jour Vercel / `.env`.
- Pour les testeurs : envoyer uniquement le **lien Vercel**, pas tes mots de passe.

---

## 12. Résumé « mode d’emploi » express

1. **Modifier le code** → tester en local (`npm run dev` + `.env`).  
2. **Valider** avec `npm run build`.  
3. **Pousser** sur GitHub → Vercel redéploie (ou déclencher un Redeploy).  
4. **Supabase** : schéma à jour, Auth URLs = domaine Vercel, utilisateurs visibles dans **Authentication → Users**.  
5. **Support testeurs** : lien HTTPS Vercel + compte créé sur **Inscription** (ou compte existant + **Connexion**).

---

*Document généré pour le projet Takap.Soccer — à adapter avec tes URLs et à conserver hors du dépôt public si tu y ajoutes des notes personnelles sensibles.*
