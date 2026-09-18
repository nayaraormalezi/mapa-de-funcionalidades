-- Avaliação por implementação (Feature × Canal × Produto)
ALTER TABLE public.feature_channel_contexts
  ADD COLUMN IF NOT EXISTS evaluation_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS research_date date,
  ADD COLUMN IF NOT EXISTS research_file_path text,
  ADD COLUMN IF NOT EXISTS research_file_name text,
  ADD COLUMN IF NOT EXISTS research_file_mime text,
  ADD COLUMN IF NOT EXISTS research_file_size integer,
  ADD COLUMN IF NOT EXISTS needs_evolution boolean NOT NULL DEFAULT false;
