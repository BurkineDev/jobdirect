-- ============================================================================
-- JobDirect — Migration : réconcilie la base existante avec le schéma du dépôt
--                          et ajoute les paiements Stripe.
-- ----------------------------------------------------------------------------
-- POURQUOI CE FICHIER
-- `schema.sql` est un schéma d'INSTALLATION : ses `create table if not exists`
-- ne touchent pas une table déjà présente. Or la base de production contenait
-- une variante du répertoire public (colonne `workers.is_public`, vue
-- `public_workers` sans les comptes) et une table `connection_requests` sans
-- les colonnes de paiement. Relancer `schema.sql` n'aurait donc rien corrigé —
-- et aurait écrasé la vue en supprimant le filtre `is_public`.
--
-- Cette migration est idempotente et additive : aucune donnée n'est supprimée.
-- À exécuter dans Supabase > SQL Editor. `schema.sql` a été aligné sur l'état
-- final produit ici, pour que les nouvelles installations soient identiques.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. connection_requests : colonnes d'encaissement.
-- ----------------------------------------------------------------------------
alter table public.connection_requests
  add column if not exists paid_at     timestamptz,
  add column if not exists amount_paid numeric(10, 2);

-- La table préexistait sans ses index : ils n'ont donc jamais été créés.
create index if not exists connection_requests_status_idx
  on public.connection_requests (status);
create index if not exists connection_requests_created_at_idx
  on public.connection_requests (created_at desc);
create index if not exists connection_requests_worker_id_idx
  on public.connection_requests (worker_id);

-- ----------------------------------------------------------------------------
-- 2. SÉCURITÉ — la politique d'insertion publique était `with check (true)`.
-- Telle quelle, un visiteur anonyme pourrait insérer une demande en se
-- déclarant DÉJÀ PAYÉE. On la resserre : statut forcé et champs de paiement
-- obligatoirement vides. Seul le webhook Stripe (service role) les remplit.
-- ----------------------------------------------------------------------------
drop policy if exists connection_requests_insert_public on public.connection_requests;
create policy connection_requests_insert_public on public.connection_requests
  for insert to anon, authenticated
  with check (status = 'new' and paid_at is null and amount_paid is null);

-- ----------------------------------------------------------------------------
-- 3. Publication des comptes travailleur : même droit de retrait que les
-- fiches formulaire (`workers.is_public`, déjà en place). Sans cette colonne,
-- unifier le répertoire publierait les comptes sans possibilité de s'y opposer.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_public boolean not null default true;

-- Filtrer sur is_public nécessite un index partiel utile aux deux sources.
create index if not exists workers_is_public_idx  on public.workers (is_public) where is_public;
create index if not exists profiles_is_public_idx on public.profiles (is_public) where is_public;

-- ----------------------------------------------------------------------------
-- 4. Nom d'affichage abrégé (« Marc T. ») — extrait de la vue vers une
-- fonction réutilisable et testable.
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

-- ----------------------------------------------------------------------------
-- 5. Répertoire public : fiches formulaire + comptes travailleur, chacun
-- filtré par son `is_public`, dédoublonnés par courriel (un compte remplace
-- une fiche). Jamais de téléphone ni de courriel : les coordonnées restent
-- derrière la mise en relation, qui est le service facturé.
-- ----------------------------------------------------------------------------
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
-- 6. Paiements Stripe.
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

-- Le webhook n'écrit QUE dans `payments` : ce trigger propage l'encaissement
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
