-- Si "new row violates row-level security policy for table matchs" à la création
-- (souvent : insert().select() exige une policy SELECT sur la ligne tout juste insérée)
-- Exécute ce script une fois dans SQL Editor.

drop policy if exists "matchs_select_organisateur" on public.matchs;

create policy "matchs_select_organisateur"
  on public.matchs for select
  to authenticated
  using (organisateur_id = auth.uid());
