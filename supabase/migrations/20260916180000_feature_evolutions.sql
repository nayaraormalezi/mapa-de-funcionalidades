-- Evoluções/melhorias vinculadas a uma implementação (feature_channel_contexts).
-- Não altera a fase da implementação; a evolução tem fase e status próprios.

CREATE TABLE IF NOT EXISTS feature_evolutions (
  id text PRIMARY KEY,
  feature_channel_context_id text NOT NULL REFERENCES feature_channel_contexts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  phase text NOT NULL DEFAULT 'BACKLOG',
  status text NOT NULL DEFAULT 'IN_PROGRESS',
  priority text NOT NULL DEFAULT 'MEDIUM',
  start_date date,
  expected_date date,
  completed_date date,
  responsible text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_evolutions_fcc
  ON feature_evolutions (feature_channel_context_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_feature_evolutions_status
  ON feature_evolutions (status)
  WHERE active = true;

-- Demo: Consultar produtos · Autocompra (disponível) com evolução em UX/UI
INSERT INTO feature_evolutions (
  id,
  feature_channel_context_id,
  title,
  description,
  phase,
  status,
  priority,
  start_date,
  expected_date,
  completed_date,
  responsible,
  notes,
  active
)
SELECT
  'fevo-prod-autocompra-redesenho',
  'fcc-prod-autocompra',
  'Melhorar experiência de consulta de produtos',
  'Redesenho da experiência de consulta para reduzir fricção e aumentar conversão.',
  'UX_UI',
  'IN_PROGRESS',
  'HIGH',
  '2026-08-01',
  '2026-11-15',
  NULL,
  'Carla PO',
  'DEMO',
  true
WHERE EXISTS (
  SELECT 1 FROM feature_channel_contexts WHERE id = 'fcc-prod-autocompra'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO feature_evolutions (
  id,
  feature_channel_context_id,
  title,
  description,
  phase,
  status,
  priority,
  start_date,
  expected_date,
  completed_date,
  responsible,
  notes,
  active
)
SELECT
  'fevo-sim-ibc-acessibilidade',
  'fcc-sim-ibc',
  'Acessibilidade na simulação IBC',
  'Adequação WCAG e leitura de tela no fluxo de simulação.',
  'DEVELOPMENT',
  'IN_PROGRESS',
  'MEDIUM',
  '2026-07-01',
  '2026-10-30',
  NULL,
  'Carla PO',
  'DEMO',
  true
WHERE EXISTS (
  SELECT 1 FROM feature_channel_contexts WHERE id = 'fcc-sim-ibc'
)
ON CONFLICT (id) DO NOTHING;
