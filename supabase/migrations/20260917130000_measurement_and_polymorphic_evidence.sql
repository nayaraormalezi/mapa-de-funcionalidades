-- Mensuração de sucesso + evidências polimórficas (necessidade / evolução / funcionalidade)

alter table user_needs
  add column if not exists measurement text not null default '';

alter table feature_evolutions
  add column if not exists measurement text not null default '';

alter table evidences
  alter column feature_id drop not null;

alter table evidences
  add column if not exists user_need_id text references user_needs (id) on delete set null,
  add column if not exists feature_evolution_id text references feature_evolutions (id) on delete set null;

create index if not exists evidences_user_need_idx on evidences (user_need_id);
create index if not exists evidences_feature_evolution_idx on evidences (feature_evolution_id);

-- Garante ao menos um sujeito
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'evidences_one_subject'
  ) then
    alter table evidences
      add constraint evidences_one_subject check (
        num_nonnulls(feature_id, user_need_id, feature_evolution_id) >= 1
      );
  end if;
end $$;
