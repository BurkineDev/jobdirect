-- ============================================================================
-- JobDirect — Notifications par courriel + désabonnement (LCAP / CASL)
-- ----------------------------------------------------------------------------
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query.
-- Rejouable sans risque.
--
-- POURQUOI LE DÉSABONNEMENT EST OBLIGATOIRE
-- Prévenir un travailleur qu'une tâche correspond à son profil est un
-- « message électronique commercial » au sens de la Loi canadienne
-- anti-pourriel (LCAP). L'inscription vaut consentement, mais la loi exige
-- EN PLUS un mécanisme de désabonnement clairement indiqué, fonctionnel
-- pendant 60 jours et traité en 10 jours ouvrables. Les sanctions atteignent
-- 10 M$ pour une entreprise : ce n'est pas un raffinement, c'est la
-- condition pour envoyer le premier courriel.
--
-- Les courriels purement transactionnels (« votre tâche est en ligne »,
-- « vous avez reçu une candidature ») ne sont pas visés par cette exigence,
-- mais on leur applique le même respect du choix de la personne.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fiches issues du formulaire (table workers)
-- ----------------------------------------------------------------------------
alter table public.workers
  add column if not exists notify_enabled boolean not null default true;

-- Jeton porté par le lien de désabonnement. Un UUID aléatoire, et non le
-- courriel : un lien de désabonnement se retrouve dans les journaux de
-- serveurs, les proxys et les clients de messagerie. Il ne doit jamais
-- révéler l'adresse de la personne, ni permettre de désabonner quelqu'un
-- d'autre en devinant son courriel.
alter table public.workers
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists workers_unsubscribe_token_idx
  on public.workers (unsubscribe_token);

-- ----------------------------------------------------------------------------
-- 2. Comptes travailleur (table profiles) — l'autre moitié du vivier
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists notify_enabled boolean not null default true;

alter table public.profiles
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);

-- ----------------------------------------------------------------------------
-- 3. Traiter un désabonnement sans exposer les tables
-- ----------------------------------------------------------------------------
-- Le rôle `anon` ne peut ni lire ni modifier `workers` et `profiles`. Cette
-- fonction est la seule porte : elle prend un jeton, coupe les envois, et ne
-- renvoie qu'un booléen — jamais le courriel ni le nom associés.
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

  update public.workers
     set notify_enabled = false
   where unsubscribe_token = p_token;
  if found then
    v_hit := true;
  end if;

  update public.profiles
     set notify_enabled = false
   where unsubscribe_token = p_token;
  if found then
    v_hit := true;
  end if;

  return v_hit;
end;
$$;

grant execute on function public.unsubscribe_by_token(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Destinataires d'une alerte « nouvelle tâche »
-- ----------------------------------------------------------------------------
-- Réunit les deux viviers, ne garde que les personnes joignables ET
-- consentantes, et applique la même déduplication par courriel que le reste
-- de l'application (un compte remplace une fiche formulaire).
--
-- SECURITY DEFINER parce qu'elle lit des coordonnées privées : elle n'est
-- donc accordée QU'au rôle `service_role`, jamais à `anon`. Un visiteur ne
-- peut pas l'appeler pour extraire la liste des courriels.
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
    select p.full_name as name,
           p.email,
           p.city,
           p.skills,
           p.unsubscribe_token
      from public.profiles p
     where p.role = 'worker'
       and p.notify_enabled
       and coalesce(btrim(p.email), '') <> ''
  ),
  forms as (
    select w.name,
           w.email,
           w.city,
           w.skills,
           w.unsubscribe_token
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
