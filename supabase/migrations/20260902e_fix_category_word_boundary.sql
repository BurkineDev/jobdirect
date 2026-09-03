-- ============================================================================
-- JobDirect — Correctif : collision de sous-chaîne sur les catégories
-- ----------------------------------------------------------------------------
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query.
-- Rejouable sans risque (create or replace).
--
-- LE BOGUE
-- `workers_to_notify` rapprochait la catégorie des compétences par une simple
-- sous-chaîne : `skills ILIKE '%' || p_category || '%'`. En français, ça
-- produit des faux positifs silencieux :
--
--     'déménagement'         ILIKE '%Ménage%'  -> VRAI   (dé-MÉNAGE-ment)
--     'aménagement paysager' ILIKE '%Ménage%'  -> VRAI   (a-MÉNAGE-ment)
--
-- Conséquence : chaque déménageur et chaque paysagiste recevait une alerte
-- pour toute tâche de MÉNAGE. C'est la panne la plus coûteuse possible pour
-- ce genre de fonctionnalité — le travailleur reçoit des offres qui ne le
-- concernent pas, se désabonne, et l'offre de main-d'œuvre s'assèche.
--
-- LE CORRECTIF
-- Ancre de DÉBUT de mot (`\m`) au lieu d'une sous-chaîne libre :
--   • « ménage » ne correspond plus dans « déménagement » (le « ménage »
--     interne n'y commence pas un mot) ;
--   • « ménages résidentiels » correspond toujours (l'ancre est en début de
--     mot seulement, pas en fin — les pluriels et dérivés passent).
--
-- On compare en outre CHAQUE mot de la catégorie (≥ 5 lettres), et non la
-- chaîne entière : « Garde / Aide à domicile » n'apparaîtrait jamais
-- textuellement dans les compétences de quiconque. Le seuil de 5 lettres
-- écarte les mots trop génériques (« aide »), et « autre » est exclu — cette
-- catégorie fourre-tout ne doit déclencher aucune correspondance.
-- ============================================================================

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
   -- Même ville, OU une compétence qui commence par un mot de la catégorie.
   -- Le tri fin par distance reste dans lib/matching.ts ; ici on écarte
   -- seulement les personnes que la tâche ne peut pas intéresser.
   where lower(btrim(pool.city)) = lower(btrim(p_city))
      or exists (
           select 1 from category_words cw
            where pool.skills ~* ('\m' || cw.word)
         );
$$;

-- Le verrouillage est refait : `create or replace` conserve les droits
-- existants, mais on ne veut dépendre d'aucune hypothèse là-dessus. En
-- PostgreSQL, EXECUTE est accordé à PUBLIC par défaut — révoquer sur `anon`
-- seul ne suffirait pas, ce rôle héritant du droit via PUBLIC.
revoke all on function public.workers_to_notify(text, text) from public;
revoke all on function public.workers_to_notify(text, text) from anon;
revoke all on function public.workers_to_notify(text, text) from authenticated;
grant execute on function public.workers_to_notify(text, text) to service_role;
