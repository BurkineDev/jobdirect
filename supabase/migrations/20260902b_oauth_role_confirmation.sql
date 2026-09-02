-- ============================================================================
-- JobDirect — Migration : connexion Google / Apple (OAuth)
-- ----------------------------------------------------------------------------
-- Un fournisseur OAuth ne transmet PAS le rôle métier (employeur ou
-- travailleur). Sans garde-fou, le trigger `handle_new_user` retomberait sur
-- « worker » par défaut et un employeur arrivant par Google se retrouverait
-- avec le mauvais tableau de bord, sans s'en apercevoir.
--
-- `role_confirmed` distingue un rôle CHOISI d'un rôle DEVINÉ : tant qu'il est
-- faux, l'application demande à l'utilisateur de trancher.
-- ============================================================================

-- Ajout en deux temps, volontairement : la colonne est créée avec `default
-- true` pour que les comptes EXISTANTS (tous inscrits par mot de passe, donc
-- avec un rôle explicite) soient marqués confirmés, puis le défaut bascule à
-- false pour les futurs comptes. Le bloc ne s'exécute qu'une fois : rejouer la
-- migration ne re-confirmera pas des comptes en attente de choix.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role_confirmed'
  ) then
    alter table public.profiles
      add column role_confirmed boolean not null default true;
    alter table public.profiles
      alter column role_confirmed set default false;
  end if;
end $$;

-- Le trigger marque le rôle confirmé seulement s'il vient d'un choix explicite
-- (inscription par mot de passe). Il récupère aussi le nom fourni par Google
-- ou Apple, exposé sous `name` plutôt que `full_name`.
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
