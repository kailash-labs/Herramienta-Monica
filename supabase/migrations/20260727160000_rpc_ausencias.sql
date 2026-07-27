-- =============================================================================
-- 08 · Registrar una ausencia y liberar los turnos que caen adentro
--
-- Una incapacidad casi nunca es de un solo dia. Si el admin tuviera que crear la
-- ausencia por un lado y borrar tres turnos por otro, la causa quedaria colgada
-- de un lado y la bitacora del otro. Aca es una sola operacion: se guarda la
-- ausencia con su causa y cada turno liberado queda apuntando a ella.
-- =============================================================================

create or replace function public.registrar_ausencia(
  p_colaborador_id uuid,
  p_tipo           public.tipo_ausencia,
  p_fecha_inicio   date,
  p_fecha_fin      date,
  p_causa          public.causa_ausencia default null,
  p_descripcion    text default null,
  p_liberar_turnos boolean default true
)
returns public.ausencias
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ausencia public.ausencias;
  v_tienda   uuid;
  v_motivo   public.motivo_cambio;
  v_liberados integer := 0;
begin
  if p_fecha_fin < p_fecha_inicio then
    raise exception 'La fecha de fin no puede ser anterior a la de inicio';
  end if;

  select c.tienda_id into v_tienda
  from public.colaboradores c
  where c.id = p_colaborador_id;

  if v_tienda is null then
    raise exception 'El colaborador no existe o no es visible';
  end if;

  insert into public.ausencias (
    colaborador_id, tienda_id, tipo, causa,
    fecha_inicio, fecha_fin, descripcion, registrada_por
  )
  values (
    p_colaborador_id, v_tienda, p_tipo, p_causa,
    p_fecha_inicio, p_fecha_fin, p_descripcion, (select auth.uid())
  )
  returning * into v_ausencia;

  if not p_liberar_turnos then
    return v_ausencia;
  end if;

  -- El motivo del cambio se deriva del tipo de ausencia: no tiene sentido
  -- pedirlo dos veces.
  v_motivo := case p_tipo
                when 'incapacidad'            then 'incapacidad'
                when 'vacaciones'             then 'vacaciones'
                when 'permiso_remunerado'     then 'permiso'
                when 'permiso_no_remunerado'  then 'permiso'
                when 'licencia'               then 'permiso'
                else 'ausencia'
              end::public.motivo_cambio;

  perform set_config('app.motivo_cambio', v_motivo::text, true);
  perform set_config('app.ausencia_id', v_ausencia.id::text, true);

  -- Solo se tocan semanas abiertas: una semana cerrada ya se concilio
  with borrados as (
    delete from public.turnos t
    using public.semanas s
    where t.semana_id = s.id
      and t.colaborador_id = p_colaborador_id
      and t.fecha between p_fecha_inicio and p_fecha_fin
      and s.estado <> 'cerrada'
    returning t.id
  )
  select count(*) into v_liberados from borrados;

  return v_ausencia;
end;
$$;

comment on function public.registrar_ausencia(uuid, public.tipo_ausencia, date, date, public.causa_ausencia, text, boolean) is
  'Guarda la ausencia con su causa y libera los turnos del rango, dejando cada cambio trazado contra esa ausencia.';

grant execute on function public.registrar_ausencia(uuid, public.tipo_ausencia, date, date, public.causa_ausencia, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Vista para el tablero de ausentismo
-- Agrega por mes y causa, que es como se va a leer el acumulado.
-- ---------------------------------------------------------------------------

create view public.v_ausentismo_mensual
with (security_invoker = true) as
select
  a.tienda_id,
  date_trunc('month', a.fecha_inicio)::date as mes,
  a.tipo,
  a.causa,
  count(*)::integer      as casos,
  sum(a.dias)::integer   as dias,
  count(distinct a.colaborador_id)::integer as colaboradores
from public.ausencias a
group by a.tienda_id, date_trunc('month', a.fecha_inicio), a.tipo, a.causa;

comment on view public.v_ausentismo_mensual is
  'Base del tablero acumulado: casos y dias por mes, tipo y causa.';

grant select on public.v_ausentismo_mensual to authenticated;
