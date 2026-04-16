-- Takap.Soccer — schéma Supabase (Auth + tables + RLS + triggers)
-- Exécuter dans : Supabase Dashboard → SQL Editor → New query → Run

-- Extensions
create extension if not exists "uuid-ossp";

-- Types
create type match_statut as enum ('ouvert', 'termine');

-- 1) Profils (lié à auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  pseudo text not null default '',
  age integer,
  taille integer,
  poids integer,
  note_moyenne numeric(3,2) not null default 0,
  nb_matchs integer not null default 0,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_pseudo_len check (char_length(trim(pseudo)) >= 1)
);

-- 2) Matchs
create table public.matchs (
  id uuid primary key default gen_random_uuid(),
  organisateur_id uuid not null references public.profiles (id) on delete cascade,
  date_match date not null,
  heure_match time not null,
  lieu text not null,
  lieu_lat double precision,
  lieu_lng double precision,
  prix numeric(10,2) not null default 0,
  nb_max integer not null default 10,
  statut match_statut not null default 'ouvert',
  created_at timestamptz not null default now(),
  constraint matchs_nb_max_pos check (nb_max >= 2 and nb_max <= 22),
  constraint matchs_prix_nonneg check (prix >= 0)
);

-- 3) Participations
create table public.participations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matchs (id) on delete cascade,
  joueur_id uuid not null references public.profiles (id) on delete cascade,
  a_paye boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, joueur_id)
);

-- 4) Notes (1–5)
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matchs (id) on delete cascade,
  donneur_id uuid not null references public.profiles (id) on delete cascade,
  receveur_id uuid not null references public.profiles (id) on delete cascade,
  note integer not null,
  created_at timestamptz not null default now(),
  unique (match_id, donneur_id, receveur_id),
  constraint notes_not_self check (donneur_id <> receveur_id),
  constraint notes_range check (note between 1 and 5)
);

create index idx_matchs_statut_date on public.matchs (statut, date_match);
create index idx_participations_match on public.participations (match_id);
create index idx_notes_match_receveur on public.notes (match_id, receveur_id);

-- Trigger : profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, pseudo)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'pseudo'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sync email sur profiles
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- Recalcul note_moyenne pour un joueur
create or replace function public.refresh_note_moyenne(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m numeric;
begin
  select coalesce(round(avg(note)::numeric, 2), 0)
    into m
  from public.notes
  where receveur_id = p_user;

  update public.profiles
  set note_moyenne = m, updated_at = now()
  where id = p_user;
end;
$$;

create or replace function public.trg_notes_refresh_moyenne()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_note_moyenne(old.receveur_id);
  else
    perform public.refresh_note_moyenne(new.receveur_id);
    if tg_op = 'UPDATE' and old.receveur_id is distinct from new.receveur_id then
      perform public.refresh_note_moyenne(old.receveur_id);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_notes_moyenne on public.notes;
create trigger trg_notes_moyenne
  after insert or update or delete on public.notes
  for each row execute function public.trg_notes_refresh_moyenne();

-- Quand un match passe à "termine", incrémenter nb_matchs des participants
create or replace function public.trg_match_termine_nb_matchs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'termine' and (old.statut is distinct from new.statut) then
    update public.profiles p
    set nb_matchs = p.nb_matchs + 1,
        updated_at = now()
    from public.participations part
    where part.match_id = new.id
      and part.joueur_id = p.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_matchs_termine on public.matchs;
create trigger trg_matchs_termine
  after update of statut on public.matchs
  for each row execute function public.trg_match_termine_nb_matchs();

-- updated_at profiles
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Seul un admin peut modifier la colonne role (évite l’auto-promotion via API)
create or replace function public.profiles_lock_role_unless_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    if not exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    ) then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role on public.profiles;
create trigger trg_profiles_role
  before update on public.profiles
  for each row execute function public.profiles_lock_role_unless_admin();

-- Helpers RLS (SECURITY DEFINER) : évitent la récursion matchs ↔ participations
create or replace function public.match_select_allowed_for_user(p_match_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        (m.statut = 'ouvert'::match_statut)
        or (p_user is not null and m.organisateur_id = p_user)
        or (
          p_user is not null
          and exists (
            select 1 from public.participations p
            where p.match_id = m.id and p.joueur_id = p_user
          )
        )
      from public.matchs m
      where m.id = p_match_id
    ),
    false
  );
$$;

create or replace function public.participation_select_allowed(p_match_id uuid, p_row_joueur_id uuid, p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        (m.statut = 'ouvert'::match_statut)
        or (p_actor is not null and m.organisateur_id = p_actor)
        or (p_actor is not null and p_row_joueur_id = p_actor)
      from public.matchs m
      where m.id = p_match_id
    ),
    false
  );
$$;

create or replace function public.match_organizer_is(p_match_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matchs m
    where m.id = p_match_id and m.organisateur_id = p_user
  );
$$;

create or replace function public.match_accepting_participants(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matchs m
    where m.id = p_match_id
      and m.statut = 'ouvert'::match_statut
      and (
        select count(*)::int from public.participations p where p.match_id = m.id
      ) < m.nb_max
  );
$$;

create or replace function public.profile_visible_to_anon_open_matchs(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matchs m
    where m.statut = 'ouvert'::match_statut
      and m.organisateur_id = p_profile_id
  )
  or exists (
    select 1
    from public.participations p
    inner join public.matchs m on m.id = p.match_id
    where m.statut = 'ouvert'::match_statut
      and p.joueur_id = p_profile_id
  );
$$;

create or replace function public.note_select_allowed(
  p_match_id uuid,
  p_donneur uuid,
  p_receveur uuid,
  p_actor uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (p_actor is not null and p_donneur = p_actor)
    or (p_actor is not null and p_receveur = p_actor)
    or (p_actor is not null and exists (
      select 1 from public.matchs m where m.id = p_match_id and m.organisateur_id = p_actor
    ))
    or (p_actor is not null and exists (
      select 1 from public.participations p
      where p.match_id = p_match_id and p.joueur_id = p_actor
    ));
$$;

create or replace function public.note_insert_allowed(p_match_id uuid, p_donneur uuid, p_receveur uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_donneur = auth.uid()
    and p_donneur <> p_receveur
    and exists (
      select 1 from public.matchs m
      where m.id = p_match_id and m.statut = 'termine'::match_statut
    )
    and exists (
      select 1 from public.participations p
      where p.match_id = p_match_id and p.joueur_id = p_donneur
    )
    and exists (
      select 1 from public.participations p
      where p.match_id = p_match_id and p.joueur_id = p_receveur
    );
$$;

grant execute on function public.match_select_allowed_for_user(uuid, uuid) to anon, authenticated;
grant execute on function public.participation_select_allowed(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.match_organizer_is(uuid, uuid) to authenticated;
grant execute on function public.match_accepting_participants(uuid) to authenticated;
grant execute on function public.profile_visible_to_anon_open_matchs(uuid) to anon, authenticated;
grant execute on function public.note_select_allowed(uuid, uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.note_insert_allowed(uuid, uuid, uuid) to authenticated;

-- Création de match côté serveur : INSERT sous SECURITY DEFINER (évite échecs RLS client sur insert/returning)
create or replace function public.create_match(
  p_date_match date,
  p_heure_match time,
  p_lieu text,
  p_prix numeric,
  p_nb_max integer,
  p_lieu_lat double precision default null,
  p_lieu_lng double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'profil introuvable';
  end if;
  insert into public.matchs (
    organisateur_id,
    date_match,
    heure_match,
    lieu,
    lieu_lat,
    lieu_lng,
    prix,
    nb_max
  )
  values (
    v_uid,
    p_date_match,
    p_heure_match,
    btrim(p_lieu),
    p_lieu_lat,
    p_lieu_lng,
    p_prix,
    p_nb_max
  )
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_match(date, time, text, numeric, integer, double precision, double precision) to authenticated;

-- Profil public : notes récentes reçues (agrégé) + moyennes communauté (+ stats du visiteur si connecté)
create or replace function public.get_public_profile_extras(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  recent int[];
  comm_note numeric;
  comm_nb numeric;
  active_cnt int;
  v_note numeric;
  v_nb int;
  payload jsonb;
begin
  select coalesce(array_agg(x.note order by x.ord), array[]::integer[])
    into recent
  from (
    select n.note, n.created_at as ord
    from public.notes n
    where n.receveur_id = p_profile_id
    order by n.created_at desc
    limit 12
  ) x;

  select count(*)::int into active_cnt
  from public.profiles
  where coalesce(nb_matchs, 0) > 0;

  if active_cnt > 0 then
    select
      round(avg(note_moyenne)::numeric, 2),
      round(avg(nb_matchs::numeric), 1)
    into comm_note, comm_nb
    from public.profiles
    where nb_matchs > 0;
  else
    comm_note := null;
    comm_nb := null;
  end if;

  payload := jsonb_build_object(
    'recent_notes', to_jsonb(coalesce(recent, array[]::integer[])),
    'community_avg_note', comm_note,
    'community_avg_nb_matchs', comm_nb
  );

  if auth.uid() is not null then
    select p.note_moyenne, p.nb_matchs into v_note, v_nb
    from public.profiles p
    where p.id = auth.uid();

    payload := payload || jsonb_build_object(
      'viewer_note_moyenne', v_note,
      'viewer_nb_matchs', v_nb,
      'is_self', auth.uid() = p_profile_id
    );
  end if;

  return payload;
end;
$$;

grant execute on function public.get_public_profile_extras(uuid) to anon, authenticated;

-- Admin : lecture globale (dashboard) — SECURITY DEFINER pour éviter récursion RLS
create or replace function public.auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.auth_is_admin() to anon, authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.matchs enable row level security;
alter table public.participations enable row level security;
alter table public.notes enable row level security;

-- Profiles
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Visiteurs non connectés : pseudos visibles pour matchs ouverts (organisateur + inscrits)
create policy "profiles_select_anon_open_matchs"
  on public.profiles for select
  to anon
  using (public.profile_visible_to_anon_open_matchs(id));

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Matchs : lecture matchs ouverts pour tous ; + ses matchs / ceux où il participe
create policy "matchs_select_public_open"
  on public.matchs for select
  using (public.match_select_allowed_for_user(id, auth.uid()));

-- Lecture par l’organisateur (évite les échecs sur insert().select() / RETURNING)
create policy "matchs_select_organisateur"
  on public.matchs for select
  to authenticated
  using (organisateur_id = auth.uid());

create policy "matchs_insert_authenticated"
  on public.matchs for insert
  to authenticated
  with check (organisateur_id = auth.uid());

create policy "matchs_update_organisateur"
  on public.matchs for update
  to authenticated
  using (organisateur_id = auth.uid())
  with check (organisateur_id = auth.uid());

create policy "matchs_select_admin"
  on public.matchs for select
  to authenticated
  using (public.auth_is_admin());

-- Participations
create policy "participations_select_visible"
  on public.participations for select
  using (public.participation_select_allowed(match_id, joueur_id, auth.uid()));

create policy "participations_insert_self_open"
  on public.participations for insert
  to authenticated
  with check (
    joueur_id = auth.uid()
    and not public.match_organizer_is(match_id, auth.uid())
    and public.match_accepting_participants(match_id)
  );

-- Organisateur : s’inscrire comme participant (création du match côté app)
create policy "participations_insert_organizer_self"
  on public.participations for insert
  to authenticated
  with check (
    joueur_id = auth.uid()
    and public.match_organizer_is(match_id, auth.uid())
  );

create policy "participations_select_admin"
  on public.participations for select
  to authenticated
  using (public.auth_is_admin());

-- Notes : lecture si participant du match ou organisateur
create policy "notes_select_participant"
  on public.notes for select
  using (public.note_select_allowed(match_id, donneur_id, receveur_id, auth.uid()));

-- Insert note : match terminé, donneur est participant, receveur aussi, pas soi
create policy "notes_insert_rules"
  on public.notes for insert
  to authenticated
  with check (public.note_insert_allowed(match_id, donneur_id, receveur_id));

create policy "notes_update_own"
  on public.notes for update
  to authenticated
  using (donneur_id = auth.uid())
  with check (donneur_id = auth.uid());

create policy "notes_delete_own"
  on public.notes for delete
  to authenticated
  using (donneur_id = auth.uid());

create policy "notes_select_admin"
  on public.notes for select
  to authenticated
  using (public.auth_is_admin());

-- Realtime (optionnel — exécuter seulement si la publication existe et les tables n’y sont pas déjà)
-- alter publication supabase_realtime add table public.matchs;
-- alter publication supabase_realtime add table public.participations;
