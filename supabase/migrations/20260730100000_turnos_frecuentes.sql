-- =============================================================================
-- 10 · Turnos frecuentes por tienda
--
-- En el celular no se puede pedir que alguien tipee 08:20 y 15:20 con el pulgar
-- setenta veces. Casi todos los turnos de una tienda se repiten, asi que la
-- vista movil ofrece los mas usados como atajo de un toque.
--
-- Los atajos salen de la historia de cada tienda, no de una lista fija: cada
-- punto de venta tiene sus propios horarios y cambian con el tiempo.
-- =============================================================================

create or replace function public.turnos_frecuentes(
  p_tienda_id uuid,
  p_limite    integer default 8
)
returns table (
  hora_inicio time,
  hora_fin    time,
  tipo_turno  public.tipo_turno,
  minutos     integer,
  usos        integer
)
language sql
security invoker
stable
set search_path = ''
as $$
  select
    t.hora_inicio,
    t.hora_fin,
    -- El tipo mas usado para ese mismo horario
    mode() within group (order by t.tipo_turno) as tipo_turno,
    max(t.duracion_minutos)::integer            as minutos,
    count(*)::integer                           as usos
  from public.turnos t
  where t.tienda_id = p_tienda_id
    -- Solo bloques unicos del dia: un partido se arma tocando dos veces
    and t.orden_bloque = 1
  group by t.hora_inicio, t.hora_fin
  order by count(*) desc, t.hora_inicio
  limit greatest(p_limite, 1)
$$;

comment on function public.turnos_frecuentes(uuid, integer) is
  'Horarios mas usados de una tienda, para ofrecerlos como atajo en la carga movil.';

grant execute on function public.turnos_frecuentes(uuid, integer) to authenticated;
