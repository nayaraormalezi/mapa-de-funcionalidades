-- Fase 16.3: JourneyAudienceStage → JourneyStage (modelo canônico).
-- LIVE ainda tinha UNIQUE (audience_id, journey_id, moment_id) da era
-- "uma Journey por etapa", o que impede 10 etapas sob jrn-consorcio.

alter table journey_audience_stages
  add column if not exists journey_stage_id text references journey_stages(id);

-- Backfill a partir do journey_id legado (jrn-descoberta → js-jrn-descoberta)
update journey_audience_stages jas
set journey_stage_id = 'js-' || jas.journey_id
where jas.journey_stage_id is null
  and jas.journey_id like 'jrn-%'
  and exists (
    select 1 from journey_stages js where js.id = 'js-' || jas.journey_id
  );

-- Remover unique legado (bloqueia 3 públicos × 10 etapas na mesma jornada)
alter table journey_audience_stages
  drop constraint if exists journey_audience_stages_audience_id_journey_id_moment_id_key;

-- Uma linha ativa por público × etapa canônica
create unique index if not exists journey_audience_stages_audience_stage_uidx
  on journey_audience_stages (audience_id, journey_stage_id)
  where journey_stage_id is not null;

create index if not exists journey_audience_stages_stage_idx
  on journey_audience_stages (journey_stage_id);
