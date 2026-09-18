-- Fase 8B: materializar anexos de Evaluation como Evidence (append-only).
-- Idempotente: IDs determinísticos evm-{evaluation_id}-{kind}.
-- NÃO remove research_url / report_url / figma_url / evidence_file_*.
-- NÃO inventa Evaluation por URL; só materializa campos explícitos da Evaluation.

-- research_url → UX_RESEARCH
insert into evidences (
  id,
  feature_id,
  user_need_id,
  feature_evolution_id,
  evaluation_id,
  owner_type,
  owner_id,
  title,
  type,
  description,
  link,
  evidence_date,
  responsible,
  active,
  file_path,
  file_name,
  file_mime,
  file_size
)
select
  'evm-' || e.id || '-research',
  e.feature_id,
  null,
  null,
  e.id,
  'EVALUATION',
  e.id,
  'Link da pesquisa',
  'UX_RESEARCH',
  '',
  e.research_url,
  coalesce(e.evaluated_at::date, e.created_at::date, current_date),
  coalesce(e.responsible, ''),
  true,
  null,
  null,
  null,
  null
from feature_channel_evaluations e
where coalesce(e.active, true)
  and coalesce(e.research_url, '') <> ''
  and not exists (
    select 1 from evidences x where x.id = 'evm-' || e.id || '-research'
  )
  and not exists (
    select 1
    from evidences x
    where x.evaluation_id = e.id
      and x.owner_type = 'EVALUATION'
      and x.link is not null
      and x.link = e.research_url
  );

-- report_url → OTHER
insert into evidences (
  id,
  feature_id,
  user_need_id,
  feature_evolution_id,
  evaluation_id,
  owner_type,
  owner_id,
  title,
  type,
  description,
  link,
  evidence_date,
  responsible,
  active,
  file_path,
  file_name,
  file_mime,
  file_size
)
select
  'evm-' || e.id || '-report',
  e.feature_id,
  null,
  null,
  e.id,
  'EVALUATION',
  e.id,
  'Relatório',
  'OTHER',
  '',
  e.report_url,
  coalesce(e.evaluated_at::date, e.created_at::date, current_date),
  coalesce(e.responsible, ''),
  true,
  null,
  null,
  null,
  null
from feature_channel_evaluations e
where coalesce(e.active, true)
  and coalesce(e.report_url, '') <> ''
  and not exists (
    select 1 from evidences x where x.id = 'evm-' || e.id || '-report'
  )
  and not exists (
    select 1
    from evidences x
    where x.evaluation_id = e.id
      and x.owner_type = 'EVALUATION'
      and x.link is not null
      and x.link = e.report_url
  );

-- figma_url → OTHER (artefato anexado à avaliação)
insert into evidences (
  id,
  feature_id,
  user_need_id,
  feature_evolution_id,
  evaluation_id,
  owner_type,
  owner_id,
  title,
  type,
  description,
  link,
  evidence_date,
  responsible,
  active,
  file_path,
  file_name,
  file_mime,
  file_size
)
select
  'evm-' || e.id || '-figma',
  e.feature_id,
  null,
  null,
  e.id,
  'EVALUATION',
  e.id,
  'Figma',
  'OTHER',
  '',
  e.figma_url,
  coalesce(e.evaluated_at::date, e.created_at::date, current_date),
  coalesce(e.responsible, ''),
  true,
  null,
  null,
  null,
  null
from feature_channel_evaluations e
where coalesce(e.active, true)
  and coalesce(e.figma_url, '') <> ''
  and not exists (
    select 1 from evidences x where x.id = 'evm-' || e.id || '-figma'
  )
  and not exists (
    select 1
    from evidences x
    where x.evaluation_id = e.id
      and x.owner_type = 'EVALUATION'
      and x.link is not null
      and x.link = e.figma_url
  );

-- evidence_file_* → OTHER (arquivo)
insert into evidences (
  id,
  feature_id,
  user_need_id,
  feature_evolution_id,
  evaluation_id,
  owner_type,
  owner_id,
  title,
  type,
  description,
  link,
  evidence_date,
  responsible,
  active,
  file_path,
  file_name,
  file_mime,
  file_size
)
select
  'evm-' || e.id || '-file',
  e.feature_id,
  null,
  null,
  e.id,
  'EVALUATION',
  e.id,
  coalesce(nullif(e.evidence_file_name, ''), 'Arquivo anexado'),
  'OTHER',
  '',
  null,
  coalesce(e.evaluated_at::date, e.created_at::date, current_date),
  coalesce(e.responsible, ''),
  true,
  e.evidence_file_path,
  e.evidence_file_name,
  e.evidence_file_mime,
  e.evidence_file_size
from feature_channel_evaluations e
where coalesce(e.active, true)
  and (
    e.evidence_file_path is not null
    or coalesce(e.evidence_file_name, '') <> ''
  )
  and not exists (
    select 1 from evidences x where x.id = 'evm-' || e.id || '-file'
  )
  and not exists (
    select 1
    from evidences x
    where x.evaluation_id = e.id
      and x.owner_type = 'EVALUATION'
      and x.file_path is not null
      and e.evidence_file_path is not null
      and x.file_path = e.evidence_file_path
  );
