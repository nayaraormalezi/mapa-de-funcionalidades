-- Fase 5: origem estruturada de FeatureEvolution.
-- NÃO aplicar automaticamente em produção sem revisão.
-- Coluna nullable: Evolutions legadas ficam NULL → app normaliza para MANUAL.

alter table feature_evolutions
  add column if not exists origin text;

comment on column feature_evolutions.origin is
  'Origem da evolução: MANUAL | COVERAGE_GAP | OPPORTUNITY | ISSUE';

-- Constraint apenas em valores conhecidos (NULL permitido = legado).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'feature_evolutions_origin_check'
  ) then
    alter table feature_evolutions
      add constraint feature_evolutions_origin_check
      check (
        origin is null
        or origin in ('MANUAL', 'COVERAGE_GAP', 'OPPORTUNITY', 'ISSUE')
      );
  end if;
end $$;
