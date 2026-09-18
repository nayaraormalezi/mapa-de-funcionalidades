-- PRISMA: Journey → Stage → Need → Feature → Product applicability → Implementation
-- Additive: journey_stages, need/feature product applicability (multi), keep legacy columns.

-- ---------------------------------------------------------------------------
-- 1) Journey stages (Etapas)
-- ---------------------------------------------------------------------------
create table if not exists journey_stages (
  id text primary key,
  journey_id text not null references journeys(id) on delete cascade,
  name text not null,
  description text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journey_stages_journey_idx
  on journey_stages (journey_id, sort_order);

-- One default stage per journey (compatibilidade: Need continua ligada à jornada)
insert into journey_stages (id, journey_id, name, description, sort_order)
select
  'js-' || j.id,
  j.id,
  j.name,
  coalesce(j.description, ''),
  coalesce(j.sort_order, 0)
from journeys j
where j.active = true
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Need → Stage + multi-product applicability
-- ---------------------------------------------------------------------------
alter table user_needs
  add column if not exists journey_stage_id text references journey_stages(id);

alter table user_needs
  add column if not exists product_ids text[] not null default '{}';

-- Backfill stage from journey
update user_needs n
set journey_stage_id = 'js-' || n.journey_id
where n.journey_stage_id is null
  and exists (select 1 from journey_stages js where js.id = 'js-' || n.journey_id);

-- Backfill product_ids from product_id (se coluna existir)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_needs' and column_name = 'product_id'
  ) then
    execute $u$
      update user_needs
      set product_ids = array[product_id]
      where (product_ids is null or product_ids = '{}')
        and product_id is not null
        and product_id in ('imobiliario', 'veiculos_leves', 'veiculos_pesados')
    $u$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Feature multi-product applicability
-- ---------------------------------------------------------------------------
alter table features
  add column if not exists product_ids text[] not null default '{}';

update features f
set product_ids = sub.ids
from (
  select
    feature_id,
    array_agg(distinct product_id) filter (
      where product_id in ('imobiliario', 'veiculos_leves', 'veiculos_pesados')
    ) as ids
  from feature_channel_contexts
  where active = true
  group by feature_id
) sub
where f.id = sub.feature_id
  and (f.product_ids is null or f.product_ids = '{}')
  and sub.ids is not null;

-- ---------------------------------------------------------------------------
-- 4) Contemplação > Ofertar lance (seed estrutural no banco se jornadas existirem)
-- ---------------------------------------------------------------------------
insert into journey_stages (id, journey_id, name, description, sort_order)
select
  'js-contemplacao-entender',
  id,
  'Entender contemplação',
  'Compreender regras e caminhos de contemplação.',
  1
from journeys where id = 'jrn-contemplacao'
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into journey_stages (id, journey_id, name, description, sort_order)
select
  'js-contemplacao-ofertar-lance',
  id,
  'Ofertar lance',
  'Registrar e acompanhar oferta de lance.',
  2
from journeys where id = 'jrn-contemplacao'
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into journey_stages (id, journey_id, name, description, sort_order)
select
  'js-contemplacao-resultado',
  id,
  'Acompanhar resultado',
  'Ver resultado da assembleia e próximos passos.',
  3
from journeys where id = 'jrn-contemplacao'
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

-- Remap need-lance para Contemplação / Ofertar lance se existir
update user_needs
set
  journey_id = 'jrn-contemplacao',
  journey_stage_id = 'js-contemplacao-ofertar-lance',
  product_ids = array['imobiliario', 'veiculos_leves', 'veiculos_pesados'],
  name = case when name ilike '%lance%' then 'Aumentar minhas chances de contemplação' else name end
where id = 'need-lance';
