-- Status = prazo (ON_TRACK / DELAYED / NO_DEADLINE); Etapa permanece em phase.
-- Converte enum legado feature_status para text e remapeia valores.

ALTER TABLE feature_channel_contexts
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE feature_channel_contexts
  ALTER COLUMN status TYPE text USING status::text;

UPDATE feature_channel_contexts
SET status = CASE
  WHEN COALESCE(phase, '') IN ('AVAILABLE', 'REMOVED') THEN 'ON_TRACK'
  WHEN expected_date IS NULL THEN 'NO_DEADLINE'
  WHEN expected_date::date < CURRENT_DATE THEN 'DELAYED'
  ELSE 'ON_TRACK'
END
WHERE status IS DISTINCT FROM 'ON_TRACK'
  AND status IS DISTINCT FROM 'DELAYED'
  AND status IS DISTINCT FROM 'NO_DEADLINE';

ALTER TABLE feature_channel_contexts
  ALTER COLUMN status SET DEFAULT 'NO_DEADLINE';

UPDATE feature_channel_contexts
SET phase = COALESCE(NULLIF(phase, ''), 'BACKLOG')
WHERE phase IS NULL OR phase = '';
