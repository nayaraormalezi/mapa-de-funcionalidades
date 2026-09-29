-- Comentários opcionalmente vinculados a uma implementação (FCC).
-- NULL = comentário geral da Feature (compatível com dados existentes).

alter table public.feature_comments
  add column if not exists feature_channel_context_id text
  references public.feature_channel_contexts(id) on delete set null;

create index if not exists feature_comments_fcc_idx
  on public.feature_comments (feature_channel_context_id, created_at desc)
  where feature_channel_context_id is not null;

create index if not exists feature_comments_feature_fcc_idx
  on public.feature_comments (feature_id, feature_channel_context_id, created_at desc);

comment on column public.feature_comments.feature_channel_context_id is
  'NULL = comentário geral da Feature; preenchido = comentário da implementação (FCC).';
