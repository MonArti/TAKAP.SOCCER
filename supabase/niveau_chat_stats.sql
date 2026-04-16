-- Takap Soccer : niveau des matchs, chat par match, stats organisateur.
-- RLS désactivée : pas de policies ici. À exécuter une fois dans le SQL Editor Supabase.

-- ---------------------------------------------------------------------------
-- 1) Colonne niveau sur matchs
-- ---------------------------------------------------------------------------
alter table public.matchs
  add column if not exists niveau text default 'amateur';

update public.matchs
set niveau = 'amateur'
where niveau is null or niveau = '';

alter table public.matchs
  alter column niveau set default 'amateur';

alter table public.matchs
  alter column niveau set not null;

alter table public.matchs
  drop constraint if exists matchs_niveau_chk;

alter table public.matchs
  add constraint matchs_niveau_chk
  check (niveau in ('debutant', 'amateur', 'confirme', 'expert'));

-- ---------------------------------------------------------------------------
-- 2) RPC create_match avec p_niveau (8e paramètre)
-- ---------------------------------------------------------------------------
drop function if exists public.create_match(date, time, text, numeric, integer, double precision, double precision);

create or replace function public.create_match(
  p_date_match date,
  p_heure_match time,
  p_lieu text,
  p_prix numeric,
  p_nb_max integer,
  p_lieu_lat double precision default null,
  p_lieu_lng double precision default null,
  p_niveau text default 'amateur'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_n text := coalesce(nullif(trim(p_niveau), ''), 'amateur');
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'profil introuvable';
  end if;
  if v_n not in ('debutant', 'amateur', 'confirme', 'expert') then
    raise exception 'niveau invalide';
  end if;
  insert into public.matchs (
    organisateur_id,
    date_match,
    heure_match,
    lieu,
    lieu_lat,
    lieu_lng,
    prix,
    nb_max,
    niveau
  )
  values (
    v_uid,
    p_date_match,
    p_heure_match,
    btrim(p_lieu),
    p_lieu_lat,
    p_lieu_lng,
    p_prix,
    p_nb_max,
    v_n
  )
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_match(date, time, text, numeric, integer, double precision, double precision, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Chat : messages_match
-- ---------------------------------------------------------------------------
create table if not exists public.messages_match (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matchs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint messages_match_message_nonempty check (length(trim(message)) > 0)
);

create index if not exists messages_match_match_id_idx on public.messages_match (match_id);
create index if not exists messages_match_match_id_created_at_idx on public.messages_match (match_id, created_at);

-- ---------------------------------------------------------------------------
-- 4) Stats par joueur et par match (saisie organisateur)
-- ---------------------------------------------------------------------------
create table if not exists public.stats_match_joueur (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matchs (id) on delete cascade,
  joueur_id uuid not null references public.profiles (id) on delete cascade,
  buts smallint not null default 0,
  passes_decisives smallint not null default 0,
  cartons_jaunes smallint not null default 0,
  cartons_rouges smallint not null default 0,
  unique (match_id, joueur_id),
  constraint stats_match_joueur_buts_nonneg check (buts >= 0),
  constraint stats_match_joueur_passes_nonneg check (passes_decisives >= 0),
  constraint stats_match_joueur_cj_nonneg check (cartons_jaunes >= 0),
  constraint stats_match_joueur_cr_nonneg check (cartons_rouges >= 0)
);
