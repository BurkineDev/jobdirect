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
9. [Modération & publication instantanée](#modération--publication-instantanée)
10. [Déploiement sur Vercel](#déploiement-sur-vercel)
11. [Checklist de test avant mise en ligne](#checklist-de-test-avant-mise-en-ligne)
12. [Évolutions prévues](#évolutions-prévues)

---

## Fonctionnalités

### Public

- **Accueil** avec proposition de valeur et deux appels à l'action.
- **Publier une tâche** : titre, description, ville, catégorie, date souhaitée, budget estimé, coordonnées.
  La tâche est **publiée instantanément** si la modération automatique ne
  relève rien — voir [Modération & publication instantanée](#modération--publication-instantanée).
- **Je cherche du travail** : inscription travailleur (nom, téléphone, courriel, ville, compétences, disponibilités, expérience).
- **Liste des tâches actives** avec filtres par **ville** et **catégorie**.
- **Détail d'une tâche** + formulaire **« Je suis disponible pour cette tâche »**.
- **Répertoire des travailleurs** (`/embaucher`) : profils anonymisés
  (« Prénom N. », jamais les coordonnées) + **demande de mise en relation**.
- **Paiement en ligne** des frais de mise en relation (Stripe), encaissés
  **avant** la mise en contact — voir [Paiements Stripe](#paiements-stripe).

### Référencement (SEO local)

Le canal d'acquisition le moins cher d'un marché local. Tout est généré à
partir des données réelles — aucun contenu inventé :

- **126 pages « service × ville »** (`/services/[slug]`, ex.
  `/services/demenagement-montreal`) : une URL par couple catégorie × ville,
  avec les tâches ouvertes du moment, le nombre de personnes inscrites dans la
  ville et le budget médian **observé** (affiché seulement au-delà de trois
  budgets renseignés, pour ne jamais annoncer un faux prix de marché).
- **Plan des services** (`/services`) : hub de maillage interne.
- **`sitemap.xml`** et **`robots.txt`** générés (149 URL), espaces
  authentifiés et pages de remerciement exclus de l'indexation.
- **Données structurées** : `JobPosting` sur chaque tâche (éligibilité à
  **Google Jobs**, distribution gratuite), plus `Organization`, `WebSite`,
  `Service`, `BreadcrumbList` et `CollectionPage`.
- **Signaux de liquidité** : compteurs réels de travailleurs et de tâches sur
  l'accueil, les pages de service et le formulaire travailleur — masqués
  quand ils vaudraient zéro.

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

> **Deux exceptions, toutes deux serveur.** (1) Un webhook Stripe arrive sans
> cookie ni session : aucune politique RLS ne peut l'autoriser. (2) La
> publication instantanée d'une tâche doit écrire `status = 'active'`, ce que
> la politique d'insertion publique interdit précisément pour qu'une clé anon
> volée ne puisse rien publier. La clé `SUPABASE_SERVICE_ROLE_KEY` couvre ces
> deux cas et n'est lue que par `lib/supabase/admin.ts`. Sans elle, Stripe et
> la publication instantanée restent inactifs — et rien d'autre ne change.

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
- **Modération** : tout texte destiné à devenir public (description d'une
  tâche, compétences d'un travailleur) traverse `lib/moderation.ts`, qui
  masque numéros, courriels, liens et identifiants sociaux. C'est ce qui
  protège le modèle d'affaires : une coordonnée publiée rendrait la mise en
  relation — le seul service facturé — sans valeur.
- **Anti-spam** : les formulaires publics passent par la fonction SQL
  `claim_submission_slot` (quota par courriel et par heure). La table
  `submission_log` qu'elle alimente n'a **aucune politique RLS** : elle est
  donc illisible, même avec la clé anon.
- Toutes les écritures passent par des **Server Actions** qui valident les
  entrées avant insertion.
- **Lectures publiques mises en cache** : `lib/market.ts` lit les vues
  publiques via un client anon **sans cookie** (`lib/supabase/public.ts`),
  seule façon de les envelopper dans `unstable_cache`. Le tag `market` purge
  l'ensemble dès qu'une tâche est activée ou qu'un profil change.

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
    services/                Plan des services (hub SEO)
    services/[slug]/         Page « service × ville » (126 pages)
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
  supabase/                  Clients : client (navigateur) / server / middleware / admin / public
  actions/                   Server Actions (tasks, workers, applications, auth, profile, admin, payments)
  stripe.ts, payments.ts     Configuration Stripe + création des sessions de paiement
  moderation.ts              Masquage des coordonnées dans les textes publics
  submissions.ts             Garde anti-spam + promotion d'une tâche en « active »
  seo.ts                     Slugs « service × ville », copie FR, données structurées
  market.ts                  Lectures publiques mises en cache (compteurs, pages service)
  queries.ts                 Lectures de données (serveur)
  constants.ts               Villes, catégories, statuts (FR)
  types.ts, format.ts, validation.ts, auth.ts, useFormValidation.ts
  robots.ts                  robots.txt généré
  sitemap.ts                 sitemap.xml généré (pages fixes + services + tâches)
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
| `SUPABASE_SERVICE_ROLE_KEY`     | ❌ non   | Clé service role — requise pour **Stripe** *et* pour la **publication instantanée** des tâches (voir plus bas). |
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

### « La connexion Google me renvoie sur localhost:3000 »

C'est le symptôme le plus courant, et la cause est **côté Supabase**, pas
dans le code : quand Supabase reçoit une URL de retour qui ne figure **pas**
dans sa liste blanche, il l'ignore *silencieusement* et renvoie le visiteur
vers le **Site URL** configuré. Si ce Site URL est resté sur
`http://localhost:3000`, tout le monde atterrit sur localhost.

**Vérifiez, dans cet ordre :**

1. **Supabase → Authentication → URL Configuration**
   - *Site URL* doit être `https://jobdirectquebec.com` (et **non** localhost).
   - *Redirect URLs* doit contenir **exactement** :
     ```
     https://jobdirectquebec.com/auth/callback
     http://localhost:3000/auth/callback
     https://*.vercel.app/auth/callback
     ```
     La troisième ligne est ce qui fait fonctionner la connexion sur les
     déploiements de prévisualisation.
2. **Le diagnostic de l'application** : connecté à `/admin`, ouvrez
   `/api/diagnostic` et comparez `redirections.urlCanonique` (figée, pour le
   SEO) et `redirections.origineDeCetteRequete` (celle utilisée pour les
   retours). Si la seconde est correcte et que Google renvoie quand même
   ailleurs, le problème est bien au point 1.

> **Côté code, l'URL de retour ne dépend plus d'une variable
> d'environnement.** Elle est désormais lue sur la requête réelle
> (`requestSiteUrl()` dans [`lib/site.ts`](lib/site.ts)), filtrée par une
> liste blanche d'hôtes — indispensable car l'en-tête `Host` est contrôlable
> par le client, et une URL de retour OAuth détournée livrerait le code
> d'autorisation à un tiers. Un hôte non local produit toujours du `https`,
> même si `x-forwarded-proto` prétend le contraire.
>
> À ne pas confondre avec `siteUrl()`, qui reste **figée** : les balises
> `canonical`, le sitemap et les données structurées doivent toujours
> désigner le domaine de production, jamais une URL de prévisualisation.

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
3. **Clé serveur Supabase** — Supabase → *Project Settings → API Keys*.
   L'application accepte **deux noms**, et se contente du premier trouvé :
   - `SUPABASE_SERVICE_ROLE_KEY` (clé `service_role` historique) ;
   - `SUPABASE_SECRET_KEY` (nouveau nom Supabase, `sb_secret_…` — c'est
     celui que provisionne automatiquement l'intégration Supabase pour
     Vercel).

   ⚠️ Jamais de préfixe `NEXT_PUBLIC_`. **Piège vécu** : les deux clés
   Stripe étaient définies, l'intégration Supabase avait posé
   `SUPABASE_SECRET_KEY`, et le paiement par carte restait inactif sans
   aucun signal parce que le code ne cherchait que l'autre nom. C'est
   désormais impossible, et `/api/diagnostic` indique sous quel nom la clé
   a été trouvée (`cleServiceRole.nomUtilise`).
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

## Modération & publication instantanée

### Le problème que ça règle

Avant, chaque tâche attendait un clic dans `/admin` pour devenir visible. Ce
clic était le seul rempart contre la fuite de coordonnées dans un texte
public — mais il plafonnait la croissance et rendait intenable la promesse
faite au client (« publiée après validation », à 2 h du matin). Or la demande
de tâches ponctuelles est **urgente par nature** : un déménagement demain
matin ne supporte pas six heures d'attente.

### Comment ça marche

1. La tâche est **toujours insérée en `pending`** — c'est tout ce que la
   politique RLS d'insertion publique autorise.
2. `lib/moderation.ts` inspecte le titre et la description : numéros de
   téléphone (tous formats québécois), courriels, liens, domaines nus,
   identifiants sociaux, plus une liste de formulations de contournement
   (« appelez-moi », « textez-moi », « WhatsApp »…).
3. **Rien à signaler** → la tâche est promue en `active` côté serveur (clé
   service role) et devient visible immédiatement.
4. **Quelque chose à signaler** → elle reste en `pending` et apparaît dans
   *Admin → Opérations → Tâches à relire*, avec le motif, le texte d'origine
   et le texte qui serait publié, côte à côte.

> **Pourquoi ce détour plutôt qu'une insertion directe en `active` ?** La clé
> anon est publique. Autoriser `active` à l'insertion permettrait à n'importe
> qui d'écrire directement dans l'API Supabase et de publier du contenu —
> coordonnées comprises — sans jamais traverser la modération.

Une soumission dont on a retiré des coordonnées n'est **jamais** auto-publiée,
même si le texte nettoyé est sûr : publier « Contactez-moi au [coordonnées
retirées] » produirait une annonce absurde. Mieux vaut un délai.

### Ce que voit la personne

Quand du texte a été masqué, le message de confirmation le dit franchement et
explique pourquoi (« c'est notre équipe qui vous met en contact, vos
coordonnées ne sont jamais publiques ») plutôt que de la laisser le découvrir
en relisant son annonce.

### Anti-spam

Les quatre formulaires publics passent par la fonction SQL
`claim_submission_slot`, avec un quota par courriel et par heure :

| Formulaire | Quota / heure | Raison |
| --- | --- | --- |
| Publier une tâche | 5 | Un particulier publie rarement plus. |
| Inscription travailleur | 3 | On ne s'inscrit qu'une fois. |
| Candidature | 15 | Postuler beaucoup est **légitime**. |
| Mise en relation | 5 | |

Le quota et la fenêtre sont **codés en dur dans la fonction** : elle est
exécutable par le rôle `anon`, et un appelant libre de choisir sa propre
limite n'aurait plus de limite. En cas d'erreur (migration non appliquée,
par exemple), la garde **laisse passer** : un anti-spam qui tombe ne doit
jamais fermer le site.

### Activation

```sql
-- Supabase > SQL Editor : appliquer la migration
-- supabase/migrations/20260902c_moderation_and_autopublish.sql
```

Puis définir `SUPABASE_SERVICE_ROLE_KEY`. Sans cette clé, la modération et
l'anti-spam fonctionnent toujours, mais la publication reste manuelle — la
page Opérations l'indique explicitement.

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
- [ ] Une tâche **propre** est visible immédiatement sur `/taches` (publication
      instantanée) — à condition que `SUPABASE_SERVICE_ROLE_KEY` soit définie.
- [ ] Une tâche contenant « Appelez-moi au 514-555-0142 » reste en
      **« En attente »**, apparaît dans *Opérations → Tâches à relire* avec le
      motif, et son numéro est masqué dans le texte publiable.
- [ ] Envoyer 6 tâches de suite avec le même courriel : la 6ᵉ est refusée avec
      le message anti-pourriel.
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
- [ ] `/robots.txt` répond et interdit `/admin` et `/mon-compte`.
- [ ] `/sitemap.xml` répond et contient les 126 pages `/services/…`.
- [ ] `/services/demenagement-montreal` s'affiche ; un slug inventé fait 404.
- [ ] Une fiche de tâche contient un bloc `JobPosting` valide
      (tester avec le [Rich Results Test](https://search.google.com/test/rich-results)).

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
✅ **SEO local** — livré (126 pages « service × ville », sitemap, `JobPosting`).
✅ **Modération & publication instantanée** — livré (voir la section dédiée).

Le chantier suivant, et le plus rentable : les **notifications**. Aujourd'hui
le site n'envoie aucun courriel — ni à l'employeur quand une candidature
arrive, ni au travailleur quand une tâche paraît dans sa ville. C'est le
principal frein qui reste.

L'architecture est pensée pour accueillir, sans refonte majeure :

- **Vérification d'identité** : colonnes `verified` / table `verifications` côté `workers`, plus un fournisseur (Stripe Identity, Veriff…).
- **Notifications WhatsApp / courriel** : déclencher depuis les Server Actions existantes (`createApplication`, `updateTaskStatus`) via un service (Twilio, Resend) ou des **Vercel Queues / Cron**.
- **Abonnements** : modèle de plans + restrictions d'accès, en s'appuyant sur la même couche d'authentification.
- **Comptes travailleurs/employeurs** : Supabase Auth est déjà intégré ; il suffit d'étendre les rôles et d'ajouter des politiques RLS dédiées.

---

Fait au Québec. 🍁
