-- Necessidade transversal entre públicos (aplicabilidade multi).
alter table user_needs
  add column if not exists audience_ids text[] not null default '{}';

comment on column user_needs.audience_ids is
  'Públicos aos quais a necessidade se aplica. Vazio = todos os públicos.';
