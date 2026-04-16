-- Table in-app notifications (RLS : lecture / mise à jour par le propriétaire uniquement).
-- Les INSERT peuvent être faits via service role (Edge Function) ou SQL dashboard.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('match_created', 'new_rating', 'rank_changed')),
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_desc
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_unread
  on public.notifications (user_id)
  where read = false;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Pas de policy INSERT pour authenticated : utiliser la clé service (Edge Function) ou un trigger SECURITY DEFINER.

comment on table public.notifications is 'Notifications in-app par utilisateur ; push OneSignal reste distinct.';
