-- ============================================================================
-- JobDirect — Schéma de base de données Supabase (MVP)
-- ----------------------------------------------------------------------------
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query.
-- Idempotent : peut être ré-exécuté sans erreur.
--
-- ⚠️ Ce fichier INSTALLE un schéma neuf. Il ne fait PAS évoluer une base
-- existante : `create table if not exists` laisse intacte une table déjà
-- présente, même si ses colonnes ont changé. Pour une base déjà déployée,
-- appliquez les fichiers de `supabase/migrations/` (voir le README).
--
-- Sécurité : RLS est ACTIVÉ sur toutes les tables. L'application n'utilise que
-- la clé PUBLIQUE (anon) ; la RLS est la frontière de sécurité.
--   • Public : insertions de formulaires autorisées ; lecture des tâches via la
--     vue `public_tasks` (colonnes non sensibles, tâches actives uniquement).
--   • Admin  : accès complet via la fonction `is_admin()` (courriel du JWT
--     présent dans la table `public.admins`), lorsqu'une session admin est
--     authentifiée par Supabase Auth.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : met à jour automatiquement updated_at
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- TABLE : tasks (tâches publiées par les employeurs / particuliers)
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text not null,
  city            text not null,
  category        text not null,
  desired_date    date,
  budget_estimate numeric(10, 2),
  -- Coordonnées du demandeur (privées : jamais exposées publiquement)
  contact_name    text not null,
  contact_phone   text not null,
  contact_email   text not null,
  status          text not null default 'pending'
                    check (status in ('pending','active','assigned','completed','cancelled')),
  -- Modération automatique (voir lib/moderation.ts) :
  --   description_raw    = texte d'origine, avant masquage des coordonnées
  --                        (pièce à conviction d'un contournement) ;
  --   moderation_reasons = motifs du signalement (NULL = soumission propre) ;
  --   auto_published     = passée en « active » sans regard humain.
  description_raw    text,
  moderation_reasons text[],
  auto_published     boolean not null default false,
  -- Compte employeur associé (NULL = tâche soumise sans compte)
  user_id         uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists tasks_status_idx     on public.tasks (status);
create index if not exists tasks_city_idx        on public.tasks (city);
create index if not exists tasks_category_idx    on public.tasks (category);
create index if not exists tasks_created_at_idx  on public.tasks (created_at desc);
create index if not exists tasks_user_id_idx     on public.tasks (user_id);
create index if not exists tasks_flagged_idx     on public.tasks (created_at desc)
  where moderation_reasons is not null;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- TABLE : workers (travailleurs journaliers inscrits)
-- ----------------------------------------------------------------------------
create table if not exists public.workers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text not null,
  email        text not null,
  city         text not null,
  skills       text not null,
  availability text not null,
  experience   text,
  -- Droit de retrait : false = la fiche n'apparaît pas dans le répertoire
  -- public (vue `public_workers`). L'inscription vaut consentement, révocable.
  is_public    boolean not null default true,
  -- Mêmes colonnes de modération que `tasks` : `skills`, `availability` et
  -- `experience` alimentent la vue publique `public_workers`.
  moderation_reasons text[],
  skills_raw   text,
  -- Notifications (LCAP) : consentement révocable + jeton du lien de
  -- désabonnement. Un UUID, jamais le courriel : un lien de désabonnement
  -- traîne dans les journaux et ne doit révéler aucune adresse.
  notify_enabled    boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at   timestamptz not null default now()
);

create unique index if not exists workers_unsubscribe_token_idx
  on public.workers (unsubscribe_token);

create index if not exists workers_city_idx       on public.workers (city);
create index if not exists workers_created_at_idx  on public.workers (created_at desc);
create index if not exists workers_is_public_idx   on public.workers (is_public) where is_public;

-- ----------------------------------------------------------------------------
-- TABLE : applications (candidatures « Je suis disponible »)
-- ----------------------------------------------------------------------------
create table if not exists public.applications (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  worker_id  uuid references public.workers (id) on delete set null,
  name       text not null,
  phone      text not null,
  email      text not null,
  message    text,
  status     text not null default 'new'
               check (status in ('new','reviewed','contacted','rejected')),
  -- Compte travailleur associé (NULL = candidature envoyée sans compte)
  user_id    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists applications_task_id_idx     on public.applications (task_id);
create index if not exists applications_created_at_idx   on public.applications (created_at desc);
create index if not exists applications_user_id_idx      on public.applications (user_id);

-- ----------------------------------------------------------------------------
-- TABLE : admin_notes (notes internes de l'équipe admin)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_notes (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references public.tasks (id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_notes_task_id_idx on public.admin_notes (task_id);

-- ----------------------------------------------------------------------------
-- Vue publique : colonnes non sensibles des tâches actives uniquement.
-- (Vue « security definer » par défaut → contourne la RLS de tasks et
--  n'expose JAMAIS les coordonnées privées du demandeur.)
-- ----------------------------------------------------------------------------
create or replace view public.public_tasks as
select id, title, description, city, category, desired_date, budget_estimate,
       status, created_at
from public.tasks
where status = 'active';

grant select on public.public_tasks to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Administrateurs : source de vérité (DB) pour l'autorisation RLS.
-- ----------------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security; -- aucune politique = inaccessible sauf SQL direct

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.email = (auth.jwt() ->> 'email')
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- TABLE : profiles (comptes utilisateurs — employeur ou travailleur)
-- 1 ligne par compte Supabase Auth, créée automatiquement à l'inscription.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('employer','worker')),
  -- false = rôle deviné (compte Google/Apple, qui ne transmet aucun rôle) :
  -- l'application demande alors à l'utilisateur de trancher.
  role_confirmed boolean not null default false,
  full_name    text not null default '',
  email        text,
  phone        text,
  city         text,
  skills       text,
  availability text,
  experience   text,
  -- Même droit de retrait que `workers.is_public`, pour les comptes.
  is_public    boolean not null default true,
  -- Notifications (LCAP), comme pour `workers`.
  notify_enabled    boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_is_public_idx on public.profiles (is_public) where is_public;
create unique index if not exists profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);

alter table public.profiles enable row level security;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function set_updated_at();

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Création automatique du profil à l'inscription (métadonnées du signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, role, role_confirmed, full_name, email, phone, city, skills, availability, experience
  )
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' in ('employer','worker')
         then new.raw_user_meta_data->>'role' else 'worker' end,
    -- `coalesce` indispensable : sans clé « role » (cas Google/Apple),
    -- l'expression vaut NULL et non false, ce qui violerait le not-null.
    coalesce(new.raw_user_meta_data->>'role' in ('employer','worker'), false),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'skills',
    new.raw_user_meta_data->>'availability',
    new.raw_user_meta_data->>'experience'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- TABLE : commissions (facturation de la mise en relation)
-- Créée automatiquement quand une tâche passe au statut « assigned ».
-- Payée hors plateforme (virement Interac) ; l'admin marque « paid ».
-- ----------------------------------------------------------------------------
create table if not exists public.commissions (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null unique references public.tasks (id) on delete cascade,
  amount     numeric(10, 2) not null default 15.00,
  status     text not null default 'pending' check (status in ('pending','paid')),
  paid_at    timestamptz,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.commissions enable row level security;

drop policy if exists commissions_admin_all on public.commissions;
create policy commissions_admin_all on public.commissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Suggestion automatique : max(10 % du budget estimé, 15 $).
create or replace function public.handle_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'assigned' and (old.status is distinct from 'assigned') then
    insert into public.commissions (task_id, amount)
    values (
      new.id,
      greatest(coalesce(round(new.budget_estimate * 0.10, 2), 15.00), 15.00)
    )
    on conflict (task_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_on_assigned on public.tasks;
create trigger tasks_on_assigned
  after update on public.tasks
  for each row execute function public.handle_task_assigned();

-- ----------------------------------------------------------------------------
-- TABLE : connection_requests (un client veut embaucher UN travailleur précis)
-- Alimentée par /embaucher/[id] — c'est le « lead chaud » du modèle d'affaires.
-- Aucune clé étrangère sur worker_id : le répertoire public (vue
-- `public_workers`) réunit DEUX sources (table `workers` + comptes
-- `profiles`), donc l'identifiant peut provenir de l'une ou de l'autre.
-- `worker_name` en conserve une copie lisible même si la fiche disparaît.
-- ----------------------------------------------------------------------------
create table if not exists public.connection_requests (
  id           uuid primary key default gen_random_uuid(),
  worker_id    uuid,
  worker_name  text,
  client_name  text not null,
  client_phone text not null,
  client_email text not null,
  city         text,
  need         text,
  status       text not null default 'new'
                 check (status in ('new','contacted','matched','closed')),
  -- Frais de mise en relation encaissés d'avance (Stripe). NULL = non payé.
  paid_at      timestamptz,
  amount_paid  numeric(10, 2),
  created_at   timestamptz not null default now()
);

create index if not exists connection_requests_status_idx
  on public.connection_requests (status);
create index if not exists connection_requests_created_at_idx
  on public.connection_requests (created_at desc);
create index if not exists connection_requests_worker_id_idx
  on public.connection_requests (worker_id);

alter table public.connection_requests enable row level security;

-- Insertion publique, mais JAMAIS auto-déclarée payée : `paid_at` et
-- `amount_paid` ne peuvent être posés que par le webhook Stripe (service role).
drop policy if exists connection_requests_insert_public on public.connection_requests;
create policy connection_requests_insert_public on public.connection_requests
  for insert to anon, authenticated
  with check (status = 'new' and paid_at is null and amount_paid is null);
drop policy if exists connection_requests_admin_all on public.connection_requests;
create policy connection_requests_admin_all on public.connection_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Répertoire PUBLIC des travailleurs.
-- Affiche « Prénom N. » — jamais le nom complet, jamais les coordonnées :
-- c'est la mise en relation (payante) qui donne accès au contact.
-- ----------------------------------------------------------------------------
create or replace function public.public_display_name(full_name text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(btrim(full_name), '') = '' then 'Travailleur'
    when position(' ' in btrim(full_name)) = 0 then initcap(btrim(full_name))
    else initcap(split_part(btrim(full_name), ' ', 1)) || ' ' ||
         upper(left(split_part(btrim(full_name), ' ', 2), 1)) || '.'
  end;
$$;

-- Réunit les deux viviers (fiches formulaire + comptes travailleur), en
-- écartant les fiches dont le courriel a depuis ouvert un compte (même
-- déduplication que `getWorkerPool`). Seules les fiches exploitables
-- (ville + compétences renseignées) sont publiées.
create or replace view public.public_workers as
select w.id,
       public.public_display_name(w.name) as display_name,
       w.city,
       w.skills,
       w.availability,
       w.experience,
       w.created_at
from public.workers w
where w.is_public
  and coalesce(btrim(w.city), '') <> ''
  and coalesce(btrim(w.skills), '') <> ''
  and not exists (
    select 1 from public.profiles p
    where p.role = 'worker' and lower(p.email) = lower(w.email)
  )
union all
select p.id,
       public.public_display_name(p.full_name) as display_name,
       p.city,
       p.skills,
       coalesce(nullif(btrim(p.availability), ''), 'À discuter') as availability,
       p.experience,
       p.created_at
from public.profiles p
where p.role = 'worker'
  and p.is_public
  and coalesce(btrim(p.city), '') <> ''
  and coalesce(btrim(p.skills), '') <> '';

grant select on public.public_workers to anon, authenticated;

-- ----------------------------------------------------------------------------
-- TABLE : payments (encaissements Stripe)
-- Deux usages :
--   • kind = 'connection' → frais de mise en relation payés D'AVANCE par le
--     client sur /embaucher/[id] (le nerf du modèle : on encaisse avant de
--     livrer la mise en relation) ;
--   • kind = 'commission' → lien de paiement envoyé pour une commission de
--     tâche assignée (remplace la relance Interac manuelle).
-- Écrite uniquement par le webhook Stripe (clé service role) ; lisible admin.
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  kind                  text not null check (kind in ('connection','commission')),
  connection_request_id uuid references public.connection_requests (id) on delete cascade,
  commission_id         uuid references public.commissions (id) on delete cascade,
  amount                numeric(10, 2) not null check (amount >= 0),
  currency              text not null default 'cad',
  status                text not null default 'pending'
                          check (status in ('pending','paid','refunded')),
  stripe_session_id     text unique,
  stripe_payment_intent text,
  customer_email        text,
  paid_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint payments_target_check check (
    (kind = 'connection' and connection_request_id is not null and commission_id is null)
    or
    (kind = 'commission' and commission_id is not null and connection_request_id is null)
  )
);

create index if not exists payments_status_idx     on public.payments (status);
create index if not exists payments_created_at_idx  on public.payments (created_at desc);
create index if not exists payments_intent_idx      on public.payments (stripe_payment_intent);

alter table public.payments enable row level security;

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function set_updated_at();

-- Le webhook ne touche QUE `payments` : ce trigger propage l'encaissement
-- (ou le remboursement) vers la demande ou la commission concernée.
create or replace function public.handle_payment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    if new.kind = 'connection' then
      update public.connection_requests
         set paid_at = coalesce(new.paid_at, now()), amount_paid = new.amount
       where id = new.connection_request_id;
    else
      update public.commissions
         set status = 'paid', paid_at = coalesce(new.paid_at, now()), amount = new.amount
       where id = new.commission_id;
    end if;
  elsif new.status = 'refunded' and old.status is distinct from 'refunded' then
    if new.kind = 'connection' then
      update public.connection_requests
         set paid_at = null, amount_paid = null
       where id = new.connection_request_id;
    else
      update public.commissions
         set status = 'pending', paid_at = null
       where id = new.commission_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_on_status_change on public.payments;
create trigger payments_on_status_change
  after update on public.payments
  for each row execute function public.handle_payment_status_change();

-- ----------------------------------------------------------------------------
-- TABLE : submission_log (anti-spam des formulaires publics)
-- ----------------------------------------------------------------------------
-- La RLS autorise l'insertion anonyme sur tasks/workers/applications/
-- connection_requests. Sans frein, un script pourrait inonder la base et la
-- boîte de courriels de l'opérateur. Ce journal est INVISIBLE au public
-- (RLS activée, aucune politique) : seule la fonction `claim_submission_slot`
-- l'atteint, en security definer.
create table if not exists public.submission_log (
  id          bigserial primary key,
  kind        text not null,
  -- Empreinte de l'auteur : le courriel normalisé. Pas l'IP — c'est un
  -- renseignement personnel au sens de la Loi 25, et le courriel est de
  -- toute façon déjà collecté par le formulaire.
  fingerprint text not null,
  created_at  timestamptz not null default now()
);

create index if not exists submission_log_lookup_idx
  on public.submission_log (kind, fingerprint, created_at desc);

alter table public.submission_log enable row level security;
-- Aucune politique : illisible et non modifiable, même avec la clé anon.

-- Réserve un jeton de soumission, ou renvoie false si le quota est dépassé.
-- Quota et fenêtre sont codés en dur : la fonction est exécutable par `anon`,
-- et un appelant libre de choisir sa limite n'aurait plus de limite.
create or replace function public.claim_submission_slot(
  p_kind        text,
  p_fingerprint text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window interval := interval '1 hour';
  v_max    int;
  v_key    text;
  v_count  int;
begin
  v_key := lower(btrim(coalesce(p_fingerprint, '')));
  if v_key = '' then
    return true;
  end if;

  v_max := case p_kind
             when 'task'        then 5
             when 'worker'      then 3
             when 'application' then 15  -- postuler beaucoup est LÉGITIME
             when 'connection'  then 5
             else 5
           end;

  select count(*) into v_count
    from public.submission_log
   where kind = p_kind
     and fingerprint = v_key
     and created_at > now() - v_window;

  if v_count >= v_max then
    return false;
  end if;

  insert into public.submission_log (kind, fingerprint)
  values (p_kind, v_key);

  -- Purge opportuniste : le journal ne sert qu'à la fenêtre glissante.
  if random() < 0.01 then
    delete from public.submission_log
     where created_at < now() - interval '7 days';
  end if;

  return true;
end;
$$;

grant execute on function public.claim_submission_slot(text, text)
  to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Fonctions SECURITY DEFINER : vérifications croisées tasks ↔ applications
-- sans déclencher la RLS (évite la récursion infinie entre politiques).
-- ----------------------------------------------------------------------------
create or replace function public.user_owns_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tasks
    where id = p_task_id and user_id = auth.uid()
  );
$$;

create or replace function public.user_applied_to_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.applications
    where task_id = p_task_id and user_id = auth.uid()
  );
$$;

grant execute on function public.user_owns_task(uuid) to authenticated;
grant execute on function public.user_applied_to_task(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Notifications : désabonnement et sélection des destinataires
-- ----------------------------------------------------------------------------
-- Traiter un désabonnement sans exposer les tables. Le rôle `anon` ne peut ni
-- lire ni modifier `workers`/`profiles` : cette fonction est la seule porte,
-- et elle ne renvoie qu'un booléen — jamais le courriel associé au jeton.
create or replace function public.unsubscribe_by_token(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hit boolean := false;
begin
  if p_token is null then
    return false;
  end if;

  update public.workers set notify_enabled = false
   where unsubscribe_token = p_token;
  if found then v_hit := true; end if;

  update public.profiles set notify_enabled = false
   where unsubscribe_token = p_token;
  if found then v_hit := true; end if;

  return v_hit;
end;
$$;

grant execute on function public.unsubscribe_by_token(uuid) to anon, authenticated;

-- Destinataires d'une alerte « nouvelle tâche » : les deux viviers réunis,
-- dédoublonnés par courriel, limités aux personnes joignables ET consentantes.
-- SECURITY DEFINER car elle lit des coordonnées privées : accordée au seul
-- `service_role`, jamais à `anon`.
create or replace function public.workers_to_notify(
  p_city     text,
  p_category text
)
returns table (
  name              text,
  email             text,
  city              text,
  skills            text,
  unsubscribe_token uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with accounts as (
    select p.full_name as name, p.email, p.city, p.skills, p.unsubscribe_token
      from public.profiles p
     where p.role = 'worker'
       and p.notify_enabled
       and coalesce(btrim(p.email), '') <> ''
  ),
  forms as (
    select w.name, w.email, w.city, w.skills, w.unsubscribe_token
      from public.workers w
     where w.notify_enabled
       and coalesce(btrim(w.email), '') <> ''
       and not exists (
         select 1 from accounts a where lower(a.email) = lower(w.email)
       )
  ),
  pool as (
    select * from accounts
    union all
    select * from forms
  ),
  -- Mots significatifs de la catégorie. Le découpage sur les non-lettres
  -- garantit des jetons purement alphabétiques : rien d'interprétable comme
  -- métacaractère ne peut atteindre la comparaison régulière ci-dessous.
  category_words as (
    select w.word
      from regexp_split_to_table(coalesce(p_category, ''), '[^[:alpha:]]+') as w(word)
     where length(w.word) >= 5
       and lower(w.word) <> 'autre'
  )
  select pool.name, pool.email, pool.city, pool.skills, pool.unsubscribe_token
    from pool
   -- Même ville, OU une compétence qui COMMENCE par un mot de la catégorie.
   --
   -- L'ancre de début de mot (\m) est indispensable en français : une simple
   -- sous-chaîne faisait correspondre « Ménage » à « deMENAGEment » et à
   -- « aMENAGEment paysager », si bien que tout déménageur recevait les
   -- alertes de ménage. L'ancre ne porte que sur le DÉBUT du mot, donc les
   -- pluriels et dérivés (« ménages résidentiels ») correspondent toujours.
   --
   -- Le tri fin par distance reste dans lib/matching.ts ; ici on écarte
   -- seulement les personnes que la tâche ne peut pas intéresser.
   where lower(btrim(pool.city)) = lower(btrim(p_city))
      or exists (
           select 1 from category_words cw
            where pool.skills ~* ('\m' || cw.word)
         );
$$;

-- VERROUILLAGE. En PostgreSQL, `EXECUTE` sur une fonction est accordé à
-- PUBLIC par défaut : révoquer sur `anon` et `authenticated` ne suffit PAS,
-- car ces rôles héritent du droit via PUBLIC. Sans la révocation sur PUBLIC
-- ci-dessous, n'importe qui muni de la clé anon pourrait appeler cette
-- fonction et extraire la liste des courriels de tous les travailleurs.
revoke all on function public.workers_to_notify(text, text) from public;
revoke all on function public.workers_to_notify(text, text) from anon;
revoke all on function public.workers_to_notify(text, text) from authenticated;
grant execute on function public.workers_to_notify(text, text) to service_role;

-- ----------------------------------------------------------------------------
-- Row Level Security : activée partout, avec politiques.
-- ----------------------------------------------------------------------------
alter table public.tasks        enable row level security;
alter table public.workers      enable row level security;
alter table public.applications enable row level security;
alter table public.admin_notes  enable row level security;

-- tasks : insertion publique (forcée 'pending', sans usurper un autre compte),
-- lecture de SES tâches + des tâches où l'on a postulé, accès total admin.
drop policy if exists tasks_insert_public on public.tasks;
create policy tasks_insert_public on public.tasks
  for insert to anon, authenticated
  with check (status = 'pending' and (user_id is null or user_id = auth.uid()));
drop policy if exists tasks_select_own on public.tasks;
create policy tasks_select_own on public.tasks
  for select to authenticated using (user_id = auth.uid());
drop policy if exists tasks_select_applied on public.tasks;
create policy tasks_select_applied on public.tasks
  for select to authenticated using (public.user_applied_to_task(id));
drop policy if exists tasks_admin_all on public.tasks;
create policy tasks_admin_all on public.tasks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- workers : inscription publique + accès total admin
drop policy if exists workers_insert_public on public.workers;
create policy workers_insert_public on public.workers
  for insert to anon, authenticated with check (true);
drop policy if exists workers_admin_all on public.workers;
create policy workers_admin_all on public.workers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- applications : candidature publique (sans usurper un autre compte),
-- lecture de SES candidatures + celles reçues sur SES tâches, accès admin.
drop policy if exists applications_insert_public on public.applications;
create policy applications_insert_public on public.applications
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
drop policy if exists applications_select_own on public.applications;
create policy applications_select_own on public.applications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists applications_select_for_task_owner on public.applications;
create policy applications_select_for_task_owner on public.applications
  for select to authenticated using (public.user_owns_task(task_id));
drop policy if exists applications_admin_all on public.applications;
create policy applications_admin_all on public.applications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin_notes : réservé admin
drop policy if exists admin_notes_admin_all on public.admin_notes;
create policy admin_notes_admin_all on public.admin_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Ajoutez vos administrateurs ici (doivent aussi exister dans Supabase Auth) :
-- insert into public.admins (email) values ('admin@jobdirect.ca') on conflict do nothing;

-- ============================================================================
-- (Optionnel) Jeu de données de démonstration — décommentez pour tester.
-- ============================================================================
-- insert into public.tasks (title, description, city, category, desired_date,
--   budget_estimate, contact_name, contact_phone, contact_email, status) values
-- ('Aide au déménagement (2 h)', 'Besoin d''une personne pour charger un camion, 3e étage sans ascenseur.',
--   'Montréal', 'Déménagement', current_date + 3, 80, 'Marc Tremblay', '514-555-0142', 'marc@example.com', 'active'),
-- ('Ménage après rénovation', 'Grand ménage d''un 4½ après travaux. Matériel fourni.',
--   'Laval', 'Ménage', current_date + 5, 120, 'Sophie Roy', '450-555-0199', 'sophie@example.com', 'active'),
-- ('Pelletage et déneigement', 'Entrée double + balcon, tôt le matin de préférence.',
--   'Québec', 'Aménagement paysager', current_date + 1, 40, 'Luc Gagné', '418-555-0123', 'luc@example.com', 'pending');
