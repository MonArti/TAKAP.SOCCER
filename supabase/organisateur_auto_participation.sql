-- Organisateur automatiquement participant à son match (notation + nb_matchs au trigger).
-- 1) Politique RLS : l’insert client « soi-même » était interdite aux organisateurs (participations_insert_self_open).

drop policy if exists "participations_insert_organizer_self" on public.participations;

create policy "participations_insert_organizer_self"
  on public.participations
  for insert
  to authenticated
  with check (
    joueur_id = auth.uid()
    and public.match_organizer_is(match_id, auth.uid())
  );

-- 2) Rattrapage (optionnel) : matchs déjà créés sans ligne participation pour l’organisateur
insert into public.participations (match_id, joueur_id, a_paye)
select m.id, m.organisateur_id, false
from public.matchs m
where not exists (
  select 1
  from public.participations p
  where p.match_id = m.id
    and p.joueur_id = m.organisateur_id
)
on conflict (match_id, joueur_id) do nothing;
