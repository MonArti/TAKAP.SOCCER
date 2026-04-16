-- Invitations joueurs → match (aucune réservation de place ; l’invité doit cliquer « Rejoindre » sur la fiche match).
-- Exécuter après schema.sql / notifications_table.sql

-- 1) Table invitations
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matchs (id) on delete cascade,
  inviteur_id uuid not null references auth.users (id) on delete cascade,
  invite_id uuid not null references auth.users (id) on delete cascade,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'acceptee', 'refusee', 'ignoree')),
  cree_le timestamptz not null default now(),
  unique (match_id, invite_id, inviteur_id)
);

create index if not exists invitations_match_id_idx on public.invitations (match_id);
create index if not exists invitations_invite_id_idx on public.invitations (invite_id);
create index if not exists invitations_inviteur_id_idx on public.invitations (inviteur_id);

comment on table public.invitations is 'Invitation à rejoindre un match : notification + raccourci ; pas de place réservée.';

-- 2) Étendre les types de notifications (pour le trigger ci-dessous)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('match_created', 'new_rating', 'rank_changed', 'match_invite'));

-- 3) Notification automatique à l’insertion (SECURITY DEFINER → contourne RLS notifications INSERT)
create or replace function public.notify_on_match_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lieu_txt text;
  inviter_name text;
begin
  select m.lieu into lieu_txt from public.matchs m where m.id = new.match_id;
  select p.pseudo into inviter_name from public.profiles p where p.id = new.inviteur_id;

  insert into public.notifications (user_id, type, content)
  values (
    new.invite_id,
    'match_invite',
    format(
      '%s t''invite à rejoindre un match%s. Ouvre la fiche du match et clique sur « Rejoindre » pour t''inscrire (aucune place n''est réservée par l''invitation).',
      coalesce(nullif(trim(inviter_name), ''), 'Un joueur'),
      case
        when lieu_txt is not null and length(trim(lieu_txt)) > 0 then ' — ' || trim(lieu_txt)
        else ''
      end
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_invitations_notify on public.invitations;
create trigger trg_invitations_notify
  after insert on public.invitations
  for each row
  execute function public.notify_on_match_invitation();

-- 4) Quand le joueur s’inscrit vraiment (participation), marquer l’invitation acceptée
create or replace function public.invitation_mark_acceptee_on_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invitations
  set statut = 'acceptee'
  where match_id = new.match_id
    and invite_id = new.joueur_id
    and statut = 'en_attente';
  return new;
end;
$$;

drop trigger if exists trg_participation_invitation_accept on public.participations;
create trigger trg_participation_invitation_accept
  after insert on public.participations
  for each row
  execute function public.invitation_mark_acceptee_on_join();

-- 5) RLS
alter table public.invitations enable row level security;

-- Lecture : invité, inviteur, ou organisateur du match
create policy "invitations_select_related"
  on public.invitations
  for select
  to authenticated
  using (
    invite_id = auth.uid()
    or inviteur_id = auth.uid()
    or exists (
      select 1 from public.matchs m
      where m.id = invitations.match_id
        and m.organisateur_id = auth.uid()
    )
  );

-- Insertion : seulement si tu es l’inviteur (JWT) et que tu es organisateur OU déjà inscrit au match ;
-- match ouvert ; pas déjà inscrit comme invité ; pas d’auto-invitation
create policy "invitations_insert_by_org_or_participant"
  on public.invitations
  for insert
  to authenticated
  with check (
    inviteur_id = auth.uid()
    and invite_id <> auth.uid()
    and exists (
      select 1 from public.matchs m
      where m.id = match_id
        and m.statut = 'ouvert'::match_statut
        and (
          m.organisateur_id = auth.uid()
          or exists (
            select 1 from public.participations p
            where p.match_id = m.id
              and p.joueur_id = auth.uid()
          )
        )
    )
    and not exists (
      select 1 from public.participations p2
      where p2.match_id = match_id
        and p2.joueur_id = invite_id
    )
  );

-- Mise à jour : l’invité peut passer en refusé / ignoré (pas de « acceptation » ici : ça passe par Rejoindre)
create policy "invitations_update_by_invitee_status"
  on public.invitations
  for update
  to authenticated
  using (invite_id = auth.uid())
  with check (
    invite_id = auth.uid()
    and statut in ('refusee', 'ignoree')
  );

-- Suppression : l’inviteur peut retirer une invitation encore en attente
create policy "invitations_delete_by_inviter_pending"
  on public.invitations
  for delete
  to authenticated
  using (inviteur_id = auth.uid() and statut = 'en_attente');
