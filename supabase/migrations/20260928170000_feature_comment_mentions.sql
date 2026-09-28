-- Menções (@) em comentários de funcionalidade.
-- Estrutura preparada para notificações futuras (sem inbox nesta fase).

create table if not exists public.feature_comment_mentions (
  id text primary key,
  comment_id text not null references public.feature_comments(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint feature_comment_mentions_unique unique (comment_id, mentioned_user_id)
);

create index if not exists feature_comment_mentions_comment_idx
  on public.feature_comment_mentions (comment_id);

create index if not exists feature_comment_mentions_user_idx
  on public.feature_comment_mentions (mentioned_user_id, created_at desc);

drop trigger if exists trg_audit_feature_comment_mentions on public.feature_comment_mentions;
create trigger trg_audit_feature_comment_mentions
  after insert or delete or update on public.feature_comment_mentions
  for each row execute function log_audit();

alter table public.feature_comment_mentions enable row level security;

drop policy if exists feature_comment_mentions_select_authenticated
  on public.feature_comment_mentions;
create policy feature_comment_mentions_select_authenticated
  on public.feature_comment_mentions for select to authenticated
  using (true);

drop policy if exists feature_comment_mentions_insert_authenticated
  on public.feature_comment_mentions;
create policy feature_comment_mentions_insert_authenticated
  on public.feature_comment_mentions for insert to authenticated
  with check (
    exists (
      select 1
      from public.feature_comments c
      where c.id = comment_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists feature_comment_mentions_delete_editors
  on public.feature_comment_mentions;
create policy feature_comment_mentions_delete_editors
  on public.feature_comment_mentions for delete to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.active is true
        and p.role in ('admin', 'editor')
    )
    or exists (
      select 1
      from public.feature_comments c
      where c.id = comment_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.feature_comment_mentions is
  'Menções estruturadas de usuários em feature_comments. Nome vem de profiles.';

-- Busca de usuários para @ (não depende de RLS ampla em profiles).
create or replace function public.search_mentionable_profiles(
  q text,
  lim integer default 8
)
returns table (
  id uuid,
  full_name text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email
  from public.profiles p
  where p.active is true
    and (
      nullif(trim(q), '') is null
      or p.full_name ilike '%' || trim(q) || '%'
      or p.email ilike '%' || trim(q) || '%'
    )
  order by
    case
      when nullif(trim(q), '') is null then 1
      when lower(p.full_name) like lower(trim(q)) || '%' then 0
      else 1
    end,
    p.full_name asc
  limit greatest(1, least(coalesce(lim, 8), 20));
$$;

revoke all on function public.search_mentionable_profiles(text, integer) from public;
grant execute on function public.search_mentionable_profiles(text, integer) to authenticated;

-- Resolve nomes públicos de perfis (autores + mencionados) sem abrir profiles inteiro.
create or replace function public.resolve_profile_public_names(ids uuid[])
returns table (
  id uuid,
  full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), 'Usuário') as full_name
  from public.profiles p
  where p.id = any (ids);
$$;

revoke all on function public.resolve_profile_public_names(uuid[]) from public;
grant execute on function public.resolve_profile_public_names(uuid[]) to authenticated;

-- Valida IDs elegíveis a menção (conta ativa no sistema).
create or replace function public.filter_mentionable_user_ids(ids uuid[])
returns table (
  id uuid,
  full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), 'Usuário') as full_name
  from public.profiles p
  where p.active is true
    and p.id = any (ids);
$$;

revoke all on function public.filter_mentionable_user_ids(uuid[]) from public;
grant execute on function public.filter_mentionable_user_ids(uuid[]) to authenticated;
