-- Fase 8A: owner canônico de Evidence (FEATURE | EVALUATION).
-- Seguro: apenas ADD COLUMN nullable + check + indexes.
-- Sem DROP de colunas/tabelas. Registros legados podem ficar com owner NULL.
-- NÃO altera evidences_one_subject nesta migration (preserva compatibilidade).

alter table evidences
  add column if not exists evaluation_id text references feature_channel_evaluations (id) on delete set null;

alter table evidences
  add column if not exists owner_type text;

alter table evidences
  add column if not exists owner_id text;

comment on column evidences.evaluation_id is
  'Owner EVALUATION — FeatureChannelEvaluation.id (canônico Fase 7/8A)';

comment on column evidences.owner_type is
  'FEATURE | EVALUATION — owner canônico; NULL = legado pendente';

comment on column evidences.owner_id is
  'Id do owner (feature_id ou evaluation_id). Sem FK polimórfica.';

create index if not exists evidences_evaluation_idx
  on evidences (evaluation_id);

create index if not exists evidences_owner_idx
  on evidences (owner_type, owner_id);

-- Constraint apenas em valores conhecidos (NULL permitido = legado).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evidences_owner_type_check'
  ) then
    alter table evidences
      add constraint evidences_owner_type_check
      check (
        owner_type is null
        or owner_type in ('FEATURE', 'EVALUATION')
      );
  end if;
end $$;

-- Gap.evidence_ids permanece (DEPRECATED na app). Não remover nesta fase.
-- Nota: evidences_one_subject continua exigindo feature_id | user_need_id | feature_evolution_id.
-- App denormaliza feature_id em Evidence de EVALUATION para satisfazer o check.
