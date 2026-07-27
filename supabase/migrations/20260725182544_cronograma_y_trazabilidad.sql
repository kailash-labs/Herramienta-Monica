-- =============================================================================
-- 02 · Cronograma en vivo: semanas, turnos planeados, trazabilidad y ausencias
-- Este es el lado PLANEADO del ciclo.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.estado_semana as enum (
  'borrador',    -- el admin la esta armando, las reglas avisan pero no bloquean
  'publicada',   -- aforo oficial de la semana; los cambios quedan trazados
  'cerrada'      -- semana pasada, congelada para conciliar contra nomina
);

create type public.tipo_turno as enum (
  'completo',     -- jornada completa (7h en el estandar de 42h/6 dias)
  'parcial',      -- jornada recortada
  'partido',      -- dos bloques el mismo dia
  'fijo_oficios'  -- turno fijo de oficios varios
);

create type public.accion_cambio as enum ('creado', 'editado', 'eliminado');

create type public.motivo_cambio as enum (
  'planeacion_inicial',
  'incapacidad',
  'ausencia',
  'permiso',
  'vacaciones',
  'retiro',
  'cambio_operativo',
  'solicitud_colaborador',
  'correccion',
  'otro'
);

create type public.tipo_ausencia as enum (
  'incapacidad',
  'permiso_remunerado',
  'permiso_no_remunerado',
  'ausencia_injustificada',
  'vacaciones',
  'licencia'
);

create type public.causa_ausencia as enum (
  'viral',
  'cita_medica',
  'accidente_laboral',
  'accidente_comun',
  'enfermedad_general',
  'maternidad_paternidad',
  'calamidad_domestica',
  'personal',
  'otro'
);

-- ---------------------------------------------------------------------------
-- Claves compuestas que permiten integridad declarativa aguas abajo
-- ---------------------------------------------------------------------------

alter table public.colaboradores add constraint colaboradores_id_tienda_uk unique (id, tienda_id);

-- ---------------------------------------------------------------------------
-- Ausencias · alimentan el dashboard acumulado de ausentismo
-- ---------------------------------------------------------------------------

create table public.ausencias (
  id              uuid primary key default gen_random_uuid(),
  colaborador_id  uuid not null references public.colaboradores (id) on delete cascade,
  tienda_id       uuid not null references public.tiendas (id) on delete restrict,
  tipo            public.tipo_ausencia not null,
  causa           public.causa_ausencia,
  fecha_inicio    date not null,
  fecha_fin       date not null,
  dias            integer generated always as (fecha_fin - fecha_inicio + 1) stored,
  descripcion     text,
  soporte_url     text,
  registrada_por  uuid references public.perfiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint ausencias_rango_ck check (fecha_fin >= fecha_inicio),
  constraint ausencias_causa_incapacidad_ck
    check (tipo <> 'incapacidad' or causa is not null),
  constraint ausencias_colaborador_tienda_fk
    foreign key (colaborador_id, tienda_id) references public.colaboradores (id, tienda_id) on update cascade
);

create index ausencias_colaborador_idx on public.ausencias (colaborador_id, fecha_inicio desc);
create index ausencias_tienda_fecha_idx on public.ausencias (tienda_id, fecha_inicio desc);
create index ausencias_causa_idx on public.ausencias (causa) where tipo = 'incapacidad';

comment on table public.ausencias is 'Toda ausencia con su causa. En 2-3 anios es la base del tablero de ausentismo y seguridad en el trabajo.';

-- ---------------------------------------------------------------------------
-- Semanas de aforo
-- ---------------------------------------------------------------------------

create table public.semanas (
  id            uuid primary key default gen_random_uuid(),
  tienda_id     uuid not null references public.tiendas (id) on delete cascade,
  fecha_inicio  date not null,                       -- siempre lunes
  fecha_fin     date generated always as (fecha_inicio + 6) stored,
  estado        public.estado_semana not null default 'borrador',
  publicada_por uuid references public.perfiles (id) on delete set null,
  publicada_at  timestamptz,
  cerrada_at    timestamptz,
  notas         text,
  created_by    uuid references public.perfiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint semanas_inicia_lunes_ck check (extract(isodow from fecha_inicio) = 1),
  constraint semanas_tienda_fecha_uk unique (tienda_id, fecha_inicio),
  constraint semanas_id_tienda_uk unique (id, tienda_id),
  constraint semanas_id_inicio_uk unique (id, fecha_inicio)
);

create index semanas_tienda_idx on public.semanas (tienda_id, fecha_inicio desc);
create index semanas_estado_idx on public.semanas (estado);

create trigger semanas_updated_at before update on public.semanas
  for each row execute function app.set_updated_at();

comment on table public.semanas is 'Una fila por tienda y semana. El aforo deja de ser una foto: vive aca y se edita durante la semana.';

-- ---------------------------------------------------------------------------
-- Turnos planeados
-- Un turno partido son dos filas del mismo dia con orden_bloque 1 y 2.
-- ---------------------------------------------------------------------------

create table public.turnos (
  id             uuid primary key default gen_random_uuid(),
  semana_id      uuid not null references public.semanas (id) on delete cascade,
  semana_inicio  date not null,                      -- denormalizado: hace declarativo el check de rango
  tienda_id      uuid not null references public.tiendas (id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores (id) on delete cascade,
  fecha          date not null,
  orden_bloque   smallint not null default 1,
  hora_inicio    time not null,
  hora_fin       time not null,
  tipo_turno     public.tipo_turno not null default 'completo',
  duracion_minutos integer generated always as (
    (extract(epoch from (hora_fin - hora_inicio)) / 60)::integer
    + case when hora_fin <= hora_inicio then 1440 else 0 end
  ) stored,
  nota           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint turnos_bloque_ck check (orden_bloque between 1 and 2),
  constraint turnos_fecha_en_semana_ck check (fecha >= semana_inicio and fecha < semana_inicio + 7),
  constraint turnos_colaborador_dia_bloque_uk unique (colaborador_id, fecha, orden_bloque),

  -- coherencia: la semana, el colaborador y el turno son de la misma tienda
  constraint turnos_semana_tienda_fk
    foreign key (semana_id, tienda_id) references public.semanas (id, tienda_id) on update cascade on delete cascade,
  constraint turnos_semana_inicio_fk
    foreign key (semana_id, semana_inicio) references public.semanas (id, fecha_inicio) on update cascade on delete cascade,
  constraint turnos_colaborador_tienda_fk
    foreign key (colaborador_id, tienda_id) references public.colaboradores (id, tienda_id) on update cascade
);

create index turnos_semana_idx on public.turnos (semana_id);
create index turnos_colaborador_idx on public.turnos (colaborador_id, fecha);
create index turnos_tienda_fecha_idx on public.turnos (tienda_id, fecha);

comment on table public.turnos is 'Turno planeado. Un partido son dos filas del mismo dia (orden_bloque 1 y 2).';
comment on column public.turnos.duracion_minutos is 'Calculada. Si hora_fin <= hora_inicio se asume cruce de medianoche.';
comment on column public.turnos.semana_inicio is 'Copia del lunes de la semana: permite garantizar por constraint que la fecha cae dentro de su semana.';

-- Rellena semana_inicio y tienda_id desde la semana, para que la app no tenga que mandarlos
create or replace function app.turnos_completar_denormalizados()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_inicio date;
  v_tienda uuid;
begin
  select s.fecha_inicio, s.tienda_id into v_inicio, v_tienda
  from public.semanas s
  where s.id = new.semana_id;

  if v_inicio is null then
    raise exception 'La semana % no existe', new.semana_id;
  end if;

  new.semana_inicio := v_inicio;
  new.tienda_id := coalesce(new.tienda_id, v_tienda);
  return new;
end;
$$;

create trigger turnos_denormalizados
  before insert or update of semana_id on public.turnos
  for each row execute function app.turnos_completar_denormalizados();

create trigger turnos_updated_at before update on public.turnos
  for each row execute function app.set_updated_at();

-- No se tocan turnos de una semana cerrada
create or replace function app.turnos_bloquear_semana_cerrada()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_estado public.estado_semana;
  v_semana uuid;
begin
  v_semana := coalesce(new.semana_id, old.semana_id);
  select s.estado into v_estado from public.semanas s where s.id = v_semana;

  if v_estado = 'cerrada' then
    raise exception 'La semana esta cerrada: no admite cambios de turnos';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger turnos_semana_cerrada
  before insert or update or delete on public.turnos
  for each row execute function app.turnos_bloquear_semana_cerrada();

-- ---------------------------------------------------------------------------
-- Trazabilidad · cada edicion de la semana queda registrada con causa
-- La app declara el motivo antes de escribir:
--   select set_config('app.motivo_cambio', 'incapacidad', true);
--   select set_config('app.ausencia_id', '<uuid>', true);
-- ---------------------------------------------------------------------------

create table public.cambios_turno (
  id             uuid primary key default gen_random_uuid(),
  semana_id      uuid not null references public.semanas (id) on delete cascade,
  tienda_id      uuid not null references public.tiendas (id) on delete cascade,
  turno_id       uuid,                                -- sin FK: sobrevive al borrado del turno
  colaborador_id uuid references public.colaboradores (id) on delete set null,
  fecha_turno    date,
  accion         public.accion_cambio not null,
  motivo         public.motivo_cambio not null default 'otro',
  ausencia_id    uuid references public.ausencias (id) on delete set null,
  datos_antes    jsonb,
  datos_despues  jsonb,
  minutos_antes  integer,
  minutos_despues integer,
  delta_minutos  integer generated always as (coalesce(minutos_despues, 0) - coalesce(minutos_antes, 0)) stored,
  hecho_por      uuid references public.perfiles (id) on delete set null,
  hecho_at       timestamptz not null default now()
);

create index cambios_turno_semana_idx on public.cambios_turno (semana_id, hecho_at desc);
create index cambios_turno_colaborador_idx on public.cambios_turno (colaborador_id, fecha_turno);
create index cambios_turno_motivo_idx on public.cambios_turno (motivo);

comment on table public.cambios_turno is 'Bitacora de la semana. Responde que cambio, cuando, quien y por que; es lo que hoy se pierde.';

create or replace function app.registrar_cambio_turno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_accion      public.accion_cambio;
  v_motivo      public.motivo_cambio;
  v_ausencia    uuid;
  v_motivo_txt  text;
  v_ausencia_txt text;
  v_row         public.turnos;
begin
  v_row := coalesce(new, old);

  v_accion := case tg_op
                when 'INSERT' then 'creado'::public.accion_cambio
                when 'UPDATE' then 'editado'::public.accion_cambio
                else 'eliminado'::public.accion_cambio
              end;

  -- Motivo por defecto segun la operacion; el explicito de la app le gana
  v_motivo := (case when tg_op = 'INSERT' then 'planeacion_inicial' else 'otro' end)::public.motivo_cambio;

  v_motivo_txt := nullif(current_setting('app.motivo_cambio', true), '');
  if v_motivo_txt is not null then
    begin
      v_motivo := v_motivo_txt::public.motivo_cambio;
    exception when others then
      null;  -- motivo desconocido: se queda el por defecto, no se pierde el cambio
    end;
  end if;

  v_ausencia_txt := nullif(current_setting('app.ausencia_id', true), '');
  begin
    v_ausencia := v_ausencia_txt::uuid;
  exception when others then
    v_ausencia := null;
  end;

  insert into public.cambios_turno (
    semana_id, tienda_id, turno_id, colaborador_id, fecha_turno,
    accion, motivo, ausencia_id,
    datos_antes, datos_despues, minutos_antes, minutos_despues, hecho_por
  )
  values (
    v_row.semana_id, v_row.tienda_id, v_row.id, v_row.colaborador_id, v_row.fecha,
    v_accion, v_motivo, v_ausencia,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    case when tg_op <> 'INSERT' then old.duracion_minutos end,
    case when tg_op <> 'DELETE' then new.duracion_minutos end,
    (select auth.uid())
  );

  return coalesce(new, old);
end;
$$;

create trigger turnos_traza
  after insert or update or delete on public.turnos
  for each row execute function app.registrar_cambio_turno();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.semanas       enable row level security;
alter table public.turnos        enable row level security;
alter table public.cambios_turno enable row level security;
alter table public.ausencias     enable row level security;

create policy "semanas_select" on public.semanas
  for select to authenticated using ( app.puede_ver_tienda(tienda_id) );
create policy "semanas_insert" on public.semanas
  for insert to authenticated with check ( app.puede_editar_tienda(tienda_id) );
create policy "semanas_update" on public.semanas
  for update to authenticated
  using ( app.puede_editar_tienda(tienda_id) )
  with check ( app.puede_editar_tienda(tienda_id) );
create policy "semanas_delete" on public.semanas
  for delete to authenticated using ( app.es_coordinador() );

create policy "turnos_select" on public.turnos
  for select to authenticated using ( app.puede_ver_tienda(tienda_id) );
create policy "turnos_insert" on public.turnos
  for insert to authenticated with check ( app.puede_editar_tienda(tienda_id) );
create policy "turnos_update" on public.turnos
  for update to authenticated
  using ( app.puede_editar_tienda(tienda_id) )
  with check ( app.puede_editar_tienda(tienda_id) );
create policy "turnos_delete" on public.turnos
  for delete to authenticated using ( app.puede_editar_tienda(tienda_id) );

-- La bitacora se lee, no se escribe a mano: solo la llena el trigger
create policy "cambios_turno_select" on public.cambios_turno
  for select to authenticated using ( app.puede_ver_tienda(tienda_id) );

create policy "ausencias_select" on public.ausencias
  for select to authenticated using ( app.puede_ver_tienda(tienda_id) );
create policy "ausencias_insert" on public.ausencias
  for insert to authenticated with check ( app.puede_editar_tienda(tienda_id) );
create policy "ausencias_update" on public.ausencias
  for update to authenticated
  using ( app.puede_editar_tienda(tienda_id) )
  with check ( app.puede_editar_tienda(tienda_id) );
create policy "ausencias_delete" on public.ausencias
  for delete to authenticated using ( app.es_coordinador() );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.semanas   to authenticated;
grant select, insert, update, delete on public.turnos    to authenticated;
grant select, insert, update, delete on public.ausencias to authenticated;
grant select                         on public.cambios_turno to authenticated;
