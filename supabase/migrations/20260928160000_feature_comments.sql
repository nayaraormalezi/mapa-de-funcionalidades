-- Comentários em funcionalidades (Fase comentários).
-- Respostas = mesma tabela com parent_comment_id.

create table if not exists public.feature_comments (
  id text primary key,
  feature_id text not null references public.features(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id text references public.feature_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_comments_content_not_blank check (length(trim(content)) > 0)
);

create index if not exists feature_comments_feature_idx
  on public.feature_comments (feature_id, created_at desc);

create index if not exists feature_comments_parent_idx
  on public.feature_comments (parent_comment_id, created_at desc);

drop trigger if exists trg_feature_comments_updated on public.feature_comments;
create trigger trg_feature_comments_updated
  before update on public.feature_comments
  for each row execute function set_updated_at();

drop trigger if exists trg_audit_feature_comments on public.feature_comments;
create trigger trg_audit_feature_comments
  after insert or delete or update on public.feature_comments
  for each row execute function log_audit();

alter table public.feature_comments enable row level security;

drop policy if exists feature_comments_select_authenticated on public.feature_comments;
create policy feature_comments_select_authenticated
  on public.feature_comments for select to authenticated
  using (true);

drop policy if exists feature_comments_insert_authenticated on public.feature_comments;
create policy feature_comments_insert_authenticated
  on public.feature_comments for insert to authenticated
  with check (user_id = auth.uid());

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

comment on table public.feature_comments is
  'Comentários e respostas (1 nível) vinculados a uma Feature. parent_comment_id NULL = principal.';
