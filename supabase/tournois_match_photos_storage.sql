-- Takap Soccer — tournois, photos de match, scores équipes, storage
-- À exécuter dans Supabase SQL Editor (vérifie les messages d’erreur si une ressource existe déjà).

-- ---------------------------------------------------------------------------
-- Colonnes scores sur matchs (si pas déjà présentes)
-- ---------------------------------------------------------------------------
alter table public.matchs add column if not exists score_domicile integer;
alter table public.matchs add column if not exists score_exterieur integer;

-- ---------------------------------------------------------------------------
-- Tournois
-- ---------------------------------------------------------------------------
create table if not exists public.tournois (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  date_debut date,
  date_fin date,
  lieu text,
  type text check (type is null or type in ('elimination', 'poules')),
  statut text not null default 'planifie',
  organisateur_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.tournoi_participants (
  tournoi_id uuid not null references public.tournois (id) on delete cascade,
  equipe_id uuid not null references public.equipes (id) on delete cascade,
  points integer not null default 0,
  buts_pour integer not null default 0,
  buts_contre integer not null default 0,
  primary key (tournoi_id, equipe_id)
);

create index if not exists tournoi_participants_equipe_id_idx on public.tournoi_participants (equipe_id);

-- ---------------------------------------------------------------------------
-- Photos de match
-- ---------------------------------------------------------------------------
create table if not exists public.match_photos (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matchs (id) on delete cascade,
  url text not null,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists match_photos_match_id_idx on public.match_photos (match_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tournois enable row level security;
alter table public.tournoi_participants enable row level security;
alter table public.match_photos enable row level security;

drop policy if exists tournois_select_all on public.tournois;
create policy tournois_select_all on public.tournois for select using (true);

drop policy if exists tournois_insert_own on public.tournois;
create policy tournois_insert_own on public.tournois for insert to authenticated
  with check (organisateur_id = auth.uid());

drop policy if exists tournois_update_own on public.tournois;
create policy tournois_update_own on public.tournois for update to authenticated
  using (organisateur_id = auth.uid())
  with check (organisateur_id = auth.uid());

drop policy if exists tournoi_participants_select on public.tournoi_participants;
create policy tournoi_participants_select on public.tournoi_participants for select using (true);

drop policy if exists tournoi_participants_insert_auth on public.tournoi_participants;
create policy tournoi_participants_insert_auth on public.tournoi_participants for insert to authenticated
  with check (true);

drop policy if exists tournoi_participants_delete_auth on public.tournoi_participants;
create policy tournoi_participants_delete_auth on public.tournoi_participants for delete to authenticated
  using (true);

drop policy if exists match_photos_select on public.match_photos;
create policy match_photos_select on public.match_photos for select using (true);

drop policy if exists match_photos_insert_own on public.match_photos;
create policy match_photos_insert_own on public.match_photos for insert to authenticated
  with check (uploaded_by = auth.uid());

drop policy if exists match_photos_delete_own on public.match_photos;
create policy match_photos_delete_own on public.match_photos for delete to authenticated
  using (uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage : bucket public match-photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-photos',
  'match-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists match_photos_storage_read on storage.objects;
create policy match_photos_storage_read on storage.objects for select
  using (bucket_id = 'match-photos');

drop policy if exists match_photos_storage_insert on storage.objects;
create policy match_photos_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'match-photos');

drop policy if exists match_photos_storage_update on storage.objects;
create policy match_photos_storage_update on storage.objects for update to authenticated
  using (bucket_id = 'match-photos');

drop policy if exists match_photos_storage_delete on storage.objects;
create policy match_photos_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'match-photos');
