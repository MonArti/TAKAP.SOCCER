-- Correctif : "infinite recursion detected in policy for relation matchs"
-- À exécuter une fois dans SQL Editor si tu as déjà appliqué l’ancien schema.sql
-- (remplace les policies par des versions qui utilisent des fonctions SECURITY DEFINER)

drop policy if exists "profiles_select_anon_open_matchs" on public.profiles;
drop policy if exists "matchs_select_public_open" on public.matchs;
drop policy if exists "participations_select_visible" on public.participations;
drop policy if exists "participations_insert_self_open" on public.participations;
drop policy if exists "notes_select_participant" on public.notes;
drop policy if exists "notes_insert_rules" on public.notes;

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

create policy "profiles_select_anon_open_matchs"
  on public.profiles for select
  to anon
  using (public.profile_visible_to_anon_open_matchs(id));

create policy "matchs_select_public_open"
  on public.matchs for select
  using (public.match_select_allowed_for_user(id, auth.uid()));

drop policy if exists "matchs_select_organisateur" on public.matchs;
create policy "matchs_select_organisateur"
  on public.matchs for select
  to authenticated
  using (organisateur_id = auth.uid());

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

create policy "notes_select_participant"
  on public.notes for select
  using (public.note_select_allowed(match_id, donneur_id, receveur_id, auth.uid()));

create policy "notes_insert_rules"
  on public.notes for insert
  to authenticated
  with check (public.note_insert_allowed(match_id, donneur_id, receveur_id));
