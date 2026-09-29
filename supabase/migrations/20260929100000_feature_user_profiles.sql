-- Feature ↔ Perfil de usuário (cadastrado ou manual).
-- Conceito distinto de Público (Cliente/Economiário/Parceiro) e de responsável da task.

create table if not exists public.feature_user_profiles (
  id text primary key,
  feature_id text not null references public.features(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  profile_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_user_profiles_xor check (
    (
      user_id is not null
      and (profile_name is null or length(trim(profile_name)) = 0)
    )
    or (
      user_id is null
      and profile_name is not null
      and length(trim(profile_name)) between 1 and 120
    )
  )
);

-- Evita duplicar o mesmo usuário cadastrado na feature.
create unique index if not exists feature_user_profiles_feature_user_uidx
  on public.feature_user_profiles (feature_id, user_id)
  where user_id is not null;

-- Evita duplicar o mesmo perfil manual (comparação normalizada).
create unique index if not exists feature_user_profiles_feature_name_uidx
  on public.feature_user_profiles (feature_id, lower(trim(profile_name)))
  where user_id is null and profile_name is not null;

create index if not exists feature_user_profiles_feature_idx
  on public.feature_user_profiles (feature_id, created_at desc);

create index if not exists feature_user_profiles_user_idx
  on public.feature_user_profiles (user_id)
  where user_id is not null;

drop trigger if exists trg_feature_user_profiles_updated on public.feature_user_profiles;
create trigger trg_feature_user_profiles_updated
  before update on public.feature_user_profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_audit_feature_user_profiles on public.feature_user_profiles;
create trigger trg_audit_feature_user_profiles
  after insert or delete or update on public.feature_user_profiles
  for each row execute function log_audit();

alter table public.feature_user_profiles enable row level security;

drop policy if exists feature_user_profiles_select_authenticated
  on public.feature_user_profiles;
create policy feature_user_profiles_select_authenticated
  on public.feature_user_profiles for select to authenticated
  using (true);

drop policy if exists feature_user_profiles_insert_editors
  on public.feature_user_profiles;
create policy feature_user_profiles_insert_editors
  on public.feature_user_profiles for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.active is true
        and p.role in ('admin', 'editor')
    )
  );

drop policy if exists feature_user_profiles_update_editors
  on public.feature_user_profiles;
create policy feature_user_profiles_update_editors
  on public.feature_user_profiles for update to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.active is true
        and p.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.active is true
        and p.role in ('admin', 'editor')
    )
  );

drop policy if exists feature_user_profiles_delete_editors
  on public.feature_user_profiles;
create policy feature_user_profiles_delete_editors
  on public.feature_user_profiles for delete to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.active is true
        and p.role in ('admin', 'editor')
    )
  );

comment on table public.feature_user_profiles is
  'Perfis de usuário associados à Feature: usuário cadastrado (user_id) ou perfil manual (profile_name). Distinto de Público e de responsável da task.';
