-- =============================================================================
-- 09 · Tope de horas por tipo de contrato, rotacion de descansos y novedades
--
-- Tres cosas que Monica pidio explicitamente y que faltaban:
--
--   1. El tope semanal es 42h para tiempo completo y 21h para medio tiempo.
--      La regla comparaba contra un 42 fijo, asi que un medio tiempo con 30h
--      pasaba sin marcar. Ahora compara contra el contrato de cada persona.
--   2. Ver que dias descanso cada persona en el mes, y detectar a quien repite
--      descanso en fin de semana sin rotar.
--   3. Dias de vacaciones e incapacidad por persona y por mes, para liquidar
--      los incentivos trimestrales sin revisar todo a mano.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1 · El contrato manda
-- ---------------------------------------------------------------------------

-- Un medio tiempo con 42h contratadas es un error de captura, no un caso real.
create or replace function app.colaboradores_horas_por_jornada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Solo cuando no se declaro explicitamente: si la app manda un valor, se respeta
  if new.horas_contrato is null or new.horas_contrato = 42 then
    new.horas_contrato := case new.tipo_jornada
                            when 'medio_tiempo' then 21
                            when 'aprendiz'     then 36
                            else 42
                          end;
  end if;
  return new;
end;
$$;

comment on function app.colaboradores_horas_por_jornada() is
  'Deriva las horas contratadas del tipo de jornada cuando no se especifican: 42 completa, 21 medio tiempo, 36 aprendiz.';

create trigger colaboradores_horas_jornada
  before insert on public.colaboradores
  for each row execute function app.colaboradores_horas_por_jornada();

-- Alinear los que ya existen y quedaron con el default de 42
update public.colaboradores
set horas_contrato = 21
where tipo_jornada = 'medio_tiempo' and horas_contrato = 42;

update public.colaboradores
set horas_contrato = 36
where tipo_jornada = 'aprendiz' and horas_contrato = 42;

-- ---------------------------------------------------------------------------
-- La regla ahora usa el contrato de cada persona.
-- El parametro horas_max pasa a ser un techo absoluto: ningun contrato puede
-- superarlo, sirve para atajar un dato mal cargado.
-- ---------------------------------------------------------------------------

update public.reglas
set nombre = 'Tope de horas segun el contrato',
    descripcion =
      'Cada colaborador tiene su propio tope semanal: 42 h tiempo completo, '
      '21 h medio tiempo. Lo que pase de ahi es hora extra planeada. '
      'El parametro horas_max es el techo absoluto de cualquier contrato.'
where codigo = 'MAX_HORAS_SEMANA' and tienda_id is null;

create or replace function public.validar_semana(p_semana_id uuid)
returns table (
  codigo_regla text,
  severidad public.severidad_regla,
  colaborador_id uuid,
  mensaje text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tienda uuid;
begin
  select s.tienda_id into v_tienda from public.semanas s where s.id = p_semana_id;
  if v_tienda is null then
    raise exception 'La semana % no existe o no es visible', p_semana_id;
  end if;

  delete from public.validaciones v
  where v.semana_id = p_semana_id
    and v.estado <> 'aceptada';

  create temporary table tmp_reglas on commit drop as
  select distinct on (r.codigo) r.id, r.codigo, r.severidad, r.parametros
  from public.reglas r
  where r.activa
    and (r.tienda_id is null or r.tienda_id = v_tienda)
  order by r.codigo, r.tienda_id nulls last;

  -- === MAX_HORAS_SEMANA · contra el contrato de cada persona ===============
  insert into public.validaciones (semana_id, tienda_id, regla_id, codigo_regla, colaborador_id, clave, severidad, mensaje, detalle)
  select
    p_semana_id, v_tienda, tr.id, tr.codigo, rs.colaborador_id, '',
    tr.severidad,
    format('%s queda con %s h planeadas; su contrato es de %s h (%s h de más)',
           rs.nombre_completo, rs.horas_planeadas, rs.horas_contrato,
           round(rs.horas_planeadas - rs.horas_contrato, 2)),
    jsonb_build_object('horas_planeadas', rs.horas_planeadas,
                       'horas_contrato', rs.horas_contrato,
                       'exceso', round(rs.horas_planeadas - rs.horas_contrato, 2))
  from tmp_reglas tr
  join public.v_resumen_semanal rs on rs.semana_id = p_semana_id
  where tr.codigo = 'MAX_HORAS_SEMANA'
    and rs.horas_planeadas > rs.horas_contrato
  on conflict do nothing;

  -- Techo absoluto: un contrato por encima del maximo legal es dato mal cargado
  insert into public.validaciones (semana_id, tienda_id, regla_id, codigo_regla, colaborador_id, clave, severidad, mensaje, detalle)
  select
    p_semana_id, v_tienda, tr.id, tr.codigo, rs.colaborador_id, 'techo',
    tr.severidad,
    format('%s tiene un contrato de %s h, por encima del techo de %s h. Revisá el dato del colaborador.',
           rs.nombre_completo, rs.horas_contrato, tr.parametros ->> 'horas_max'),
    jsonb_build_object('horas_contrato', rs.horas_contrato,
                       'horas_max', (tr.parametros ->> 'horas_max')::numeric)
  from tmp_reglas tr
  join public.v_resumen_semanal rs on rs.semana_id = p_semana_id
  where tr.codigo = 'MAX_HORAS_SEMANA'
    and rs.horas_contrato > (tr.parametros ->> 'horas_max')::numeric
  on conflict do nothing;

  -- === DIA_DESCANSO ========================================================
  insert into public.validaciones (semana_id, tienda_id, regla_id, codigo_regla, colaborador_id, clave, severidad, mensaje, detalle)
  select
    p_semana_id, v_tienda, tr.id, tr.codigo, rs.colaborador_id, '',
    tr.severidad,
    format('%s queda con %s dia(s) de descanso; el minimo es %s',
           rs.nombre_completo, rs.dias_descanso, tr.parametros ->> 'dias_min'),
    jsonb_build_object('dias_descanso', rs.dias_descanso,
                       'dias_min', (tr.parametros ->> 'dias_min')::integer)
  from tmp_reglas tr
  join public.v_resumen_semanal rs on rs.semana_id = p_semana_id
  where tr.codigo = 'DIA_DESCANSO'
    and rs.dias_trabajados > 0
    and rs.dias_descanso < (tr.parametros ->> 'dias_min')::integer
  on conflict do nothing;

  -- === DESCANSO_ENTRE_TURNOS ==============================================
  insert into public.validaciones (semana_id, tienda_id, regla_id, codigo_regla, colaborador_id, clave, severidad, mensaje, detalle)
  select
    p_semana_id, v_tienda, tr.id, tr.codigo, x.colaborador_id, x.fecha::text,
    tr.severidad,
    format('%s solo descansa %s h entre el turno del %s y el del %s (minimo %s h)',
           x.nombre_completo, round(x.horas_gap, 1), x.fecha_previa, x.fecha, tr.parametros ->> 'horas_min'),
    jsonb_build_object('horas_descanso', round(x.horas_gap, 1),
                       'horas_min', (tr.parametros ->> 'horas_min')::numeric,
                       'fecha_previa', x.fecha_previa, 'fecha', x.fecha)
  from tmp_reglas tr
  join (
    select
      d.colaborador_id,
      c.nombre_completo,
      d.fecha,
      lag(d.fecha) over w      as fecha_previa,
      extract(epoch from (
        (d.fecha + d.primer_inicio)
        - (lag(d.fecha) over w + lag(d.ultimo_fin) over w)
      )) / 3600.0              as horas_gap
    from public.v_dias_colaborador d
    join public.colaboradores c on c.id = d.colaborador_id
    where d.semana_id = p_semana_id
    window w as (partition by d.colaborador_id order by d.fecha)
  ) x on x.fecha_previa is not null
  where tr.codigo = 'DESCANSO_ENTRE_TURNOS'
    and x.horas_gap < (tr.parametros ->> 'horas_min')::numeric
  on conflict do nothing;

  -- === MAX_DIAS_CONSECUTIVOS ==============================================
  insert into public.validaciones (semana_id, tienda_id, regla_id, codigo_regla, colaborador_id, clave, severidad, mensaje, detalle)
  select
    p_semana_id, v_tienda, tr.id, tr.codigo, r.colaborador_id, r.inicio_racha::text,
    tr.severidad,
    format('%s encadena %s dias seguidos desde el %s; el maximo es %s',
           r.nombre_completo, r.dias, r.inicio_racha, tr.parametros ->> 'dias_max'),
    jsonb_build_object('dias_consecutivos', r.dias,
                       'dias_max', (tr.parametros ->> 'dias_max')::integer,
                       'desde', r.inicio_racha, 'hasta', r.fin_racha)
  from tmp_reglas tr
  join (
    select
      g.colaborador_id,
      c.nombre_completo,
      count(*)::integer as dias,
      min(g.fecha)      as inicio_racha,
      max(g.fecha)      as fin_racha
    from (
      select d.colaborador_id, d.fecha,
             d.fecha - (row_number() over (partition by d.colaborador_id order by d.fecha))::integer as grupo
      from public.v_dias_colaborador d
      where d.semana_id = p_semana_id
    ) g
    join public.colaboradores c on c.id = g.colaborador_id
    group by g.colaborador_id, c.nombre_completo, g.grupo
  ) r on true
  where tr.codigo = 'MAX_DIAS_CONSECUTIVOS'
    and r.dias > (tr.parametros ->> 'dias_max')::integer
  on conflict do nothing;

  -- === SOLAPE_TURNOS =======================================================
  insert into public.validaciones (semana_id, tienda_id, regla_id, codigo_regla, colaborador_id, clave, severidad, mensaje, detalle)
  select
    p_semana_id, v_tienda, tr.id, tr.codigo, a.colaborador_id, a.fecha::text,
    tr.severidad,
    format('%s tiene dos bloques cruzados el %s (%s-%s y %s-%s)',
           c.nombre_completo, a.fecha, a.hora_inicio, a.hora_fin, b.hora_inicio, b.hora_fin),
    jsonb_build_object('fecha', a.fecha,
                       'bloque_1', a.hora_inicio::text || '-' || a.hora_fin::text,
                       'bloque_2', b.hora_inicio::text || '-' || b.hora_fin::text)
  from tmp_reglas tr
  join public.turnos a on a.semana_id = p_semana_id
  join public.turnos b on b.semana_id = a.semana_id
                      and b.colaborador_id = a.colaborador_id
                      and b.fecha = a.fecha
                      and b.orden_bloque > a.orden_bloque
  join public.colaboradores c on c.id = a.colaborador_id
  where tr.codigo = 'SOLAPE_TURNOS'
    and a.hora_inicio < b.hora_fin
    and b.hora_inicio < a.hora_fin
  on conflict do nothing;

  -- === EQUIDAD (aperturas, cierres, partidos) ==============================
  insert into public.validaciones (semana_id, tienda_id, regla_id, codigo_regla, colaborador_id, clave, severidad, mensaje, detalle)
  select
    p_semana_id, v_tienda, tr.id, tr.codigo, null::uuid, e.cargo_id::text,
    tr.severidad,
    format('Reparto desparejo de %s en %s: entre %s y %s por colaborador (brecha maxima %s)',
           lower(e.etiqueta), e.cargo_nombre, e.minimo, e.maximo, tr.parametros ->> 'brecha_max'),
    jsonb_build_object('cargo', e.cargo_nombre, 'minimo', e.minimo, 'maximo', e.maximo,
                       'brecha', e.maximo - e.minimo,
                       'brecha_max', (tr.parametros ->> 'brecha_max')::integer)
  from tmp_reglas tr
  join (
    select 'EQUIDAD_APERTURAS' as codigo, 'Aperturas' as etiqueta, rs.cargo_id, cg.nombre as cargo_nombre,
           min(rs.aperturas) as minimo, max(rs.aperturas) as maximo
    from public.v_resumen_semanal rs
    join public.cargos cg on cg.id = rs.cargo_id
    where rs.semana_id = p_semana_id and rs.dias_trabajados > 0
    group by rs.cargo_id, cg.nombre
    union all
    select 'EQUIDAD_CIERRES', 'Cierres', rs.cargo_id, cg.nombre,
           min(rs.cierres), max(rs.cierres)
    from public.v_resumen_semanal rs
    join public.cargos cg on cg.id = rs.cargo_id
    where rs.semana_id = p_semana_id and rs.dias_trabajados > 0
    group by rs.cargo_id, cg.nombre
    union all
    select 'EQUIDAD_PARTIDOS', 'Turnos partidos', rs.cargo_id, cg.nombre,
           min(rs.turnos_partidos), max(rs.turnos_partidos)
    from public.v_resumen_semanal rs
    join public.cargos cg on cg.id = rs.cargo_id
    where rs.semana_id = p_semana_id and rs.dias_trabajados > 0
    group by rs.cargo_id, cg.nombre
  ) e on e.codigo = tr.codigo
  where e.maximo - e.minimo > (tr.parametros ->> 'brecha_max')::integer
  on conflict do nothing;

  drop table if exists tmp_reglas;

  return query
  select v.codigo_regla, v.severidad, v.colaborador_id, v.mensaje
  from public.validaciones v
  where v.semana_id = p_semana_id
    and v.estado = 'abierta'
  order by v.severidad, v.codigo_regla;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2 · Descansos del mes y rotacion de fin de semana
--
-- La rotacion no se puede juzgar desde una sola semana: es una pregunta de
-- varias semanas. Por eso va como vista mensual y no como regla del motor.
-- ---------------------------------------------------------------------------

create view public.v_descansos_dia
with (security_invoker = true) as
select
  s.tienda_id,
  c.id                              as colaborador_id,
  c.nombre_completo,
  c.cargo_id,
  f.fecha,
  extract(isodow from f.fecha)::int  as dow,
  extract(isodow from f.fecha) >= 6  as es_fin_semana
from public.semanas s
join public.colaboradores c
  on c.tienda_id = s.tienda_id and c.activo
cross join lateral generate_series(s.fecha_inicio, s.fecha_inicio + 6, interval '1 day') g(fecha)
cross join lateral (select g.fecha::date as fecha) f
where not exists (
  select 1 from public.turnos t
  where t.colaborador_id = c.id and t.fecha = f.fecha
);

comment on view public.v_descansos_dia is
  'Un renglon por colaborador y dia sin turno dentro de una semana cargada. Base de la rotacion de descansos.';

create view public.v_descansos_mensual
with (security_invoker = true) as
select
  d.tienda_id,
  d.colaborador_id,
  d.nombre_completo,
  d.cargo_id,
  date_trunc('month', d.fecha)::date        as mes,
  count(*)::int                             as dias_descanso,
  count(*) filter (where d.es_fin_semana)::int as descansos_fin_semana,
  count(*) filter (where d.dow = 6)::int    as sabados,
  count(*) filter (where d.dow = 7)::int    as domingos,
  -- Los días concretos, que es lo que Mónica pidió poder mirar
  array_agg(d.fecha order by d.fecha)       as fechas
from public.v_descansos_dia d
group by d.tienda_id, d.colaborador_id, d.nombre_completo, d.cargo_id,
         date_trunc('month', d.fecha);

comment on view public.v_descansos_mensual is
  'Qué días descansó cada persona en el mes, con el detalle de fines de semana. Responde "¿qué días descansó Jean Carlos?".';

/**
 * Rotacion de fin de semana dentro de un cargo y un mes.
 *
 * La inequidad tiene dos caras y hay que mirar las dos: alguien que se queda
 * con todos los fines de semana libres, y alguien que no tiene ninguno. Un
 * promedio no las distingue, asi que se devuelve el minimo y el maximo del
 * cargo y cada persona se compara contra eso.
 */
create or replace function public.rotacion_fin_semana(
  p_tienda_id uuid,
  p_mes       date
)
returns table (
  colaborador_id uuid,
  nombre_completo text,
  cargo text,
  descansos_fin_semana integer,
  minimo_del_cargo integer,
  maximo_del_cargo integer,
  sin_rotar boolean,
  detalle text
)
language sql
security invoker
stable
set search_path = ''
as $$
  with base as (
    select dm.*, cg.nombre as cargo_nombre
    from public.v_descansos_mensual dm
    join public.cargos cg on cg.id = dm.cargo_id
    where dm.tienda_id = p_tienda_id
      and dm.mes = date_trunc('month', p_mes)::date
  ),
  rangos as (
    select cargo_id,
           min(descansos_fin_semana) as minimo,
           max(descansos_fin_semana) as maximo
    from base group by cargo_id
  )
  select
    b.colaborador_id,
    b.nombre_completo,
    b.cargo_nombre,
    b.descansos_fin_semana,
    r.minimo,
    r.maximo,
    -- Sin rotar: se queda con el maximo mientras otro del cargo tiene menos,
    -- o al reves, no le toco ninguno mientras otro acumula
    (r.maximo - r.minimo) >= 2
      and (b.descansos_fin_semana = r.maximo or b.descansos_fin_semana = r.minimo),
    case
      when (r.maximo - r.minimo) < 2 then 'Reparto parejo en el cargo.'
      when b.descansos_fin_semana = r.maximo then
        format('Acumula %s fines de semana libres; otro del mismo cargo tiene %s.',
               b.descansos_fin_semana, r.minimo)
      when b.descansos_fin_semana = r.minimo then
        format('Solo %s fin(es) de semana libre(s); otro del mismo cargo tiene %s.',
               b.descansos_fin_semana, r.maximo)
      else 'Dentro del rango del cargo.'
    end
  from base b
  join rangos r on r.cargo_id = b.cargo_id
  order by b.cargo_nombre, b.descansos_fin_semana desc
$$;

comment on function public.rotacion_fin_semana(uuid, date) is
  'Detecta quien repite descanso de fin de semana sin rotar, comparando contra el resto de su cargo en el mes.';

-- ---------------------------------------------------------------------------
-- 3 · Novedades del mes por persona · base de los incentivos trimestrales
-- ---------------------------------------------------------------------------

create view public.v_novedades_mensual
with (security_invoker = true) as
select
  a.tienda_id,
  a.colaborador_id,
  c.nombre_completo,
  c.codigo_empleado,
  date_trunc('month', a.fecha_inicio)::date as mes,
  sum(a.dias) filter (where a.tipo = 'vacaciones')::int             as dias_vacaciones,
  sum(a.dias) filter (where a.tipo = 'incapacidad')::int            as dias_incapacidad,
  sum(a.dias) filter (where a.tipo = 'ausencia_injustificada')::int as dias_ausencia,
  sum(a.dias) filter (
    where a.tipo in ('permiso_remunerado', 'permiso_no_remunerado')
  )::int                                                            as dias_permiso,
  sum(a.dias) filter (where a.tipo = 'licencia')::int               as dias_licencia,
  sum(a.dias)::int                                                  as dias_total,
  count(*)::int                                                     as casos
from public.ausencias a
join public.colaboradores c on c.id = a.colaborador_id
group by a.tienda_id, a.colaborador_id, c.nombre_completo, c.codigo_empleado,
         date_trunc('month', a.fecha_inicio);

comment on view public.v_novedades_mensual is
  'Dias de vacaciones, incapacidad, ausencia y permiso por persona y mes. Es el reporte que reemplaza revisar todo a mano al cierre.';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select on public.v_descansos_dia       to authenticated;
grant select on public.v_descansos_mensual   to authenticated;
grant select on public.v_novedades_mensual   to authenticated;
grant execute on function public.rotacion_fin_semana(uuid, date) to authenticated;
