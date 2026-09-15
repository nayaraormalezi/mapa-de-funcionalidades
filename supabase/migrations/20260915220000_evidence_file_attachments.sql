-- Anexos de evidências (PDF e imagens) + bucket Storage

ALTER TABLE evidences
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_mime text,
  ADD COLUMN IF NOT EXISTS file_size bigint;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidences',
  'evidences',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "evidences_select_authenticated" ON storage.objects;
CREATE POLICY "evidences_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidences');

DROP POLICY IF EXISTS "evidences_insert_authenticated" ON storage.objects;
CREATE POLICY "evidences_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidences');

DROP POLICY IF EXISTS "evidences_update_authenticated" ON storage.objects;
CREATE POLICY "evidences_update_authenticated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'evidences')
  WITH CHECK (bucket_id = 'evidences');

DROP POLICY IF EXISTS "evidences_delete_authenticated" ON storage.objects;
CREATE POLICY "evidences_delete_authenticated"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidences');
