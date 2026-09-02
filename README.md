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
7. [Connexion Google / Apple](#connexion-google--apple)
8. [Paiements Stripe](#paiements-stripe)
9. [Déploiement sur Vercel](#déploiement-sur-vercel)
10. [Checklist de test avant mise en ligne](#checklist-de-test-avant-mise-en-ligne)
11. [Évolutions prévues](#évolutions-prévues)

---

## Fonctionnalités

### Public

- **Accueil** avec proposition de valeur et deux appels à l'action.
- **Publier une tâche** : titre, description, ville, catégorie, date souhaitée, budget estimé, coordonnées.
- **Je cherche du travail** : inscription travailleur (nom, téléphone, courriel, ville, compétences, disponibilités, expérience).
- **Liste des tâches actives** avec filtres par **ville** et **catégorie**.
- **Détail d'une tâche** + formulaire **« Je suis disponible pour cette tâche »**.
- **Répertoire des travailleurs** (`/embaucher`) : profils anonymisés
  (« Prénom N. », jamais les coordonnées) + **demande de mise en relation**.
- **Paiement en ligne** des frais de mise en relation (Stripe), encaissés
  **avant** la mise en contact — voir [Paiements Stripe](#paiements-stripe).

### Comptes utilisateurs (optionnels)

Les formulaires publics fonctionnent **sans compte**, mais un compte améliore l'expérience :

- **Inscription** (`/inscription`) en tant qu'**employeur** ou **travailleur** ; **connexion** (`/connexion`).
- **Connexion Google / Apple** (OAuth) — voir [Connexion Google / Apple](#connexion-google--apple).
- Le profil est créé automatiquement à l'inscription (trigger SQL) et pré-remplit les formulaires.
- **Tableau de bord** (`/mon-compte`) :
  - *Employeur* : ses tâches publiées + les candidatures reçues (coordonnées incluses).
  - *Travailleur* : ses candidatures envoyées + édition de son profil (compétences, disponibilités…).
- Les tâches/candidatures soumises en étant connecté sont **reliées au compte** (`user_id`).

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
| Authentification | Supabase Auth (admin + comptes employeur/travailleur) |
| Paiements        | Stripe Checkout + webhook (optionnel)   |
| Hébergement      | Vercel                                  |

---

## Architecture

### Modèle d'accès aux données (important)

L'application n'utilise **que la clé publique** Supabase. La sécurité repose
sur la **RLS** (Row Level Security) — aucune clé secrète « service role » n'est
nécessaire (plus simple à déployer, moins de secrets à gérer).

> **Une seule exception : les paiements.** Un webhook Stripe arrive sans cookie
> ni session, donc aucune politique RLS ne peut l'autoriser. La clé
> `SUPABASE_SERVICE_ROLE_KEY` est donc requise **uniquement si vous activez
> Stripe**, et n'est lue que par `lib/supabase/admin.ts` (webhook + création de
> session de paiement). Sans Stripe, rien ne change.

- **Public** : insertions de formulaires autorisées par la RLS (les tâches sont
  forcées au statut `pending`). La lecture des tâches passe par la vue
  `public_tasks` qui n'expose **que les colonnes non sensibles** des tâches
  **actives** — jamais les coordonnées privées du demandeur.
- **Admin** : accès complet via la fonction SQL `is_admin()` (le courriel du JWT
  doit figurer dans la table `public.admins`), lorsqu'une session admin est
  authentifiée par Supabase Auth (clé `anon` + cookies via `@supabase/ssr`).
- **Travailleurs** : la vue `public_workers` n'expose qu'un nom abrégé
  (« Marc T. ») — jamais le téléphone ni le courriel. Les coordonnées ne
  circulent que par la mise en relation, qui est le service facturé. Chaque
  travailleur garde un **droit de retrait** (`is_public`, réglable depuis le
  formulaire d'inscription et depuis `/mon-compte`) : décoché, son profil
  disparaît du répertoire.
- **Paiements** : la table `payments` est invisible au public. Une demande de
  mise en relation ne peut **pas** être insérée en se déclarant payée : seul le
  webhook Stripe (clé service role) fait passer un paiement à « payé », et un
  trigger SQL propage l'encaissement vers la demande ou la commission.
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
    travailleur/             Inscription travailleur (sans compte)
    taches/                  Liste + filtres
    taches/[id]/             Détail + candidature
    embaucher/               Répertoire des travailleurs (profils anonymisés)
    embaucher/[id]/          Profil + demande de mise en relation (payante)
    embaucher/merci/         Retour Stripe (frais de mise en relation)
    merci-paiement/          Retour Stripe (commission de tâche)
    inscription/             Création de compte (employeur / travailleur)
    connexion/               Connexion utilisateur
    mon-compte/              Tableau de bord (protégé)
  api/
    stripe/webhook/          Webhook Stripe (confirme les encaissements)
  admin/
    login/                   Connexion admin
    (panel)/                 Espace admin protégé (garde serveur)
      page.tsx               Tâches + tableau de bord
      travailleurs/          Travailleurs inscrits
      candidatures/          Candidatures reçues
components/
  ui/                        Boutons, champs, badges, alertes…
  forms/                     Formulaires (client) branchés aux Server Actions
  auth/                      Formulaires d'inscription / connexion
  account/                   Tableaux de bord employeur & travailleur, profil
  admin/                     Composants de l'espace admin
  site/                      Header (auth-aware), footer, logo, menu compte
lib/
  supabase/                  Clients : client (navigateur) / server / middleware / admin
  actions/                   Server Actions (tasks, workers, applications, auth, profile, admin, payments)
  stripe.ts, payments.ts     Configuration Stripe + création des sessions de paiement
  queries.ts                 Lectures de données (serveur)
  constants.ts               Villes, catégories, statuts (FR)
  types.ts, format.ts, validation.ts, auth.ts, useFormValidation.ts
proxy.ts                     Routing Middleware (sessions ; protège /admin et /mon-compte)
supabase/schema.sql          Schéma SQL complet (installation neuve)
supabase/migrations/         Migrations pour faire évoluer une base existante
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

Les suivantes sont **optionnelles** : elles activent le paiement par carte.
Sans elles, l'encaissement reste manuel (Interac) et rien d'autre ne change.

| Variable                        | Public ? | Description                                                                |
| ------------------------------- | -------- | -------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`             | ❌ non   | Clé secrète Stripe (`sk_...`).                                             |
| `STRIPE_WEBHOOK_SECRET`         | ❌ non   | Secret de signature du webhook (`whsec_...`).                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | ❌ non   | Clé service role — **requise seulement pour Stripe** (voir plus haut).      |
| `CONNECTION_FEE_CAD`            | ❌ non   | Frais de mise en relation en dollars (défaut : `24`).                      |
| `NEXT_PUBLIC_SITE_URL`          | ✅ oui   | URL publique du site (retours Stripe). Déduite automatiquement sur Vercel. |

> Hors Stripe, aucune clé secrète « service role » n'est requise — la sécurité
> repose sur la RLS.

---

## Configuration Supabase

### 1. Créer le projet

1. Sur [supabase.com](https://supabase.com), créez un nouveau projet (région **East US** ou la plus proche du Québec).
2. Notez le **mot de passe** de la base.

### 2. Créer les tables

> **Base neuve ou base existante ?**
> `schema.sql` **installe** un schéma neuf. Ses `create table if not exists`
> laissent intacte une table déjà présente, même si ses colonnes ont changé :
> ce n'est donc **pas** un outil de mise à jour. Pour une base déjà déployée,
> appliquez les fichiers de [`supabase/migrations/`](supabase/migrations) dans
> l'ordre chronologique — eux utilisent des `alter table ... add column if not
> exists` et sont rejouables sans risque.

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

## Connexion Google / Apple

Les boutons apparaissent sur `/connexion` et `/inscription`. Ils ne
fonctionnent qu'une fois le fournisseur **activé dans Supabase** ; tant qu'il
ne l'est pas, le bouton renvoie un message d'erreur explicite et la connexion
par mot de passe reste disponible.

### Le piège du rôle

Google et Apple transmettent un nom et un courriel, **jamais** le rôle métier
(employeur ou travailleur). Sans garde-fou, un employeur arrivant par Google
se retrouverait avec le tableau de bord travailleur sans s'en apercevoir.

La colonne `profiles.role_confirmed` distingue un rôle **choisi** d'un rôle
**deviné** :

- inscription par mot de passe → rôle explicite, `role_confirmed = true` ;
- inscription Google/Apple depuis `/inscription` → le rôle sélectionné voyage
  dans l'URL de retour et n'est appliqué **que** si le compte n'a pas déjà un
  rôle confirmé ;
- connexion Google/Apple sans rôle → `role_confirmed = false`, et
  `/mon-compte` affiche un sélecteur avant tout le reste.

Un compte existant ne voit **jamais** son rôle réécrit, même si l'URL en
contient un.

### Configuration Supabase

1. **Authentication → Providers** : activez **Google** (et/ou **Apple**), en
   collant le *Client ID* et le *Client Secret* du fournisseur.
2. **Authentication → URL Configuration** :
   - *Site URL* : `https://jobdirectquebec.com`
   - *Redirect URLs* : ajoutez `https://jobdirectquebec.com/auth/callback`
     et, pour le développement, `http://localhost:3000/auth/callback`.
3. Côté fournisseur, l'URI de redirection autorisée est celle de **Supabase** :
   `https://<votre-projet>.supabase.co/auth/v1/callback`.

### Google ou Apple ?

| | Google | Apple |
| --- | --- | --- |
| Coût | gratuit | **99 USD/an** (Apple Developer Program) |
| Mise en place | Google Cloud Console, ~15 min | certificat + Service ID, plus long |
| Couverture au Québec | très large (Android, Gmail) | utilisateurs iPhone |

**Commencez par Google** : gratuit et couvre le plus de monde. Apple devient
pertinent surtout si vous publiez une application iOS — l'App Store l'exige
alors dès qu'un autre fournisseur social est proposé.

---

## Paiements Stripe

Stripe est **optionnel**. Sans clés, l'application se comporte exactement comme
avant (encaissement manuel par Interac). Dès que les clés sont présentes, le
paiement par carte s'active tout seul.

### Pourquoi encaisser d'avance

La commission facturée *après* la mise en relation n'est presque jamais payée :
une fois les deux numéros échangés, le levier a disparu. Le paiement en ligne
inverse l'ordre — **le client paie, puis vous livrez la mise en relation** — et
la promesse « remboursé si nous ne trouvons personne » rend l'avance acceptable.

### Les deux flux

| Flux | Déclencheur | Montant |
| ---- | ----------- | ------- |
| **Frais de mise en relation** | Le client demande un travailleur sur `/embaucher/[id]` | `CONNECTION_FEE_CAD` (défaut 24 $) |
| **Commission de tâche** | L'admin crée un lien de paiement depuis **Opérations → Commissions** | Montant de la commission (max de 10 % du budget et 15 $) |

Dans les deux cas, seul le **webhook** marque l'encaissement ; un trigger SQL
met ensuite à jour la demande ou la commission. Le navigateur ne peut jamais se
déclarer payé.

### Configuration

1. **Clés API** — Stripe → *Développeurs → Clés API* → copiez la clé secrète
   dans `STRIPE_SECRET_KEY`.
2. **Webhook** — Stripe → *Développeurs → Webhooks → Add endpoint* :
   - URL : `https://<votre-domaine>/api/stripe/webhook`
   - Événements : `checkout.session.completed`,
     `checkout.session.async_payment_succeeded`, `charge.refunded`
   - Copiez le *Signing secret* dans `STRIPE_WEBHOOK_SECRET`.
3. **Clé service role** — Supabase → *Project Settings → API Keys → service_role*
   → `SUPABASE_SERVICE_ROLE_KEY`. ⚠️ Jamais de préfixe `NEXT_PUBLIC_`.
4. **URL du site** — `NEXT_PUBLIC_SITE_URL` en local ; déduite automatiquement
   sur Vercel.

### Tester en local

```bash
# Terminal 1
npm run dev

# Terminal 2 — redirige les événements Stripe vers votre machine
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copiez le « whsec_... » affiché dans STRIPE_WEBHOOK_SECRET, puis relancez npm run dev
```

Payez avec la carte de test `4242 4242 4242 4242` (date future, CVC libre).

### Taxes (TPS/TVQ)

Les montants sont facturés **sans taxes**. Dès votre inscription aux fichiers
TPS/TVQ (obligatoire au-delà de 30 000 $ de revenus sur quatre trimestres),
activez **Stripe Tax** et passez `automatic_tax: { enabled: true }` dans
`lib/payments.ts` et `lib/actions/payments.ts`.

### Vérifier la configuration d'un déploiement

Vercel **fige les variables d'environnement dans chaque déploiement** : une
variable ajoutée après coup, ou enregistrée pour « Preview » seulement, reste
invisible en production — sans aucun signal.

Connecté à `/admin`, ouvrez **`/api/diagnostic`** (lien aussi présent en haut
de la page Opérations). La réponse indique quelles variables ce déploiement
voit réellement, si la clé service role est acceptée par Supabase, et si
Stripe tourne en mode `test` ou `live`.

La route ne renvoie **jamais** la valeur d'un secret — uniquement des booléens
de présence et le mode Stripe — et répond 404 à qui n'est pas administrateur.

Sonde publique complémentaire, sans authentification :

```bash
curl -X POST https://<votre-domaine>/api/stripe/webhook -d '{}'
# 400 « Signature manquante » -> les clés sont lues
# 503 « Stripe non configuré » -> il en manque au moins une
```

### Rembourser

Depuis le tableau de bord Stripe (*Paiements → Rembourser*). L'événement
`charge.refunded` remet automatiquement la demande en « non payée » et la
commission en « à encaisser ».

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

- [ ] Les 3 variables d'environnement de base sont définies (local **et** Vercel).
- [ ] *(Stripe)* `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et
      `SUPABASE_SERVICE_ROLE_KEY` sont définies, et l'endpoint webhook pointe
      sur `/api/stripe/webhook`.
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
- [ ] La page **/embaucher** liste des travailleurs (« Prénom N. », sans coordonnées).
- [ ] *(OAuth)* La connexion Google aboutit sur `/mon-compte` ; un compte neuf
      voit le **sélecteur de rôle**, et le choix persiste après rechargement.
- [ ] Une **demande de mise en relation** apparaît dans Admin → Opérations.
- [ ] *(Stripe)* Le paiement de test aboutit sur `/embaucher/merci`, et la
      demande passe **« Payé »** dans Opérations (preuve que le webhook arrive).
- [ ] *(Stripe)* Un **lien de paiement de commission** marque la commission
      « Payée » automatiquement après règlement.
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
- [ ] Idem pour `connection_requests` et `payments` (invisibles au public).

---

## Évolutions prévues

✅ **Paiements Stripe** — livré (voir [Paiements Stripe](#paiements-stripe)).

L'architecture est pensée pour accueillir, sans refonte majeure :

- **Vérification d'identité** : colonnes `verified` / table `verifications` côté `workers`, plus un fournisseur (Stripe Identity, Veriff…).
- **Notifications WhatsApp / courriel** : déclencher depuis les Server Actions existantes (`createApplication`, `updateTaskStatus`) via un service (Twilio, Resend) ou des **Vercel Queues / Cron**.
- **Abonnements** : modèle de plans + restrictions d'accès, en s'appuyant sur la même couche d'authentification.
- **Comptes travailleurs/employeurs** : Supabase Auth est déjà intégré ; il suffit d'étendre les rôles et d'ajouter des politiques RLS dédiées.

---

Fait au Québec. 🍁
