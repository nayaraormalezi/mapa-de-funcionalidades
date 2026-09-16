-- Product dimension on implementations (feature_channel_contexts)
-- Portfólio fixo: imobiliario | veiculos_leves | veiculos_pesados

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
  ('veiculos_leves', 'Veículos Leves', 'Veículos Leves', 'Automóveis, utilitários leves e motocicletas.', 2),
  ('veiculos_pesados', 'Veículos Pesados', 'Veículos Pesados', 'Caminhões, ônibus, máquinas e equipamentos.', 3)
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- Remover qualquer produto fora do portfólio fixo
delete from products
where id not in ('imobiliario', 'veiculos_leves', 'veiculos_pesados');

alter table feature_channel_contexts
  add column if not exists product_id text references products(id);

alter table gaps
  add column if not exists product_id text references products(id);

-- Normalizar ids legados
update feature_channel_contexts set product_id = 'imobiliario' where product_id in ('prod-imobiliario');
update feature_channel_contexts set product_id = 'veiculos_leves' where product_id in ('prod-veiculos-leves', 'veiculos-leves');
update feature_channel_contexts set product_id = 'veiculos_pesados' where product_id in ('prod-veiculos-pesados', 'veiculos-pesados');

update gaps set product_id = 'imobiliario' where product_id in ('prod-imobiliario');
update gaps set product_id = 'veiculos_leves' where product_id in ('prod-veiculos-leves', 'veiculos-leves');
update gaps set product_id = 'veiculos_pesados' where product_id in ('prod-veiculos-pesados', 'veiculos-pesados');

-- Backfill a partir do texto legado em features.product
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

-- Limpar product_id inválido em gaps
update gaps
set product_id = null
where product_id is not null
  and product_id not in ('imobiliario', 'veiculos_leves', 'veiculos_pesados');
