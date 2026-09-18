-- Avaliações UX/CX por funcionalidade × contexto de canal (histórico).
-- Hierarquia: Área → Tipo de estudo → Método → Resultado → Evidências

CREATE TABLE IF NOT EXISTS public.feature_channel_evaluations (
  id text PRIMARY KEY,
  feature_id text NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  channel_context_id text NOT NULL REFERENCES public.channel_contexts(id) ON DELETE CASCADE,
  feature_channel_context_id text REFERENCES public.feature_channel_contexts(id) ON DELETE SET NULL,
  area text NOT NULL,
  study_type text NOT NULL DEFAULT 'CUSTOM',
  method_code text NOT NULL,
  method_custom_name text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'PLANNED',
  evaluated_at date,
  responsible text NOT NULL DEFAULT '',
  audience_segment text NOT NULL DEFAULT '',
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  research_url text,
  report_url text,
  figma_url text,
  evidence_file_path text,
  evidence_file_name text,
  evidence_file_mime text,
  evidence_file_size integer,
  needs_evolution boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_channel_evaluations_feature_idx
  ON public.feature_channel_evaluations (feature_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS feature_channel_evaluations_channel_ctx_idx
  ON public.feature_channel_evaluations (feature_id, channel_context_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS feature_channel_evaluations_area_status_idx
  ON public.feature_channel_evaluations (area, status)
  WHERE active = true;
