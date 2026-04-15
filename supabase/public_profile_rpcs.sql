-- Takap.Soccer — RPC pour la page profil public (historique de notes agrégé + moyennes communauté)
-- À exécuter sur une base existante si vous n’appliquez pas tout schema.sql.

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
