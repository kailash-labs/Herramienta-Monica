-- =============================================================================
-- 01 · Base organizacional, perfiles y helpers de autorizacion
-- Herramienta Monica · control de aforos y extras
-- =============================================================================

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums base
-- ---------------------------------------------------------------------------

create type public.app_rol as enum (
  'coordinador',   -- Monica: ve y opera todas las tiendas
  'admin_tienda',  -- administrador de una o varias tiendas
  'observador'     -- solo lectura
);

create type public.tipo_jornada as enum (
  'completa',      -- 42h semanales
  'medio_tiempo',
  'aprendiz',
  'temporal'
);

-- ---------------------------------------------------------------------------
-- Tiendas
-- ---------------------------------------------------------------------------

create table public.tiendas (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique,               -- 'Q40'
  nombre        text not null,                      -- 'UNICENTRO - ARMENIA'
  ciudad        text,
  hora_apertura time not null default '11:00',
  hora_cierre   time not null default '21:00',
  activa        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.tiendas is 'Puntos de venta. El codigo es el que usa Frisby (Q40, etc).';

-- ---------------------------------------------------------------------------
-- Cargos (las bandas del cronograma: ADMINISTRACION, DESPACHO COMBOS, ...)
-- ---------------------------------------------------------------------------

create table public.cargos (
  id      uuid primary key default gen_random_uuid(),
  codigo  text not null unique,
  nombre  text not null,
  color   text,                                     -- color de la banda en la grilla
  orden   smallint not null default 100,
  activo  boolean not null default true
);

comment on table public.cargos is 'Agrupacion de colaboradores en el cronograma. El orden define como se pintan las bandas.';

-- ---------------------------------------------------------------------------
-- Perfiles (espejo de auth.users con el rol de la herramienta)
-- ---------------------------------------------------------------------------

create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null,
  email      text,
  rol        public.app_rol not null default 'admin_tienda',
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.perfiles is 'Un perfil por usuario de auth. El rol decide el alcance en RLS.';

-- Tiendas que administra cada perfil (los coordinadores no necesitan filas aca)
create table public.perfil_tiendas (
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  tienda_id uuid not null references public.tiendas (id) on delete cascade,
  primary key (perfil_id, tienda_id)
);

-- ---------------------------------------------------------------------------
-- Colaboradores
-- ---------------------------------------------------------------------------

create table public.colaboradores (
  id              uuid primary key default gen_random_uuid(),
  tienda_id       uuid not null references public.tiendas (id) on delete restrict,
  cargo_id        uuid not null references public.cargos (id) on delete restrict,
  codigo_empleado text,                             -- llave para cruzar con el reporte de nomina
  nombre_completo text not null,
  documento       text,
  tipo_jornada    public.tipo_jornada not null default 'completa',
  horas_contrato  numeric(5,2) not null default 42,
  fecha_ingreso   date,
  fecha_retiro    date,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint colaboradores_horas_contrato_ck check (horas_contrato > 0 and horas_contrato <= 60),
  constraint colaboradores_retiro_ck check (fecha_retiro is null or fecha_ingreso is null or fecha_retiro >= fecha_ingreso)
);

create unique index colaboradores_codigo_empleado_uk
  on public.colaboradores (codigo_empleado)
  where codigo_empleado is not null;

create unique index colaboradores_documento_uk
  on public.colaboradores (documento)
  where documento is not null;

create index colaboradores_tienda_idx on public.colaboradores (tienda_id) where activo;
create index colaboradores_cargo_idx on public.colaboradores (cargo_id);

comment on column public.colaboradores.horas_contrato is 'Tope semanal contratado. 42h es el estandar; las horas por encima son extra planeada.';
comment on column public.colaboradores.codigo_empleado is 'Llave de cruce contra el reporte de nomina de Frisby.';

-- ---------------------------------------------------------------------------
-- updated_at automatico
-- ---------------------------------------------------------------------------

create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tiendas_updated_at       before update on public.tiendas       for each row execute function app.set_updated_at();
create trigger perfiles_updated_at      before update on public.perfiles      for each row execute function app.set_updated_at();
create trigger colaboradores_updated_at before update on public.colaboradores for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers de autorizacion
-- SECURITY DEFINER a proposito: leen perfiles/perfil_tiendas, que tienen RLS.
-- Viven en el schema app (no expuesto) y siempre filtran por auth.uid().
-- ---------------------------------------------------------------------------

create or replace function app.rol_actual()
returns public.app_rol
language sql
stable
security definer
set search_path = ''
as $$
  select p.rol
  from public.perfiles p
  where p.id = (select auth.uid())
    and p.activo
$$;

create or replace function app.es_coordinador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app.rol_actual() = 'coordinador', false)
$$;

create or replace function app.puede_ver_tienda(p_tienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.es_coordinador()
      or exists (
        select 1
        from public.perfil_tiendas pt
        join public.perfiles p on p.id = pt.perfil_id
        where pt.perfil_id = (select auth.uid())
          and pt.tienda_id = p_tienda_id
          and p.activo
      )
$$;

-- Escribir exige rol operativo: un observador ve pero no toca
create or replace function app.puede_editar_tienda(p_tienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.puede_ver_tienda(p_tienda_id)
     and coalesce(app.rol_actual() in ('coordinador', 'admin_tienda'), false)
$$;

revoke all on function app.rol_actual()              from public;
revoke all on function app.es_coordinador()          from public;
revoke all on function app.puede_ver_tienda(uuid)    from public;
revoke all on function app.puede_editar_tienda(uuid) from public;
revoke all on function app.set_updated_at()          from public;

grant execute on function app.rol_actual()              to authenticated;
grant execute on function app.es_coordinador()          to authenticated;
grant execute on function app.puede_ver_tienda(uuid)    to authenticated;
grant execute on function app.puede_editar_tienda(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Alta automatica de perfil al crear el usuario
-- ---------------------------------------------------------------------------

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.tiendas        enable row level security;
alter table public.cargos         enable row level security;
alter table public.perfiles       enable row level security;
alter table public.perfil_tiendas enable row level security;
alter table public.colaboradores  enable row level security;

-- Perfiles: cada quien se ve a si mismo; el coordinador ve a todos
create policy "perfiles_select" on public.perfiles
  for select to authenticated
  using ( id = (select auth.uid()) or app.es_coordinador() );

-- Cada quien edita su propio perfil pero no se cambia el rol; el coordinador edita a todos
create policy "perfiles_update" on public.perfiles
  for update to authenticated
  using ( id = (select auth.uid()) or app.es_coordinador() )
  with check (
    app.es_coordinador()
    or (id = (select auth.uid()) and rol = app.rol_actual())
  );

create policy "perfiles_insert" on public.perfiles
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "perfiles_delete" on public.perfiles
  for delete to authenticated
  using ( app.es_coordinador() );

-- Perfil-tiendas: solo el coordinador reparte accesos
create policy "perfil_tiendas_select" on public.perfil_tiendas
  for select to authenticated
  using ( perfil_id = (select auth.uid()) or app.es_coordinador() );

create policy "perfil_tiendas_insert" on public.perfil_tiendas
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "perfil_tiendas_update" on public.perfil_tiendas
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "perfil_tiendas_delete" on public.perfil_tiendas
  for delete to authenticated
  using ( app.es_coordinador() );

-- Tiendas: se ven las asignadas; solo el coordinador las crea o modifica
create policy "tiendas_select" on public.tiendas
  for select to authenticated
  using ( app.puede_ver_tienda(id) );

create policy "tiendas_insert" on public.tiendas
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "tiendas_update" on public.tiendas
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "tiendas_delete" on public.tiendas
  for delete to authenticated
  using ( app.es_coordinador() );

-- Cargos: catalogo comun, lectura para todos, escritura del coordinador
create policy "cargos_select" on public.cargos
  for select to authenticated
  using ( true );

create policy "cargos_insert" on public.cargos
  for insert to authenticated
  with check ( app.es_coordinador() );

create policy "cargos_update" on public.cargos
  for update to authenticated
  using ( app.es_coordinador() )
  with check ( app.es_coordinador() );

create policy "cargos_delete" on public.cargos
  for delete to authenticated
  using ( app.es_coordinador() );

-- Colaboradores: alcance por tienda
create policy "colaboradores_select" on public.colaboradores
  for select to authenticated
  using ( app.puede_ver_tienda(tienda_id) );

create policy "colaboradores_insert" on public.colaboradores
  for insert to authenticated
  with check ( app.puede_editar_tienda(tienda_id) );

create policy "colaboradores_update" on public.colaboradores
  for update to authenticated
  using ( app.puede_editar_tienda(tienda_id) )
  with check ( app.puede_editar_tienda(tienda_id) );

create policy "colaboradores_delete" on public.colaboradores
  for delete to authenticated
  using ( app.es_coordinador() );

-- ---------------------------------------------------------------------------
-- Exposicion a la Data API (desde 2026-05-30 no es automatica)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.tiendas        to authenticated;
grant select, insert, update, delete on public.cargos         to authenticated;
grant select, insert, update, delete on public.perfiles       to authenticated;
grant select, insert, update, delete on public.perfil_tiendas to authenticated;
grant select, insert, update, delete on public.colaboradores  to authenticated;
