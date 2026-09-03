-- ============================================================================
-- JobDirect — Modération automatique, publication instantanée, anti-spam
-- ----------------------------------------------------------------------------
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query.
-- Rejouable sans risque (add column if not exists / create or replace).
--
-- POURQUOI
-- Jusqu'ici, chaque tâche attendait une validation manuelle avant d'être
-- visible. C'était le seul filet contre la fuite de coordonnées dans un texte
-- public — mais aussi un plafond de croissance et une promesse intenable
-- (« publiée après validation » à 2 h du matin).
--
-- Le contrôle devient automatique (lib/moderation.ts) : une soumission propre
-- est publiée sur-le-champ, une soumission douteuse tombe dans la file
-- `pending` avec le motif du signalement. La RLS reste INTACTE — l'insertion
-- publique force toujours `status = 'pending'` — et seule la promotion en
-- « active », faite côté serveur après contrôle, rend la tâche visible.
-- Une clé anon volée ne peut donc rien publier directement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Traçabilité de la modération sur les tâches
-- ----------------------------------------------------------------------------

-- Texte d'origine, avant masquage des coordonnées. Sert à l'admin pour juger
-- une soumission signalée : c'est la pièce à conviction d'un contournement.
alter table public.tasks
  add column if not exists description_raw text;

-- Motifs du signalement (vide/NULL = soumission propre).
alter table public.tasks
  add column if not exists moderation_reasons text[];

-- true = passée en « active » automatiquement, sans regard humain.
alter table public.tasks
  add column if not exists auto_published boolean not null default false;

-- Retrouver la file à relire d'un coup d'œil.
create index if not exists tasks_flagged_idx
  on public.tasks (created_at desc)
  where moderation_reasons is not null;

-- ----------------------------------------------------------------------------
-- 2. Idem pour les inscriptions de travailleurs
-- Les colonnes `skills`, `availability` et `experience` alimentent la vue
-- `public_workers` : même exposition publique, donc même risque de fuite.
-- ----------------------------------------------------------------------------
alter table public.workers
  add column if not exists moderation_reasons text[];

alter table public.workers
  add column if not exists skills_raw text;

-- ----------------------------------------------------------------------------
-- 3. Anti-spam : journal des soumissions + quota
-- ----------------------------------------------------------------------------
-- La RLS autorise l'insertion anonyme sur `tasks`, `workers`, `applications`
-- et `connection_requests` — sans aucun frein. Un script pouvait donc inonder
-- la base (et, demain, la boîte de courriels de l'opérateur).
--
-- Le journal ci-dessous est INVISIBLE au public (RLS activée, aucune
-- politique). Il n'est atteignable que par la fonction `claim_submission_slot`
-- ci-dessous, en `security definer`.
create table if not exists public.submission_log (
  id          bigserial primary key,
  kind        text not null,
  -- Empreinte de l'auteur : le courriel normalisé. Volontairement pas l'IP —
  -- une IP est un renseignement personnel au sens de la Loi 25, et le
  -- courriel est de toute façon déjà collecté par le formulaire.
  fingerprint text not null,
  created_at  timestamptz not null default now()
);

create index if not exists submission_log_lookup_idx
  on public.submission_log (kind, fingerprint, created_at desc);

alter table public.submission_log enable row level security;
-- Aucune politique : illisible et non modifiable, même avec la clé anon.

/**
 * Réserve un « jeton » de soumission, ou refuse si le quota est dépassé.
 *
 * Renvoie true si la soumission est autorisée (et la consigne), false sinon.
 *
 * Le quota et la fenêtre sont VOLONTAIREMENT codés en dur ici, et non passés
 * en paramètres : la fonction est exécutable par le rôle `anon`, et un
 * appelant qui pourrait choisir sa propre limite n'aurait plus de limite.
 */
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
  -- Sans empreinte exploitable, on laisse passer : mieux vaut accepter une
  -- soumission que perdre un vrai client à cause d'un courriel malformé
  -- (la validation de format, elle, a déjà eu lieu côté application).
  if v_key = '' then
    return true;
  end if;

  v_max := case p_kind
             when 'task'        then 5   -- un particulier publie rarement plus
             when 'worker'      then 3   -- on ne s'inscrit qu'une fois
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

  -- Purge opportuniste (1 appel sur 100) : le journal ne sert qu'à la
  -- fenêtre glissante, le garder au-delà serait conserver des données
  -- personnelles sans raison.
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
-- 4. La vue publique ne doit JAMAIS exposer le texte d'origine
-- ----------------------------------------------------------------------------
-- `public_tasks` est recréée à l'identique, en listant explicitement ses
-- colonnes : `description_raw` vient d'être ajoutée à `tasks` et ne doit
-- surtout pas se retrouver dans la vue.
create or replace view public.public_tasks as
select id, title, description, city, category, desired_date, budget_estimate,
       status, created_at
from public.tasks
where status = 'active';

grant select on public.public_tasks to anon, authenticated;
