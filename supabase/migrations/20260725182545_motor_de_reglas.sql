-- =============================================================================
-- 03 · Vistas de resumen y motor de reglas
-- Aqui es donde el control se mueve al momento de crear el horario.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Vistas de apoyo (security_invoker: respetan la RLS de quien consulta)
-- ---------------------------------------------------------------------------

-- Marca que turno abre y que turno cierra la tienda cada dia
create view public.v_turnos_marcados
with (security_invoker = true) as
select
  t.*,
  t.hora_inicio = min(t.hora_inicio) over (partition by t.tienda_id, t.fecha) as es_apertura,
  t.hora_fin    = max(t.hora_fin)    over (partition by t.tienda_id, t.fecha) as es_cierre
from public.turnos t;

comment on view public.v_turnos_marcados is 'Apertura y cierre se deducen del propio dia, no de un horario fijo de tienda.';

-- Un renglon por colaborador y dia (consolida los bloques de un partido)
create view public.v_dias_colaborador
with (security_invoker = true) as
select
  m.semana_id,
  m.tienda_id,
  m.colaborador_id,
  m.fecha,
  sum(m.duracion_minutos)::integer as minutos,
  count(*)::integer                as bloques,
  bool_or(m.es_apertura)           as tuvo_apertura,
  bool_or(m.es_cierre)             as tuvo_cierre,
  min(m.hora_inicio)               as primer_inicio,
  max(m.hora_fin)                  as ultimo_fin
from public.v_turnos_marcados m
group by m.semana_id, m.tienda_id, m.colaborador_id, m.fecha;

-- Resumen semanal: es la columna PLANEADO del ciclo
create view public.v_resumen_semanal
with (security_invoker = true) as
select
  s.id                                              as semana_id,
  s.tienda_id,
  s.fecha_inicio,
  s.fecha_fin,
  s.estado,
  c.id                                              as colaborador_id,
  c.nombre_completo,
  c.cargo_id,
  c.horas_contrato,
  round(coalesce(sum(d.minutos), 0) / 60.0, 2)      as horas_planeadas,
  greatest(
    round(coalesce(sum(d.minutos), 0) / 60.0, 2) - c.horas_contrato,
    0
  )                                                 as horas_extra_planeadas,
  count(d.fecha)::integer                           as dias_trabajados,
  (7 - count(d.fecha))::integer                     as dias_descanso,
  count(*) filter (where d.tuvo_apertura)::integer  as aperturas,
  count(*) filter (where d.tuvo_cierre)::integer    as cierres,
  count(*) filter (where d.bloques > 1)::integer    as turnos_partidos
from public.semanas s
join public.colaboradores c
  on c.tienda_id = s.tienda_id
 and c.activo
 and (c.fecha_ingreso is null or c.fecha_ingreso <= s.fecha_inicio + 6)
 and (c.fecha_retiro  is null or c.fecha_retiro  >= s.fecha_inicio)
left join public.v_dias_colaborador d
  on d.semana_id = s.id
 and d.colaborador_id = c.id
group by s.id, s.tienda_id, s.fecha_inicio, s.fecha_fin, s.estado,
         c.id, c.nombre_completo, c.cargo_id, c.horas_contrato;

comment on view public.v_resumen_semanal is 'Horas planeadas y extra planeada por colaborador. Es lo que llena la columna PLANEADO de la conciliacion.';

-- ---------------------------------------------------------------------------
-- Catalogo de reglas
-- ---------------------------------------------------------------------------

create type public.severidad_regla as enum ('bloqueante', 'advertencia');
create type public.estado_validacion as enum ('abierta', 'resuelta', 'aceptada');

create table public.reglas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null,
  nombre      text not null,
  descripcion text,
  severidad   public.severidad_regla not null default 'advertencia',
  parametros  jsonb not null default '{}'::jsonb,
  tienda_id   uuid references public.tiendas (id) on delete cascade,  -- null = regla global
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Una regla global por codigo, y a lo sumo un override por tienda
create unique index reglas_codigo_global_uk on public.reglas (codigo) where tienda_id is null;
create unique index reglas_codigo_tienda_uk on public.reglas (codigo, tienda_id) where tienda_id is not null;

comment on table public.reglas is 'Parametros del motor. Una tienda puede sobrescribir una regla global sin tocar codigo.';

-- ---------------------------------------------------------------------------
-- Hallazgos
-- ---------------------------------------------------------------------------

create table public.validaciones (
  id             uuid primary key default gen_random_uuid(),
  semana_id      uuid not null references public.semanas (id) on delete cascade,
  tienda_id      uuid not null references public.tiendas (id) on delete cascade,
  regla_id       uuid not null references public.reglas (id) on delete cascade,
  codigo_regla   text not null,
  colaborador_id uuid references public.colaboradores (id) on delete cascade,
  clave          text not null default '',           -- discrimina hallazgos repetidos de la misma regla
  severidad      public.severidad_regla not null,
  mensaje        text not null,
  detalle        jsonb not null default '{}'::jsonb,
  estado         public.estado_validacion not null default 'abierta',
  justificacion  text,
  detectada_at   timestamptz not null default now(),
  resuelta_at    timestamptz,
  resuelta_por   uuid references public.perfiles (id) on delete set null,
  constraint validaciones_uk unique (semana_id, regla_id, colaborador_id, clave),
  constraint validaciones_justificacion_ck
    check (estado <> 'aceptada' or justificacion is not null)
);

create index validaciones_semana_idx on public.validaciones (semana_id, estado);
create index validaciones_colaborador_idx on public.validaciones (colaborador_id);

comment on table public.validaciones is 'Hallazgos del motor. Una semana sin hallazgos bloqueantes abiertos es una semana publicable.';
comment on column public.validaciones.clave is 'Identifica el hallazgo puntual (una fecha, un par de dias) para no duplicarlo al revalidar.';

-- ---------------------------------------------------------------------------
-- Motor de validacion
-- SECURITY INVOKER: corre con los permisos de quien edita, la RLS sigue aplicando.
-- ---------------------------------------------------------------------------

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

  -- Los hallazgos aceptados con justificacion sobreviven a la revalidacion
  delete from public.validaciones v
  where v.semana_id = p_semana_id
    and v.estado <> 'aceptada';

  -- Reglas efectivas: el override de tienda le gana a la global
  create temporary table tmp_reglas on commit drop as
  select distinct on (r.codigo) r.id, r.codigo, r.severidad, r.parametros
  from public.reglas r
  where r.activa
    and (r.tienda_id is null or r.tienda_id = v_tienda)
  order by r.codigo, r.tienda_id nulls last;

  -- === MAX_HORAS_SEMANA ====================================================
  insert into public.validaciones (semana_id, tienda_id, regla_id, codigo_regla, colaborador_id, clave, severidad, mensaje, detalle)
  select
    p_semana_id, v_tienda, tr.id, tr.codigo, rs.colaborador_id, '',
    tr.severidad,
    format('%s queda con %s h planeadas, %s h por encima del tope de %s h',
           rs.nombre_completo, rs.horas_planeadas,
           round(rs.horas_planeadas - (tr.parametros ->> 'horas_max')::numeric, 2),
           tr.parametros ->> 'horas_max'),
    jsonb_build_object('horas_planeadas', rs.horas_planeadas,
                       'horas_max', (tr.parametros ->> 'horas_max')::numeric,
                       'exceso', round(rs.horas_planeadas - (tr.parametros ->> 'horas_max')::numeric, 2))
  from tmp_reglas tr
  join public.v_resumen_semanal rs on rs.semana_id = p_semana_id
  where tr.codigo = 'MAX_HORAS_SEMANA'
    and rs.horas_planeadas > (tr.parametros ->> 'horas_max')::numeric
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
  -- Se compara dentro del mismo cargo: si el reparto se desbalancea, avisa.
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

comment on function public.validar_semana(uuid) is 'Corre el motor sobre una semana, refresca los hallazgos y devuelve los abiertos.';

-- Publicar exige que no queden bloqueantes abiertos
create or replace function public.publicar_semana(p_semana_id uuid)
returns public.semanas
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_bloqueantes integer;
  v_semana public.semanas;
begin
  perform public.validar_semana(p_semana_id);

  select count(*) into v_bloqueantes
  from public.validaciones v
  where v.semana_id = p_semana_id
    and v.estado = 'abierta'
    and v.severidad = 'bloqueante';

  if v_bloqueantes > 0 then
    raise exception 'La semana tiene % hallazgo(s) bloqueante(s) sin resolver', v_bloqueantes
      using hint = 'Corregi el horario o justifica el hallazgo antes de publicar';
  end if;

  update public.semanas s
  set estado = 'publicada',
      publicada_at = now(),
      publicada_por = (select auth.uid())
  where s.id = p_semana_id
  returning * into v_semana;

  return v_semana;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.reglas       enable row level security;
alter table public.validaciones enable row level security;

create policy "reglas_select" on public.reglas
  for select to authenticated
  using ( tienda_id is null or app.puede_ver_tienda(tienda_id) );

create policy "reglas_insert" on public.reglas
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "reglas_update" on public.reglas
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "reglas_delete" on public.reglas
  for delete to authenticated
  using ( app.es_coordinador() );

create policy "validaciones_select" on public.validaciones
  for select to authenticated using ( app.puede_ver_tienda(tienda_id) );
create policy "validaciones_insert" on public.validaciones
  for insert to authenticated with check ( app.puede_editar_tienda(tienda_id) );
create policy "validaciones_update" on public.validaciones
  for update to authenticated
  using ( app.puede_editar_tienda(tienda_id) )
  with check ( app.puede_editar_tienda(tienda_id) );
create policy "validaciones_delete" on public.validaciones
  for delete to authenticated using ( app.puede_editar_tienda(tienda_id) );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select                         on public.reglas       to authenticated;
grant select, insert, update, delete on public.validaciones to authenticated;
grant select on public.v_turnos_marcados  to authenticated;
grant select on public.v_dias_colaborador to authenticated;
grant select on public.v_resumen_semanal  to authenticated;

grant execute on function public.validar_semana(uuid)  to authenticated;
grant execute on function public.publicar_semana(uuid) to authenticated;
