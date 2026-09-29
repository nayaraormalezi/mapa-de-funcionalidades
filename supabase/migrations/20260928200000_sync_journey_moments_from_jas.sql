-- Sync journey_moments for active catalog journeys from journey_audience_stages.
-- After consolidating legacy stage-journeys into jrn-consorcio, journey_moments
-- still pointed only at inactive journeys, so Nova Funcionalidade filtered to
-- an empty list ("Nenhuma jornada vinculada a este momento").
insert into journey_moments (journey_id, moment_id)
select distinct jas.journey_id, jas.moment_id
from journey_audience_stages jas
join journeys j on j.id = jas.journey_id
where coalesce(jas.active, true)
  and coalesce(j.active, true)
  and jas.moment_id is not null
on conflict do nothing;
