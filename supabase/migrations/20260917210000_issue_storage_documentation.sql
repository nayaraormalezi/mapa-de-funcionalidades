-- Fase 12 — Documentação: tabela `gaps` armazena Issues (ex-Gap₂).
--
-- Coverage Gap NÃO vive nesta tabela — é derivado de feature_channel_contexts
-- (DetectedCoverageGap / HubCoverageGap).
--
-- Esta migration NÃO renomeia, NÃO faz DROP, NÃO apaga dados.
-- Rename físico `gaps` → `issues` fica para fase futura quando:
--   1) zero consumidores do nome de tabela no app;
--   2) views/compatibilidade documentadas;
--   3) backfill/validação em produção.
--
-- Comentário de catálogo (Postgres) para auditoria.

comment on table gaps is
  'PRISMA Issue (Gap2 legado). Problemas/lacunas registrados manualmente. NÃO confundir com Coverage Gap derivado de FCC.';
