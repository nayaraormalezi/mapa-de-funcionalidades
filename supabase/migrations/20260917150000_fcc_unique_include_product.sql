-- Implementação = Feature × Produto × Contexto de canal.
-- A unique antiga (feature_id, channel_context_id) impedia multi-produto.
alter table feature_channel_contexts
  drop constraint if exists feature_channel_contexts_feature_id_channel_context_id_key;

alter table feature_channel_contexts
  drop constraint if exists feature_channel_contexts_feature_product_channel_key;

alter table feature_channel_contexts
  add constraint feature_channel_contexts_feature_product_channel_key
  unique (feature_id, product_id, channel_context_id);
