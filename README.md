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

Pour un MVP simple **et** sécurisé, **tout l'accès aux données passe par le serveur** :

- La **RLS est activée** sur toutes les tables, **sans politique permissive** → la clé publique `anon` ne peut rien lire/écrire directement.
- Le serveur (Server Actions / Server Components) utilise la clé **`service role`** pour :
  - valider les entrées des formulaires avant insertion ;
  - ne renvoyer au public **que les colonnes non sensibles** (jamais les coordonnées privées d'un demandeur).
- L'authentification admin utilise la clé `anon` + cookies (`@supabase/ssr`).

> ⚠️ La clé `service role` ne doit **jamais** être exposée au navigateur. Elle n'a pas de préfixe `NEXT_PUBLIC_` et le fichier `lib/supabase/admin.ts` importe `server-only`.

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
  supabase/                  Clients : client / server / admin / middleware
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

| Variable                        | Public ?   | Description                                                                |
| ------------------------------- | ---------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅ oui     | URL du projet Supabase (ex. `https://xxxx.supabase.co`).                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ oui     | Clé publique « anon » (auth admin côté client).                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | ❌ **non** | Clé secrète « service role ». **Serveur uniquement.** Contourne la RLS.   |
| `ADMIN_EMAILS`                  | ❌ non     | Courriels admin autorisés, séparés par des virgules (ex. `you@mail.com`). |

---

## Configuration Supabase

### 1. Créer le projet

1. Sur [supabase.com](https://supabase.com), créez un nouveau projet (région **East US** ou la plus proche du Québec).
2. Notez le **mot de passe** de la base.

### 2. Créer les tables

1. Ouvrez **SQL Editor → New query**.
2. Copiez tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécutez-le (**Run**).
3. Cela crée les tables `tasks`, `workers`, `applications`, `admin_notes`, les index, le trigger `updated_at` et active la RLS.

> 💡 Pour tester rapidement, décommentez le bloc « jeu de données de démonstration » à la fin du fichier SQL.

### 3. Récupérer les clés

Dans **Project Settings → API** (et **Data API** pour l'URL) :

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- clé **`anon` / `public`** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- clé **`service_role` / `secret`** → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Créer l'utilisateur admin

1. **Authentication → Users → Add user → Create new user.**
2. Saisissez un courriel + mot de passe et cochez **Auto Confirm User** (sinon confirmez le courriel).
3. Ajoutez ce même courriel dans `ADMIN_EMAILS`.
4. Connectez-vous sur `/admin/login`.

> Seuls les comptes dont le courriel figure dans `ADMIN_EMAILS` peuvent accéder à `/admin` — un simple compte Supabase ne suffit pas.

### 5. Remplir `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_EMAILS=admin@jobdirect.ca
```

Relancez `npm run dev`.

---

## Déploiement sur Vercel

1. Poussez le code sur un dépôt GitHub/GitLab/Bitbucket.
2. Sur [vercel.com](https://vercel.com) : **Add New → Project** et importez le dépôt.
   - Framework détecté automatiquement : **Next.js**. Aucune configuration de build particulière requise.
3. Dans **Settings → Environment Variables**, ajoutez les 4 variables ci-dessus
   (pour les environnements **Production**, **Preview** et **Development**).
   - ⚠️ `SUPABASE_SERVICE_ROLE_KEY` : ne **pas** la préfixer `NEXT_PUBLIC_`.
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

- [ ] Les 4 variables d'environnement sont définies (local **et** Vercel).
- [ ] `supabase/schema.sql` a été exécuté sans erreur.
- [ ] Un utilisateur admin existe dans Supabase **et** son courriel est dans `ADMIN_EMAILS`.
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
- [ ] La clé `service role` n'apparaît **pas** dans le code client (onglet réseau / sources).

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
