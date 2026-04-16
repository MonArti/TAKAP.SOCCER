-- RPC create_match avec GPS (lieu_lat / lieu_lng) — remplace l’ancienne version 5 args.
-- Sur une base neuve : utiliser schema.sql. Sur base existante : voir aussi fix_matchs_lieu_gps.sql

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
