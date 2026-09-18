-- Fase 8A: backfill seguro de Evidence.owner (FEATURE | EVALUATION).
-- Regras:
-- 1) feature_id presente + owner ainda NULL → FEATURE / feature_id
-- 2) evaluation_id presente + owner ainda NULL → EVALUATION / evaluation_id
-- 3) NÃO inferir Evaluation por URL/texto
-- 4) NÃO inventar owner para need-only ou evolution-only sem feature_id
-- 5) NÃO apagar rows; total de evidences não diminui

-- Snapshot lógico (comentário operacional — contagens via SELECT no apply).

-- FEATURE: evidências já vinculadas à Feature.
update evidences
set
  owner_type = 'FEATURE',
  owner_id = feature_id
where feature_id is not null
  and owner_type is null;

-- EVALUATION: somente quando evaluation_id já está preenchido (relação explícita).
update evidences
set
  owner_type = 'EVALUATION',
  owner_id = evaluation_id
where evaluation_id is not null
  and owner_type is null;

-- Harmonizar evaluation_id quando owner já é EVALUATION mas evaluation_id vazio.
update evidences
set evaluation_id = owner_id
where owner_type = 'EVALUATION'
  and owner_id is not null
  and evaluation_id is null
  and exists (
    select 1
    from feature_channel_evaluations e
    where e.id = evidences.owner_id
  );

-- Gap.evidence_ids: NÃO altera ownership aqui.
-- Se a Evidence já tinha feature_id alinhado à Issue, o UPDATE FEATURE acima.
-- Referências gap.evidence_ids permanecem como fallback de leitura.
