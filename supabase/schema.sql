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
  created_at   timestamptz not null default now()
);

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
  full_name    text not null default '',
  email        text,
  phone        text,
  city         text,
  skills       text,
  availability text,
  experience   text,
  -- Même droit de retrait que `workers.is_public`, pour les comptes.
  is_public    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_is_public_idx on public.profiles (is_public) where is_public;

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
  insert into public.profiles (id, role, full_name, email, phone, city, skills, availability, experience)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' in ('employer','worker')
         then new.raw_user_meta_data->>'role' else 'worker' end,
    coalesce(new.raw_user_meta_data->>'full_name',''),
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
