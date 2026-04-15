-- Rôle admin + policies lecture dashboard (bases déjà créées sans colonne role)
-- 1) SQL Editor → Run ce fichier
-- 2) Promouvoir ton compte (remplace l’UUID par ton user id depuis Authentication → Users) :
--    update public.profiles set role = 'admin' where id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

alter table public.profiles add column if not exists role text default 'user';
update public.profiles set role = 'user' where role is null;
alter table public.profiles alter column role set not null;
alter table public.profiles alter column role set default 'user';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));

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

drop policy if exists "matchs_select_admin" on public.matchs;
create policy "matchs_select_admin"
  on public.matchs for select
  to authenticated
  using (public.auth_is_admin());

drop policy if exists "participations_select_admin" on public.participations;
create policy "participations_select_admin"
  on public.participations for select
  to authenticated
  using (public.auth_is_admin());

drop policy if exists "notes_select_admin" on public.notes;
create policy "notes_select_admin"
  on public.notes for select
  to authenticated
  using (public.auth_is_admin());

-- Temps réel (optionnel) : décommente si la publication existe
-- alter publication supabase_realtime add table public.matchs;
-- alter publication supabase_realtime add table public.participations;
-- alter publication supabase_realtime add table public.profiles;
-- alter publication supabase_realtime add table public.notes;
