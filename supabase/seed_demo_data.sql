-- Takap.Soccer — données de démo (matchs terminés, participations, notes)
-- À exécuter dans Supabase → SQL Editor après au moins 3 inscriptions réelles.
--
-- Réexécutable : supprime les matchs dont le lieu contient « [DÉMO Takap] », puis
-- recalcule nb_matchs et note_moyenne pour tous les profils, puis recrée la démo.

do $seed$
declare
  uid uuid[];
  n int;
  r uuid;
  p1 uuid;
  p2 uuid;
  p3 uuid;
  p4 uuid;
  m1 uuid;
  m2 uuid;
  m3 uuid;
begin
  -- 1) Retirer l’ancienne démo
  delete from public.matchs
  where lieu ilike '%[démo takap]%';

  -- 2) Resynchroniser les compteurs (aucun trigger ne décrémente à la suppression)
  update public.profiles set nb_matchs = 0;

  update public.profiles p
  set nb_matchs = sub.c
  from (
    select part.joueur_id, count(*)::int as c
    from public.participations part
    inner join public.matchs m on m.id = part.match_id and m.statut = 'termine'
    group by part.joueur_id
  ) sub
  where p.id = sub.joueur_id;

  for r in select id from public.profiles loop
    perform public.refresh_note_moyenne(r);
  end loop;

  -- 3) Charger jusqu’à 4 profils (les plus anciens)
  select coalesce(array_agg(id order by created_at), '{}')
    into uid
  from (
    select id, created_at from public.profiles order by created_at asc limit 4
  ) t;

  n := coalesce(array_length(uid, 1), 0);
  if n < 3 then
    raise exception
      'Il faut au moins 3 comptes inscrits (profils). Actuellement : %. Créez des comptes via l’app puis relancez ce script.',
      n;
  end if;

  p1 := uid[1];
  p2 := uid[2];
  p3 := uid[3];
  p4 := case when n >= 4 then uid[4] else null end;

  -- --- Match 1 (terminé) : 3 ou 4 joueurs sur le terrain, organisateur p1 ---
  insert into public.matchs (organisateur_id, date_match, heure_match, lieu, prix, nb_max, statut)
  values (
    p1,
    (current_date - 35)::date,
    '10:00'::time,
    'Stade municipal [DÉMO Takap]',
    5,
    10,
    'ouvert'
  )
  returning id into m1;

  insert into public.participations (match_id, joueur_id) values
    (m1, p2),
    (m1, p3);
  if p4 is not null then
    insert into public.participations (match_id, joueur_id) values (m1, p4);
  end if;

  update public.matchs set statut = 'termine' where id = m1;

  -- Notes après clôture (tous les binômes parmi participants)
  if p4 is not null then
    insert into public.notes (match_id, donneur_id, receveur_id, note, created_at) values
      (m1, p2, p3, 4, now() - interval '34 days'),
      (m1, p3, p2, 5, now() - interval '34 days'),
      (m1, p2, p4, 4, now() - interval '34 days'),
      (m1, p4, p2, 5, now() - interval '34 days'),
      (m1, p3, p4, 3, now() - interval '34 days'),
      (m1, p4, p3, 4, now() - interval '34 days');
  else
    insert into public.notes (match_id, donneur_id, receveur_id, note, created_at) values
      (m1, p2, p3, 4, now() - interval '34 days'),
      (m1, p3, p2, 5, now() - interval '34 days');
  end if;

  -- --- Match 2 (terminé), autre composition ---
  insert into public.matchs (organisateur_id, date_match, heure_match, lieu, prix, nb_max, statut)
  values (
    p2,
    (current_date - 14)::date,
    '18:30'::time,
    'Complexe sportif [DÉMO Takap]',
    7,
    12,
    'ouvert'
  )
  returning id into m2;

  insert into public.participations (match_id, joueur_id) values
    (m2, p1),
    (m2, p3);
  if p4 is not null then
    insert into public.participations (match_id, joueur_id) values (m2, p4);
  end if;

  update public.matchs set statut = 'termine' where id = m2;

  if p4 is not null then
    insert into public.notes (match_id, donneur_id, receveur_id, note, created_at) values
      (m2, p1, p3, 4, now() - interval '13 days'),
      (m2, p3, p1, 4, now() - interval '13 days'),
      (m2, p1, p4, 5, now() - interval '13 days'),
      (m2, p4, p1, 4, now() - interval '13 days'),
      (m2, p3, p4, 4, now() - interval '13 days'),
      (m2, p4, p3, 5, now() - interval '13 days');
  else
    insert into public.notes (match_id, donneur_id, receveur_id, note, created_at) values
      (m2, p1, p3, 3, now() - interval '13 days'),
      (m2, p3, p1, 4, now() - interval '13 days');
  end if;

  -- --- Avec 3 profils seulement : troisième match pour noter la paire (p1, p2) ---
  if p4 is null then
    insert into public.matchs (organisateur_id, date_match, heure_match, lieu, prix, nb_max, statut)
    values (
      p3,
      (current_date - 7)::date,
      '09:00'::time,
      'Terrain synthétique [DÉMO Takap]',
      0,
      8,
      'ouvert'
    )
    returning id into m3;

    insert into public.participations (match_id, joueur_id) values
      (m3, p1),
      (m3, p2);

    update public.matchs set statut = 'termine' where id = m3;

    insert into public.notes (match_id, donneur_id, receveur_id, note, created_at) values
      (m3, p1, p2, 5, now() - interval '6 days'),
      (m3, p2, p1, 4, now() - interval '6 days');
  else
    -- Match ouvert à venir (navigation liste des matchs)
    insert into public.matchs (organisateur_id, date_match, heure_match, lieu, prix, nb_max, statut)
    values (
      p3,
      (current_date + 5)::date,
      '19:00'::time,
      'Five city [DÉMO Takap] — prochaine séance',
      6,
      10,
      'ouvert'
    )
    returning id into m3;

    insert into public.participations (match_id, joueur_id) values
      (m3, p1),
      (m3, p4);
  end if;

  -- Optionnel : enrichir un peu les fiches pour la démo
  update public.profiles set age = 28, taille = 178, poids = 74 where id = p1 and (age is null or taille is null);
  update public.profiles set age = 24, taille = 172, poids = 68 where id = p2 and (age is null or taille is null);
  update public.profiles set age = 31, taille = 182, poids = 79 where id = p3 and (age is null or taille is null);
  if p4 is not null then
    update public.profiles set age = 26, taille = 175, poids = 71 where id = p4 and (age is null or taille is null);
  end if;

  raise notice 'Démo Takap : % match(s) créés (ids %, %, %).', 3, m1, m2, m3;
end;
$seed$;
