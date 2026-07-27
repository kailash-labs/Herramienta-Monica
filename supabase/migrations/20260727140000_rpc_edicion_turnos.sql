-- =============================================================================
-- 07 · RPC de edicion de turnos
-- El motivo del cambio viaja por variable de sesion y lo lee el trigger de
-- trazabilidad. PostgREST usa un pool: si la app hiciera set_config en una
-- llamada y el insert en otra, el motivo se perderia. Por eso ambas cosas
-- ocurren dentro de la misma funcion, es decir, la misma transaccion.
-- =============================================================================

create or replace function public.guardar_turno_dia(
  p_semana_id      uuid,
  p_colaborador_id uuid,
  p_fecha          date,
  p_tipo           public.tipo_turno,
  p_bloques        jsonb,        -- [{"inicio":"08:00","fin":"15:00"}, ...]; vacio borra el dia
  p_motivo         public.motivo_cambio default 'correccion',
  p_ausencia_id    uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_bloque  jsonb;
  v_orden   smallint := 0;
  v_inicio  time;
  v_fin     time;
begin
  if jsonb_typeof(p_bloques) <> 'array' then
    raise exception 'Los bloques deben venir como arreglo';
  end if;

  if jsonb_array_length(p_bloques) > 2 then
    raise exception 'Un dia admite como maximo dos bloques';
  end if;

  -- El trigger de trazabilidad lee estas variables. true = solo esta transaccion.
  perform set_config('app.motivo_cambio', p_motivo::text, true);
  perform set_config('app.ausencia_id', coalesce(p_ausencia_id::text, ''), true);

  -- Reescribimos el dia completo: mas simple que diffear bloque por bloque, y
  -- la bitacora igual queda con el detalle de lo que se fue y lo que entro.
  delete from public.turnos t
  where t.semana_id = p_semana_id
    and t.colaborador_id = p_colaborador_id
    and t.fecha = p_fecha;

  for v_bloque in select * from jsonb_array_elements(p_bloques) loop
    v_orden := v_orden + 1;

    v_inicio := (v_bloque ->> 'inicio')::time;
    v_fin    := (v_bloque ->> 'fin')::time;

    if v_inicio is null or v_fin is null then
      raise exception 'Cada bloque necesita hora de inicio y de fin';
    end if;

    if v_inicio = v_fin then
      raise exception 'El bloque % no puede empezar y terminar a la misma hora', v_orden;
    end if;

    insert into public.turnos (
      semana_id, colaborador_id, fecha, orden_bloque, hora_inicio, hora_fin, tipo_turno
    )
    values (
      p_semana_id, p_colaborador_id, p_fecha, v_orden, v_inicio, v_fin,
      case when jsonb_array_length(p_bloques) = 2 then 'partido'::public.tipo_turno
           else p_tipo end
    );
  end loop;
end;
$$;

comment on function public.guardar_turno_dia(uuid, uuid, date, public.tipo_turno, jsonb, public.motivo_cambio, uuid) is
  'Reescribe el dia de un colaborador declarando el motivo en la misma transaccion, para que la bitacora quede completa.';

grant execute on function public.guardar_turno_dia(uuid, uuid, date, public.tipo_turno, jsonb, public.motivo_cambio, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Resumen de la semana en una sola llamada, para no hacer N consultas por fila
-- ---------------------------------------------------------------------------

create or replace function public.resumen_semana(p_semana_id uuid)
returns table (
  colaborador_id uuid,
  nombre_completo text,
  cargo_id uuid,
  horas_contrato numeric,
  horas_planeadas numeric,
  horas_extra_planeadas numeric,
  dias_trabajados integer,
  dias_descanso integer,
  aperturas integer,
  cierres integer,
  turnos_partidos integer
)
language sql
security invoker
stable
set search_path = ''
as $$
  select rs.colaborador_id, rs.nombre_completo, rs.cargo_id, rs.horas_contrato,
         rs.horas_planeadas, rs.horas_extra_planeadas, rs.dias_trabajados,
         rs.dias_descanso, rs.aperturas, rs.cierres, rs.turnos_partidos
  from public.v_resumen_semanal rs
  where rs.semana_id = p_semana_id
$$;

grant execute on function public.resumen_semana(uuid) to authenticated;
