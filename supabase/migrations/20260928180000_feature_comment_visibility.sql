-- Visibilidade de comentários: PUBLIC | INTERNAL
-- Comentários existentes → PUBLIC (default seguro).

alter table public.feature_comments
  add column if not exists visibility text not null default 'PUBLIC';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'feature_comments_visibility_check'
      and conrelid = 'public.feature_comments'::regclass
  ) then
    alter table public.feature_comments
      add constraint feature_comments_visibility_check
      check (visibility in ('PUBLIC', 'INTERNAL'));
  end if;
end $$;

-- Backfill defensivo (idempotente).
update public.feature_comments
set visibility = 'PUBLIC'
where visibility is null
   or visibility not in ('PUBLIC', 'INTERNAL');

create index if not exists feature_comments_feature_visibility_idx
  on public.feature_comments (feature_id, visibility, created_at desc);

-- SELECT: públicos para autenticados; internos só admin/editor ativos.
drop policy if exists feature_comments_select_authenticated on public.feature_comments;
create policy feature_comments_select_authenticated
  on public.feature_comments for select to authenticated
  using (
    visibility = 'PUBLIC'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.active is true
        and p.role in ('admin', 'editor')
    )
  );

-- INSERT: autor = self; viewer só PUBLIC; admin/editor PUBLIC|INTERNAL.
drop policy if exists feature_comments_insert_authenticated on public.feature_comments;
create policy feature_comments_insert_authenticated
  on public.feature_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      visibility = 'PUBLIC'
      or (
        visibility = 'INTERNAL'
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.active is true
            and p.role in ('admin', 'editor')
        )
      )
    )
  );

-- DELETE permanece admin/editor (política existente).
drop policy if exists feature_comments_delete_editors on public.feature_comments;
create policy feature_comments_delete_editors
  on public.feature_comments for delete to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.active is true
        and p.role in ('admin', 'editor')
    )
  );

comment on column public.feature_comments.visibility is
  'PUBLIC = todos os perfis autenticados; INTERNAL = somente admin/editor.';

-- Busca @ com filtro opcional de roles (interno = admin/editor).
create or replace function public.search_mentionable_profiles(
  q text,
  lim integer default 8,
  allowed_roles text[] default null
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
      allowed_roles is null
      or p.role = any (allowed_roles)
    )
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

revoke all on function public.search_mentionable_profiles(text, integer, text[]) from public;
grant execute on function public.search_mentionable_profiles(text, integer, text[]) to authenticated;

-- Drop sobrecarga antiga (2 args) se existir, para evitar ambiguidade.
drop function if exists public.search_mentionable_profiles(text, integer);

-- Valida IDs mencionáveis com filtro opcional de roles.
create or replace function public.filter_mentionable_user_ids(
  ids uuid[],
  allowed_roles text[] default null
)
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
    and p.id = any (ids)
    and (
      allowed_roles is null
      or p.role = any (allowed_roles)
    );
$$;

revoke all on function public.filter_mentionable_user_ids(uuid[], text[]) from public;
grant execute on function public.filter_mentionable_user_ids(uuid[], text[]) to authenticated;

drop function if exists public.filter_mentionable_user_ids(uuid[]);
