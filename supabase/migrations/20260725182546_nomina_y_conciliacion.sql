-- =============================================================================
-- 04 · Nomina real, conciliacion y alertas
-- Este es el lado REAL del ciclo: lo que de verdad se pago.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.clasificacion_concepto as enum (
  'extra_diurna',
  'extra_nocturna',
  'extra_dominical_diurna',
  'extra_dominical_nocturna',
  'recargo_nocturno',
  'recargo_dominical',
  'recargo_festivo',
  'ordinaria',
  'otro'                      -- los pagos mezclados que hoy se descartan a mano
);

create type public.estado_reporte as enum ('cargado', 'procesado', 'conciliado', 'error');

create type public.estado_match as enum ('ok', 'sin_colaborador', 'sin_concepto', 'ambiguo');

create type public.estado_conciliacion as enum ('pendiente', 'cuadra', 'no_cuadra', 'revisada');

create type public.estado_linea_conciliacion as enum (
  'cuadra',
  'exceso',          -- se pago mas extra de la planeada: dispara llamado de atencion
  'faltante',        -- se planeo extra que no aparece pagada
  'sin_planeacion'   -- hay extra real sin semana planeada detras
);

create type public.tipo_alerta as enum ('borrador_ajuste', 'llamado_atencion', 'aviso_regla');
create type public.estado_alerta as enum ('borrador', 'enviada', 'descartada');
create type public.canal_alerta as enum ('interna', 'email', 'whatsapp', 'telegram');

-- ---------------------------------------------------------------------------
-- Catalogo de conceptos de nomina
-- ---------------------------------------------------------------------------

create table public.conceptos_nomina (
  id                       uuid primary key default gen_random_uuid(),
  codigo                   text not null unique,     -- codigo tal cual llega de Frisby
  nombre                   text not null,
  clasificacion            public.clasificacion_concepto not null,
  cuenta_como_extra        boolean not null default false,
  cuenta_como_recargo      boolean not null default false,
  incluir_en_conciliacion  boolean not null default false,
  activo                   boolean not null default true,
  created_at               timestamptz not null default now()
);

comment on table public.conceptos_nomina is 'Reemplaza el paso manual de separar extras y recargos y descartar el resto.';

-- ---------------------------------------------------------------------------
-- Reportes cargados
-- ---------------------------------------------------------------------------

create table public.reportes_nomina (
  id               uuid primary key default gen_random_uuid(),
  tienda_id        uuid references public.tiendas (id) on delete cascade,  -- null = reporte multi-tienda
  anio             smallint not null,
  mes              smallint not null,
  archivo_nombre   text,
  storage_path     text,
  estado           public.estado_reporte not null default 'cargado',
  filas_totales    integer not null default 0,
  filas_con_match  integer not null default 0,
  error_detalle    text,
  cargado_por      uuid references public.perfiles (id) on delete set null,
  cargado_at       timestamptz not null default now(),
  procesado_at     timestamptz,
  constraint reportes_nomina_mes_ck check (mes between 1 and 12),
  constraint reportes_nomina_anio_ck check (anio between 2020 and 2100)
);

create index reportes_nomina_periodo_idx on public.reportes_nomina (anio desc, mes desc);

-- ---------------------------------------------------------------------------
-- Movimientos del reporte
-- Se guarda el dato crudo para poder reconciliar a mano lo que no cruzo solo.
-- ---------------------------------------------------------------------------

create table public.movimientos_nomina (
  id                      uuid primary key default gen_random_uuid(),
  reporte_id              uuid not null references public.reportes_nomina (id) on delete cascade,
  tienda_id               uuid references public.tiendas (id) on delete set null,
  colaborador_id          uuid references public.colaboradores (id) on delete set null,
  concepto_id             uuid references public.conceptos_nomina (id) on delete set null,
  codigo_empleado_origen  text,
  nombre_origen           text,
  codigo_concepto_origen  text,
  cantidad                numeric(10,2) not null default 0,   -- horas
  valor                   numeric(14,2) not null default 0,   -- pesos
  fecha_movimiento        date,
  fila_origen             integer,
  estado_match            public.estado_match not null default 'ok',
  raw                     jsonb,
  created_at              timestamptz not null default now()
);

create index movimientos_nomina_reporte_idx on public.movimientos_nomina (reporte_id);
create index movimientos_nomina_colaborador_idx on public.movimientos_nomina (colaborador_id);
create index movimientos_nomina_match_idx on public.movimientos_nomina (estado_match) where estado_match <> 'ok';

comment on column public.movimientos_nomina.raw is 'Fila original del reporte. Sin esto no hay como auditar un cruce dudoso.';

-- Extras y recargos reales por colaborador y periodo, ya separados del ruido
create view public.v_extras_reales
with (security_invoker = true) as
select
  r.id            as reporte_id,
  r.anio,
  r.mes,
  m.tienda_id,
  m.colaborador_id,
  sum(m.cantidad) filter (where cn.cuenta_como_extra)   as horas_extra_reales,
  sum(m.cantidad) filter (where cn.cuenta_como_recargo) as horas_recargo_reales,
  sum(m.valor)    filter (where cn.cuenta_como_extra)   as valor_extras,
  sum(m.valor)    filter (where cn.cuenta_como_recargo) as valor_recargos
from public.movimientos_nomina m
join public.reportes_nomina r on r.id = m.reporte_id
join public.conceptos_nomina cn on cn.id = m.concepto_id
where cn.incluir_en_conciliacion
group by r.id, r.anio, r.mes, m.tienda_id, m.colaborador_id;

-- ---------------------------------------------------------------------------
-- Conciliacion planeado vs real
-- ---------------------------------------------------------------------------

create table public.conciliaciones (
  id               uuid primary key default gen_random_uuid(),
  tienda_id        uuid not null references public.tiendas (id) on delete cascade,
  anio             smallint not null,
  mes              smallint not null,
  reporte_id       uuid references public.reportes_nomina (id) on delete set null,
  estado           public.estado_conciliacion not null default 'pendiente',
  tolerancia_horas numeric(5,2) not null default 0.5,
  generada_por     uuid references public.perfiles (id) on delete set null,
  generada_at      timestamptz not null default now(),
  revisada_por     uuid references public.perfiles (id) on delete set null,
  revisada_at      timestamptz,
  constraint conciliaciones_periodo_uk unique (tienda_id, anio, mes),
  constraint conciliaciones_mes_ck check (mes between 1 and 12)
);

create table public.conciliacion_detalle (
  id                     uuid primary key default gen_random_uuid(),
  conciliacion_id        uuid not null references public.conciliaciones (id) on delete cascade,
  colaborador_id         uuid not null references public.colaboradores (id) on delete cascade,
  horas_extra_planeadas  numeric(8,2) not null default 0,
  horas_extra_reales     numeric(8,2) not null default 0,
  horas_recargo_reales   numeric(8,2) not null default 0,
  diferencia_horas       numeric(8,2) generated always as (horas_extra_reales - horas_extra_planeadas) stored,
  valor_extras           numeric(14,2) not null default 0,
  estado                 public.estado_linea_conciliacion not null,
  comentario             text,
  constraint conciliacion_detalle_uk unique (conciliacion_id, colaborador_id)
);

create index conciliacion_detalle_estado_idx on public.conciliacion_detalle (estado) where estado <> 'cuadra';

comment on table public.conciliaciones is 'Un cierre por tienda y mes. Reemplaza el Excel de separar extras a mano.';
comment on column public.conciliaciones.tolerancia_horas is 'Margen antes de marcar una diferencia. Evita alertas por redondeos.';

-- Cada semana se imputa al mes de su lunes: criterio unico, simple y explicable
create or replace function public.conciliar_periodo(
  p_tienda_id uuid,
  p_anio      smallint,
  p_mes       smallint,
  p_reporte_id uuid default null
)
returns public.conciliaciones
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conc public.conciliaciones;
  v_reporte uuid;
  v_no_cuadran integer;
begin
  v_reporte := coalesce(
    p_reporte_id,
    (select r.id from public.reportes_nomina r
      where r.anio = p_anio and r.mes = p_mes
        and (r.tienda_id = p_tienda_id or r.tienda_id is null)
      order by r.cargado_at desc limit 1)
  );

  insert into public.conciliaciones (tienda_id, anio, mes, reporte_id, generada_por)
  values (p_tienda_id, p_anio, p_mes, v_reporte, (select auth.uid()))
  on conflict (tienda_id, anio, mes) do update
    set reporte_id = excluded.reporte_id,
        generada_at = now(),
        generada_por = excluded.generada_por,
        estado = 'pendiente'
  returning * into v_conc;

  delete from public.conciliacion_detalle d where d.conciliacion_id = v_conc.id;

  insert into public.conciliacion_detalle (
    conciliacion_id, colaborador_id,
    horas_extra_planeadas, horas_extra_reales, horas_recargo_reales, valor_extras, estado
  )
  select
    v_conc.id,
    c.id,
    coalesce(pl.horas, 0),
    coalesce(re.horas_extra_reales, 0),
    coalesce(re.horas_recargo_reales, 0),
    coalesce(re.valor_extras, 0),
    case
      when coalesce(pl.horas, 0) = 0 and coalesce(re.horas_extra_reales, 0) > v_conc.tolerancia_horas
        then 'sin_planeacion'::public.estado_linea_conciliacion
      when coalesce(re.horas_extra_reales, 0) - coalesce(pl.horas, 0) >  v_conc.tolerancia_horas
        then 'exceso'::public.estado_linea_conciliacion
      when coalesce(pl.horas, 0) - coalesce(re.horas_extra_reales, 0) >  v_conc.tolerancia_horas
        then 'faltante'::public.estado_linea_conciliacion
      else 'cuadra'::public.estado_linea_conciliacion
    end
  from public.colaboradores c
  left join (
    select rs.colaborador_id, sum(rs.horas_extra_planeadas) as horas
    from public.v_resumen_semanal rs
    where rs.tienda_id = p_tienda_id
      and extract(year  from rs.fecha_inicio) = p_anio
      and extract(month from rs.fecha_inicio) = p_mes
    group by rs.colaborador_id
  ) pl on pl.colaborador_id = c.id
  left join public.v_extras_reales re
    on re.colaborador_id = c.id
   and re.anio = p_anio
   and re.mes = p_mes
   and (v_reporte is null or re.reporte_id = v_reporte)
  where c.tienda_id = p_tienda_id
    and (coalesce(pl.horas, 0) > 0 or coalesce(re.horas_extra_reales, 0) > 0);

  select count(*) into v_no_cuadran
  from public.conciliacion_detalle d
  where d.conciliacion_id = v_conc.id and d.estado <> 'cuadra';

  update public.conciliaciones
  set estado = (case when v_no_cuadran > 0 then 'no_cuadra' else 'cuadra' end)::public.estado_conciliacion
  where id = v_conc.id
  returning * into v_conc;

  return v_conc;
end;
$$;

comment on function public.conciliar_periodo(uuid, smallint, smallint, uuid) is
  'Cruza extra planeada contra extra pagada. Cada semana se imputa al mes de su lunes.';

-- ---------------------------------------------------------------------------
-- Plantillas y alertas · los borradores que hoy se reescriben cada vez
-- ---------------------------------------------------------------------------

create table public.plantillas_mensaje (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  tipo       public.tipo_alerta not null,
  asunto_tpl text not null,
  cuerpo_tpl text not null,
  activa     boolean not null default true
);

comment on column public.plantillas_mensaje.cuerpo_tpl is 'Usa marcadores {{clave}} que se reemplazan con el jsonb de variables.';

create table public.alertas (
  id                    uuid primary key default gen_random_uuid(),
  tipo                  public.tipo_alerta not null,
  tienda_id             uuid not null references public.tiendas (id) on delete cascade,
  destinatario_perfil_id uuid references public.perfiles (id) on delete set null,
  colaborador_id        uuid references public.colaboradores (id) on delete set null,
  origen_tabla          text,
  origen_id             uuid,
  asunto                text not null,
  cuerpo                text not null,
  variables             jsonb not null default '{}'::jsonb,
  estado                public.estado_alerta not null default 'borrador',
  canal                 public.canal_alerta not null default 'interna',
  creada_at             timestamptz not null default now(),
  enviada_at            timestamptz,
  enviada_por           uuid references public.perfiles (id) on delete set null
);

create index alertas_tienda_estado_idx on public.alertas (tienda_id, estado, creada_at desc);
create index alertas_origen_idx on public.alertas (origen_tabla, origen_id);

comment on table public.alertas is 'El mensaje al admin sale redactado solo; Monica revisa y envia.';

create or replace function app.render_plantilla(p_tpl text, p_vars jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_out text := p_tpl;
  v_k   text;
begin
  for v_k in select jsonb_object_keys(p_vars) loop
    v_out := replace(v_out, '{{' || v_k || '}}', coalesce(p_vars ->> v_k, ''));
  end loop;
  return v_out;
end;
$$;

revoke all on function app.render_plantilla(text, jsonb) from public;
grant execute on function app.render_plantilla(text, jsonb) to authenticated;

-- Genera un borrador de llamado de atencion por cada linea que no cuadra
create or replace function public.generar_alertas_conciliacion(p_conciliacion_id uuid)
returns setof public.alertas
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conc public.conciliaciones;
  v_tpl  public.plantillas_mensaje;
begin
  select * into v_conc from public.conciliaciones where id = p_conciliacion_id;
  if v_conc.id is null then
    raise exception 'La conciliacion % no existe o no es visible', p_conciliacion_id;
  end if;

  select * into v_tpl from public.plantillas_mensaje
  where codigo = 'LLAMADO_ATENCION_EXTRAS' and activa;

  if v_tpl.id is null then
    raise exception 'Falta la plantilla LLAMADO_ATENCION_EXTRAS';
  end if;

  return query
  insert into public.alertas (tipo, tienda_id, colaborador_id, origen_tabla, origen_id, asunto, cuerpo, variables)
  select
    'llamado_atencion',
    v_conc.tienda_id,
    d.colaborador_id,
    'conciliacion_detalle',
    d.id,
    app.render_plantilla(v_tpl.asunto_tpl, vars.v),
    app.render_plantilla(v_tpl.cuerpo_tpl, vars.v),
    vars.v
  from public.conciliacion_detalle d
  join public.colaboradores c on c.id = d.colaborador_id
  join public.tiendas t on t.id = v_conc.tienda_id
  cross join lateral (
    select jsonb_build_object(
      'colaborador', c.nombre_completo,
      'tienda', t.codigo || ' - ' || t.nombre,
      'periodo', v_conc.mes || '/' || v_conc.anio,
      'horas_planeadas', d.horas_extra_planeadas::text,
      'horas_reales', d.horas_extra_reales::text,
      'diferencia', d.diferencia_horas::text
    ) as v
  ) vars
  where d.conciliacion_id = p_conciliacion_id
    and d.estado in ('exceso', 'sin_planeacion')
    and not exists (
      select 1 from public.alertas a
      where a.origen_tabla = 'conciliacion_detalle' and a.origen_id = d.id
    )
  returning *;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.conceptos_nomina     enable row level security;
alter table public.reportes_nomina      enable row level security;
alter table public.movimientos_nomina   enable row level security;
alter table public.conciliaciones       enable row level security;
alter table public.conciliacion_detalle enable row level security;
alter table public.plantillas_mensaje   enable row level security;
alter table public.alertas              enable row level security;

create policy "conceptos_select" on public.conceptos_nomina
  for select to authenticated using ( true );
create policy "conceptos_insert" on public.conceptos_nomina
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "conceptos_update" on public.conceptos_nomina
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "conceptos_delete" on public.conceptos_nomina
  for delete to authenticated
  using ( app.es_coordinador() );

-- La nomina es materia de coordinacion: solo Monica carga y procesa reportes
create policy "reportes_select" on public.reportes_nomina
  for select to authenticated
  using ( app.es_coordinador() or (tienda_id is not null and app.puede_ver_tienda(tienda_id)) );
create policy "reportes_insert" on public.reportes_nomina
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "reportes_update" on public.reportes_nomina
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "reportes_delete" on public.reportes_nomina
  for delete to authenticated
  using ( app.es_coordinador() );

create policy "movimientos_select" on public.movimientos_nomina
  for select to authenticated
  using ( app.es_coordinador() or (tienda_id is not null and app.puede_ver_tienda(tienda_id)) );
create policy "movimientos_insert" on public.movimientos_nomina
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "movimientos_update" on public.movimientos_nomina
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "movimientos_delete" on public.movimientos_nomina
  for delete to authenticated
  using ( app.es_coordinador() );

create policy "conciliaciones_select" on public.conciliaciones
  for select to authenticated using ( app.puede_ver_tienda(tienda_id) );
create policy "conciliaciones_insert" on public.conciliaciones
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "conciliaciones_update" on public.conciliaciones
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "conciliaciones_delete" on public.conciliaciones
  for delete to authenticated
  using ( app.es_coordinador() );

create policy "conciliacion_detalle_select" on public.conciliacion_detalle
  for select to authenticated
  using ( exists (
    select 1 from public.conciliaciones c
    where c.id = conciliacion_id and app.puede_ver_tienda(c.tienda_id)
  ) );
create policy "conciliacion_detalle_insert" on public.conciliacion_detalle
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "conciliacion_detalle_update" on public.conciliacion_detalle
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "conciliacion_detalle_delete" on public.conciliacion_detalle
  for delete to authenticated
  using ( app.es_coordinador() );

create policy "plantillas_select" on public.plantillas_mensaje
  for select to authenticated using ( true );
create policy "plantillas_insert" on public.plantillas_mensaje
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "plantillas_update" on public.plantillas_mensaje
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "plantillas_delete" on public.plantillas_mensaje
  for delete to authenticated
  using ( app.es_coordinador() );

-- El admin ve las alertas dirigidas a su tienda; solo el coordinador las crea y envia
create policy "alertas_select" on public.alertas
  for select to authenticated using ( app.puede_ver_tienda(tienda_id) );
create policy "alertas_insert" on public.alertas
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "alertas_update" on public.alertas
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "alertas_delete" on public.alertas
  for delete to authenticated
  using ( app.es_coordinador() );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select                         on public.conceptos_nomina     to authenticated;
grant select, insert, update, delete on public.reportes_nomina      to authenticated;
grant select, insert, update, delete on public.movimientos_nomina   to authenticated;
grant select, insert, update, delete on public.conciliaciones       to authenticated;
grant select, insert, update, delete on public.conciliacion_detalle to authenticated;
grant select                         on public.plantillas_mensaje   to authenticated;
grant select, insert, update, delete on public.alertas              to authenticated;
grant select on public.v_extras_reales to authenticated;

grant execute on function public.conciliar_periodo(uuid, smallint, smallint, uuid) to authenticated;
grant execute on function public.generar_alertas_conciliacion(uuid) to authenticated;
