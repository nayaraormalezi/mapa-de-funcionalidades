-- Fase 15.7 — Ticket TI por implementação (FeatureChannelContext)
-- Identificador livre do chamado/ticket; nullable para FCCs existentes.
-- Futuro: ticket_url pode ser adicionado sem mudar o papel deste campo.
alter table public.feature_channel_contexts
  add column if not exists ticket_number text;
