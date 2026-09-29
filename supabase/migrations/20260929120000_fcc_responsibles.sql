-- Responsável pela execução da implementação (FCC) e da evolução.
-- Conceito distinto de Público e do antigo (incorreto) feature_user_profiles.

-- 1) Remover estrutura conceitualmente errada (sem dados reais em produção).
drop trigger if exists trg_audit_feature_user_profiles on public.feature_user_profiles;
drop trigger if exists trg_feature_user_profiles_updated on public.feature_user_profiles;
drop table if exists public.feature_user_profiles cascade;

-- 2) Responsáveis da implementação (FeatureChannelContext).
create table if not exists public.feature_channel_context_responsibles (
  id text primary key,
  feature_channel_context_id text not null
    references public.feature_channel_contexts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  responsible_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fcc_responsibles_xor check (
    (
      user_id is not null
      and (responsible_name is null or length(trim(responsible_name)) = 0)
    )
    or (
      user_id is null
      and responsible_name is not null
      and length(trim(responsible_name)) between 1 and 120
    )
  )
);

create unique index if not exists fcc_responsibles_fcc_user_uidx
  on public.feature_channel_context_responsibles (feature_channel_context_id, user_id)
  where user_id is not null;

create unique index if not exists fcc_responsibles_fcc_name_uidx
  on public.feature_channel_context_responsibles (
    feature_channel_context_id,
    lower(trim(responsible_name))
  )
  where user_id is null and responsible_name is not null;

create index if not exists fcc_responsibles_fcc_idx
  on public.feature_channel_context_responsibles (
    feature_channel_context_id,
    created_at desc
  );

drop trigger if exists trg_fcc_responsibles_updated
  on public.feature_channel_context_responsibles;
create trigger trg_fcc_responsibles_updated
  before update on public.feature_channel_context_responsibles
  for each row execute function set_updated_at();

drop trigger if exists trg_audit_fcc_responsibles
  on public.feature_channel_context_responsibles;
create trigger trg_audit_fcc_responsibles
  after insert or delete or update on public.feature_channel_context_responsibles
  for each row execute function log_audit();

alter table public.feature_channel_context_responsibles enable row level security;

drop policy if exists fcc_responsibles_select_authenticated
  on public.feature_channel_context_responsibles;
create policy fcc_responsibles_select_authenticated
  on public.feature_channel_context_responsibles for select to authenticated
  using (true);

drop policy if exists fcc_responsibles_insert_editors
  on public.feature_channel_context_responsibles;
create policy fcc_responsibles_insert_editors
  on public.feature_channel_context_responsibles for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active is true and p.role in ('admin', 'editor')
    )
  );

drop policy if exists fcc_responsibles_update_editors
  on public.feature_channel_context_responsibles;
create policy fcc_responsibles_update_editors
  on public.feature_channel_context_responsibles for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active is true and p.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active is true and p.role in ('admin', 'editor')
    )
  );

drop policy if exists fcc_responsibles_delete_editors
  on public.feature_channel_context_responsibles;
create policy fcc_responsibles_delete_editors
  on public.feature_channel_context_responsibles for delete to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active is true and p.role in ('admin', 'editor')
    )
  );

comment on table public.feature_channel_context_responsibles is
  'Responsáveis pela execução/acompanhamento da implementação (FCC). Distinto de Público.';

-- Migrar texto legado FCC.responsible → responsável manual (quando houver).
insert into public.feature_channel_context_responsibles (
  id,
  feature_channel_context_id,
  user_id,
  responsible_name,
  created_by,
  created_at,
  updated_at
)
select
  'fcr-' || substr(md5(fcc.id || ':' || trim(fcc.responsible)), 1, 12),
  fcc.id,
  null,
  left(trim(fcc.responsible), 120),
  null,
  now(),
  now()
from public.feature_channel_contexts fcc
where nullif(trim(fcc.responsible), '') is not null
  and not exists (
    select 1
    from public.feature_channel_context_responsibles r
    where r.feature_channel_context_id = fcc.id
  );

-- 3) Responsáveis da evolução (mesma semântica na unidade de trabalho).
create table if not exists public.feature_evolution_responsibles (
  id text primary key,
  feature_evolution_id text not null
    references public.feature_evolutions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  responsible_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evo_responsibles_xor check (
    (
      user_id is not null
      and (responsible_name is null or length(trim(responsible_name)) = 0)
    )
    or (
      user_id is null
      and responsible_name is not null
      and length(trim(responsible_name)) between 1 and 120
    )
  )
);

create unique index if not exists evo_responsibles_evo_user_uidx
  on public.feature_evolution_responsibles (feature_evolution_id, user_id)
  where user_id is not null;

create unique index if not exists evo_responsibles_evo_name_uidx
  on public.feature_evolution_responsibles (
    feature_evolution_id,
    lower(trim(responsible_name))
  )
  where user_id is null and responsible_name is not null;

create index if not exists evo_responsibles_evo_idx
  on public.feature_evolution_responsibles (feature_evolution_id, created_at desc);

drop trigger if exists trg_evo_responsibles_updated
  on public.feature_evolution_responsibles;
create trigger trg_evo_responsibles_updated
  before update on public.feature_evolution_responsibles
  for each row execute function set_updated_at();

drop trigger if exists trg_audit_evo_responsibles
  on public.feature_evolution_responsibles;
create trigger trg_audit_evo_responsibles
  after insert or delete or update on public.feature_evolution_responsibles
  for each row execute function log_audit();

alter table public.feature_evolution_responsibles enable row level security;

drop policy if exists evo_responsibles_select_authenticated
  on public.feature_evolution_responsibles;
create policy evo_responsibles_select_authenticated
  on public.feature_evolution_responsibles for select to authenticated
  using (true);

drop policy if exists evo_responsibles_insert_editors
  on public.feature_evolution_responsibles;
create policy evo_responsibles_insert_editors
  on public.feature_evolution_responsibles for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active is true and p.role in ('admin', 'editor')
    )
  );

drop policy if exists evo_responsibles_update_editors
  on public.feature_evolution_responsibles;
create policy evo_responsibles_update_editors
  on public.feature_evolution_responsibles for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active is true and p.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active is true and p.role in ('admin', 'editor')
    )
  );

drop policy if exists evo_responsibles_delete_editors
  on public.feature_evolution_responsibles;
create policy evo_responsibles_delete_editors
  on public.feature_evolution_responsibles for delete to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active is true and p.role in ('admin', 'editor')
    )
  );

comment on table public.feature_evolution_responsibles is
  'Responsáveis pela execução/acompanhamento da evolução. Distinto de Público.';

insert into public.feature_evolution_responsibles (
  id,
  feature_evolution_id,
  user_id,
  responsible_name,
  created_by,
  created_at,
  updated_at
)
select
  'evr-' || substr(md5(e.id || ':' || trim(e.responsible)), 1, 12),
  e.id,
  null,
  left(trim(e.responsible), 120),
  null,
  now(),
  now()
from public.feature_evolutions e
where nullif(trim(e.responsible), '') is not null
  and not exists (
    select 1
    from public.feature_evolution_responsibles r
    where r.feature_evolution_id = e.id
  );
