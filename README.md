# JobDirect

> Publiez une tâche. Trouvez une personne disponible près de chez vous.

MVP d'une plateforme locale au Québec qui met en relation des **employeurs / particuliers** qui publient des tâches ponctuelles avec des **travailleurs journaliers** disponibles à proximité.

- 🟠 Identité orange & blanc, design inspiré d'Indeed
- 📱 Responsive, mobile-first
- ⚡ Next.js App Router + TypeScript + Tailwind CSS v4
- 🗄️ Supabase (base de données + authentification admin)
- ▲ Prêt à déployer sur Vercel

---

## Table des matières

1. [Fonctionnalités](#fonctionnalités)
2. [Stack technique](#stack-technique)
3. [Architecture](#architecture)
4. [Démarrage rapide](#démarrage-rapide)
5. [Variables d'environnement](#variables-denvironnement)
6. [Configuration Supabase](#configuration-supabase)
7. [Déploiement sur Vercel](#déploiement-sur-vercel)
8. [Checklist de test avant mise en ligne](#checklist-de-test-avant-mise-en-ligne)
9. [Évolutions prévues](#évolutions-prévues)

---

## Fonctionnalités

### Public

- **Accueil** avec proposition de valeur et deux appels à l'action.
- **Publier une tâche** : titre, description, ville, catégorie, date souhaitée, budget estimé, coordonnées.
- **Je cherche du travail** : inscription travailleur (nom, téléphone, courriel, ville, compétences, disponibilités, expérience).
- **Liste des tâches actives** avec filtres par **ville** et **catégorie**.
- **Détail d'une tâche** + formulaire **« Je suis disponible pour cette tâche »**.

### Administration (`/admin`)

- Connexion sécurisée (Supabase Auth + liste blanche de courriels).
- Tableau de bord avec statistiques.
- Voir **toutes les tâches**, **tous les travailleurs**, **toutes les candidatures**.
- Changer le **statut d'une tâche** : `pending → active → assigned → completed / cancelled`.
- Changer le **statut d'une candidature** : `new / reviewed / contacted / rejected`.
- Ajouter / supprimer des **notes internes** sur une tâche.

---

## Stack technique

| Élément          | Choix                                   |
| ---------------- | --------------------------------------- |
| Framework        | Next.js 16 (App Router, Server Actions) |
| Langage          | TypeScript                              |
| Styles           | Tailwind CSS v4                         |
| Base de données  | Supabase (PostgreSQL)                   |
| Authentification | Supabase Auth (admin uniquement)        |
| Hébergement      | Vercel                                  |

---

## Architecture

### Modèle d'accès aux données (important)

L'application n'utilise **que la clé publique** Supabase. La sécurité repose
sur la **RLS** (Row Level Security) — aucune clé secrète « service role » n'est
nécessaire (plus simple à déployer, moins de secrets à gérer).

- **Public** : insertions de formulaires autorisées par la RLS (les tâches sont
  forcées au statut `pending`). La lecture des tâches passe par la vue
  `public_tasks` qui n'expose **que les colonnes non sensibles** des tâches
  **actives** — jamais les coordonnées privées du demandeur.
- **Admin** : accès complet via la fonction SQL `is_admin()` (le courriel du JWT
  doit figurer dans la table `public.admins`), lorsqu'une session admin est
  authentifiée par Supabase Auth (clé `anon` + cookies via `@supabase/ssr`).
- Toutes les écritures passent par des **Server Actions** qui valident les
  entrées avant insertion.

> 🔒 Voir [`supabase/schema.sql`](supabase/schema.sql) pour les politiques RLS,
> la vue publique et la fonction `is_admin()`.

### Structure du projet

```
app/
  (public)/                  Pages publiques (header + footer communs)
    page.tsx                 Accueil
    publier/                 Formulaire employeur
    travailleur/             Inscription travailleur
    taches/                  Liste + filtres
    taches/[id]/             Détail + candidature
  admin/
    login/                   Connexion admin
    (panel)/                 Espace admin protégé (garde serveur)
      page.tsx               Tâches + tableau de bord
      travailleurs/          Travailleurs inscrits
      candidatures/          Candidatures reçues
components/
  ui/                        Boutons, champs, badges, alertes…
  forms/                     Formulaires (client) branchés aux Server Actions
  admin/                     Composants de l'espace admin
  site/                      Header, footer, logo
lib/
  supabase/                  Clients : client (navigateur) / server / middleware
  actions/                   Server Actions (tasks, workers, applications, admin)
  queries.ts                 Lectures de données (serveur)
  constants.ts               Villes, catégories, statuts (FR)
  types.ts, format.ts, validation.ts, auth.ts
proxy.ts                     Routing Middleware (rafraîchit la session, protège /admin)
supabase/schema.sql          Schéma SQL complet
```

---

## Démarrage rapide

> Prérequis : Node.js 20+ et un compte [Supabase](https://supabase.com) gratuit.

```bash
# 1. Installer les dépendances
npm install

# 2. Créer le fichier d'environnement
cp .env.example .env.local
# puis remplir les valeurs (voir sections ci-dessous)

# 3. Lancer le serveur de développement
npm run dev
# → http://localhost:3000
```

Avant que les pages `/taches` et `/admin` ne fonctionnent, il faut **configurer Supabase** (schéma + clés + utilisateur admin). Voir ci-dessous.

---

## Variables d'environnement

Toutes les variables sont définies dans `.env.example`.

| Variable                        | Public ? | Description                                                                |
| ------------------------------- | -------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅ oui   | URL du projet Supabase (ex. `https://xxxx.supabase.co`).                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ oui   | Clé publique « anon » / « publishable ».                                 |
| `ADMIN_EMAILS`                  | ❌ non   | Courriels admin autorisés, séparés par des virgules (ex. `you@mail.com`). |

> Aucune clé secrète « service role » n'est requise — la sécurité repose sur la RLS.

---

## Configuration Supabase

### 1. Créer le projet

1. Sur [supabase.com](https://supabase.com), créez un nouveau projet (région **East US** ou la plus proche du Québec).
2. Notez le **mot de passe** de la base.

### 2. Créer les tables

1. Ouvrez **SQL Editor → New query**.
2. Copiez tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécutez-le (**Run**).
3. Cela crée les tables, index, trigger, la **vue `public_tasks`**, la table
   `public.admins`, la fonction `is_admin()` et toutes les **politiques RLS**.

> 💡 Pour tester rapidement, décommentez le bloc « jeu de données de démonstration » à la fin du fichier SQL.

### 3. Récupérer les clés

Dans **Project Settings → API** (et **Data API** pour l'URL) :

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- clé **`anon` / `public`** (ou **`publishable`**) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Créer l'utilisateur admin

1. **Authentication → Users → Add user → Create new user.**
2. Saisissez un courriel + mot de passe et cochez **Auto Confirm User** (sinon confirmez le courriel).
3. Déclarez cet admin dans la base :
   ```sql
   insert into public.admins (email) values ('votre@courriel.com') on conflict do nothing;
   ```
4. Ajoutez ce même courriel dans `ADMIN_EMAILS` (`.env.local`).
5. Connectez-vous sur `/admin/login`.

> Un admin doit figurer **à la fois** dans Supabase Auth, dans la table
> `public.admins` (autorisation RLS) et dans `ADMIN_EMAILS` (garde applicative).

### 5. Remplir `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ADMIN_EMAILS=admin@jobdirect.ca
```

Relancez `npm run dev`.

---

## Déploiement sur Vercel

1. Poussez le code sur un dépôt GitHub/GitLab/Bitbucket.
2. Sur [vercel.com](https://vercel.com) : **Add New → Project** et importez le dépôt.
   - Framework détecté automatiquement : **Next.js**. Aucune configuration de build particulière requise.
3. Dans **Settings → Environment Variables**, ajoutez les 3 variables ci-dessus
   (pour les environnements **Production**, **Preview** et **Development**).
4. **Deploy**.
5. (Optionnel) **Settings → Domains** : branchez votre domaine (ex. `jobdirect.ca`)
   et mettez à jour `metadataBase` dans `app/layout.tsx`.

Alternative en ligne de commande :

```bash
npm i -g vercel
vercel            # déploiement preview
vercel --prod     # déploiement production
```

> Astuce : `vercel env pull .env.local` synchronise les variables depuis Vercel vers votre machine.

---

## Checklist de test avant mise en ligne

### Configuration

- [ ] Les 3 variables d'environnement sont définies (local **et** Vercel).
- [ ] `supabase/schema.sql` a été exécuté sans erreur.
- [ ] L'admin existe dans Supabase Auth, dans `public.admins` **et** dans `ADMIN_EMAILS`.
- [ ] `npm run build` réussit sans erreur ni avertissement.

### Parcours public

- [ ] L'accueil s'affiche avec les deux boutons (Publier / Je cherche du travail).
- [ ] **Publier une tâche** : la soumission affiche le message de confirmation.
- [ ] La tâche soumise apparaît dans l'admin au statut **« En attente »** (pas encore publique).
- [ ] **Je cherche du travail** : l'inscription fonctionne et le travailleur apparaît dans l'admin.
- [ ] La page **/taches** liste uniquement les tâches **actives**.
- [ ] Les **filtres** ville/catégorie mettent la liste à jour.
- [ ] Le **détail** d'une tâche s'affiche **sans** les coordonnées privées du demandeur.
- [ ] **« Je suis disponible »** crée une candidature visible dans l'admin.
- [ ] La validation des formulaires fonctionne (courriel/téléphone invalides, champs requis).
- [ ] Une URL de tâche non active / inexistante renvoie la page 404.

### Espace admin

- [ ] `/admin` redirige vers `/admin/login` si non connecté.
- [ ] Un compte hors `ADMIN_EMAILS` est refusé.
- [ ] Changer une tâche en **« Active »** la rend visible sur `/taches`.
- [ ] Les autres statuts (assignée, terminée, annulée) la retirent de la liste publique.
- [ ] Changer le statut d'une candidature fonctionne.
- [ ] Ajouter / supprimer une note interne fonctionne.
- [ ] La **déconnexion** ramène à la page de login.

### Responsive & qualité

- [ ] Affichage correct sur mobile (menu, formulaires, cartes).
- [ ] Aucune erreur dans la console du navigateur.
- [ ] Avec la clé publique seule, impossible de lire la table `tasks` (coordonnées privées protégées par la RLS).

---

## Évolutions prévues

L'architecture est pensée pour accueillir, sans refonte majeure :

- **Paiements Stripe** : ajouter une table `payments` + des Server Actions ; le flux tâche → candidature → assignation est déjà en place.
- **Vérification d'identité** : colonnes `verified` / table `verifications` côté `workers`, plus un fournisseur (Stripe Identity, Veriff…).
- **Notifications WhatsApp / courriel** : déclencher depuis les Server Actions existantes (`createApplication`, `updateTaskStatus`) via un service (Twilio, Resend) ou des **Vercel Queues / Cron**.
- **Abonnements** : modèle de plans + restrictions d'accès, en s'appuyant sur la même couche d'authentification.
- **Comptes travailleurs/employeurs** : Supabase Auth est déjà intégré ; il suffit d'étendre les rôles et d'ajouter des politiques RLS dédiées.

---

Fait au Québec. 🍁
