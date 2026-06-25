-- ============================================================================
-- JobDirect — Schéma de base de données Supabase (MVP)
-- ----------------------------------------------------------------------------
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query.
-- Idempotent : peut être ré-exécuté sans erreur.
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
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists tasks_status_idx     on public.tasks (status);
create index if not exists tasks_city_idx        on public.tasks (city);
create index if not exists tasks_category_idx    on public.tasks (category);
create index if not exists tasks_created_at_idx  on public.tasks (created_at desc);

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
  created_at   timestamptz not null default now()
);

create index if not exists workers_city_idx       on public.workers (city);
create index if not exists workers_created_at_idx  on public.workers (created_at desc);

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
  created_at timestamptz not null default now()
);

create index if not exists applications_task_id_idx     on public.applications (task_id);
create index if not exists applications_created_at_idx   on public.applications (created_at desc);

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
-- Row Level Security : activée partout, avec politiques.
-- ----------------------------------------------------------------------------
alter table public.tasks        enable row level security;
alter table public.workers      enable row level security;
alter table public.applications enable row level security;
alter table public.admin_notes  enable row level security;

-- tasks : insertion publique (forcée 'pending') + accès total admin
drop policy if exists tasks_insert_public on public.tasks;
create policy tasks_insert_public on public.tasks
  for insert to anon, authenticated with check (status = 'pending');
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

-- applications : candidature publique + accès total admin
drop policy if exists applications_insert_public on public.applications;
create policy applications_insert_public on public.applications
  for insert to anon, authenticated with check (true);
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
