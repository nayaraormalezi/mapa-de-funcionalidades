-- PRISMA hierarchy: PRODUCT → NEED → JOURNEY → FEATURE → IMPLEMENTATION → CHANNEL
-- Self-contained: creates products + product_id columns if missing, then M2M junctions.

-- ---------------------------------------------------------------------------
-- 0) Products catalog (exactly 3)
-- ---------------------------------------------------------------------------
create table if not exists products (
  id text primary key,
  name text not null,
  short_name text not null,
  description text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into products (id, name, short_name, description, sort_order)
values
  ('imobiliario', 'Imobiliário', 'Imobiliário', 'Crédito para imóvel residencial ou comercial, terreno e construção.', 1),
  ('veiculos_leves', 'Veículos leves', 'Veículos leves', 'Automóveis, utilitários leves e motocicletas.', 2),
  ('veiculos_pesados', 'Veículos pesados', 'Veículos pesados', 'Caminhões, ônibus, máquinas e equipamentos.', 3)
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = true;

delete from products
where id not in ('imobiliario', 'veiculos_leves', 'veiculos_pesados');

-- ---------------------------------------------------------------------------
-- 1) product_id on implementations (FCC) and gaps
-- ---------------------------------------------------------------------------
alter table feature_channel_contexts
  add column if not exists product_id text references products(id);

alter table gaps
  add column if not exists product_id text references products(id);

-- Backfill from legacy features.product text
update feature_channel_contexts fcc
set product_id = case
  when f.product ilike '%imobil%' then 'imobiliario'
  when f.product ilike '%leve%' then 'veiculos_leves'
  when f.product ilike '%pesad%' then 'veiculos_pesados'
  else 'imobiliario'
end
from features f
where fcc.feature_id = f.id
  and (fcc.product_id is null or fcc.product_id = '' or fcc.product_id = 'outro');

update feature_channel_contexts
set product_id = 'imobiliario'
where product_id is null
   or product_id = ''
   or product_id not in ('imobiliario', 'veiculos_leves', 'veiculos_pesados');

-- ---------------------------------------------------------------------------
-- 2) Necessidade sob Produto
-- ---------------------------------------------------------------------------
alter table user_needs
  add column if not exists product_id text references products(id);

update user_needs n
set product_id = sub.product_id
from (
  select
    c.user_need_id,
    mode() within group (order by fcc.product_id) as product_id
  from capabilities c
  join features f on f.capability_id = c.id and f.active = true
  join feature_channel_contexts fcc on fcc.feature_id = f.id and fcc.active = true
  where fcc.product_id is not null
    and fcc.product_id in ('imobiliario', 'veiculos_leves', 'veiculos_pesados')
  group by c.user_need_id
) sub
where n.id = sub.user_need_id
  and (n.product_id is null or n.product_id = '');

update user_needs
set product_id = 'imobiliario'
where product_id is null
   or product_id not in ('imobiliario', 'veiculos_leves', 'veiculos_pesados');

-- ---------------------------------------------------------------------------
-- 3) Feature ↔ Need (M2M)
-- ---------------------------------------------------------------------------
create table if not exists feature_needs (
  feature_id text not null references features(id) on delete cascade,
  user_need_id text not null references user_needs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature_id, user_need_id)
);

create index if not exists feature_needs_need_idx on feature_needs (user_need_id);

insert into feature_needs (feature_id, user_need_id)
select distinct f.id, c.user_need_id
from features f
join capabilities c on c.id = f.capability_id
where f.active = true
  and c.user_need_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4) Feature ↔ Journey (M2M)
-- ---------------------------------------------------------------------------
create table if not exists feature_journeys (
  feature_id text not null references features(id) on delete cascade,
  journey_id text not null references journeys(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature_id, journey_id)
);

create index if not exists feature_journeys_journey_idx on feature_journeys (journey_id);

insert into feature_journeys (feature_id, journey_id)
select distinct fn.feature_id, n.journey_id
from feature_needs fn
join user_needs n on n.id = fn.user_need_id
where n.journey_id is not null
on conflict do nothing;
