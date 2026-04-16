-- Parrainage : code unique + lien vers le parrain (profil référent).
-- À exécuter une fois sur le projet Supabase (SQL Editor).

alter table public.profiles
  add column if not exists code_parrainage text;

alter table public.profiles
  add column if not exists parrain_id uuid references public.profiles (id) on delete set null;

comment on column public.profiles.code_parrainage is 'Code court partageable (ex. 8 car. hex), unique.';
comment on column public.profiles.parrain_id is 'Profil du parrain si inscription avec code valide.';

create unique index if not exists profiles_code_parrainage_unique
  on public.profiles (code_parrainage)
  where code_parrainage is not null;

-- Renseigner les profils existants (même règle que les nouveaux : 8 premiers car. de l’UUID sans tirets)
update public.profiles
set code_parrainage = upper(substring(replace(id::text, '-', '') from 1 for 8))
where code_parrainage is null;

-- Inscription Auth : création du profil + code + résolution du parrain depuis raw_user_meta_data.parrainage_recu
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_parrain uuid;
  v_ref text;
begin
  v_code := upper(substring(replace(new.id::text, '-', '') from 1 for 8));
  v_ref := nullif(upper(trim(new.raw_user_meta_data->>'parrainage_recu')), '');
  v_parrain := null;

  if v_ref is not null then
    select p.id into v_parrain
    from public.profiles p
    where p.code_parrainage = v_ref
    limit 1;
    if v_parrain = new.id then
      v_parrain := null;
    end if;
  end if;

  insert into public.profiles (id, email, pseudo, code_parrainage, parrain_id)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'pseudo'), ''), split_part(new.email, '@', 1)),
    v_code,
    v_parrain
  );
  return new;
end;
$$;
