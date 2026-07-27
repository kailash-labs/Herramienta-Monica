-- =============================================================================
-- 06 · Adjuntos del aforo
-- El admin puede llenar la plantilla o subir la foto/PDF del aforo. Las dos vias
-- llegan al mismo lugar: la semana. La foto es respaldo y evidencia; la plantilla
-- es lo que el motor puede validar.
-- =============================================================================

create type public.origen_adjunto as enum (
  'foto',        -- foto del horario en papel o de la pantalla
  'pdf_sipo',    -- exportacion del cronograma operativo de Sipo
  'otro'
);

create type public.estado_adjunto as enum (
  'sin_procesar',   -- subido, todavia nadie lo paso a turnos
  'transcrito',     -- ya se cargaron los turnos en la plantilla
  'descartado'
);

create table public.aforo_adjuntos (
  id            uuid primary key default gen_random_uuid(),
  semana_id     uuid not null references public.semanas (id) on delete cascade,
  tienda_id     uuid not null references public.tiendas (id) on delete cascade,
  origen        public.origen_adjunto not null default 'foto',
  estado        public.estado_adjunto not null default 'sin_procesar',
  storage_path  text not null unique,
  archivo_nombre text,
  mime_type     text,
  tamano_bytes  integer,
  nota          text,
  subido_por    uuid references public.perfiles (id) on delete set null,
  subido_at     timestamptz not null default now(),

  constraint aforo_adjuntos_semana_tienda_fk
    foreign key (semana_id, tienda_id) references public.semanas (id, tienda_id)
    on update cascade on delete cascade
);

create index aforo_adjuntos_semana_idx on public.aforo_adjuntos (semana_id, subido_at desc);
create index aforo_adjuntos_pendientes_idx on public.aforo_adjuntos (tienda_id)
  where estado = 'sin_procesar';

comment on table public.aforo_adjuntos is
  'Foto o PDF del aforo. Es evidencia de lo que el admin mando; la validacion sigue corriendo sobre los turnos de la plantilla.';
comment on column public.aforo_adjuntos.estado is
  'sin_procesar hasta que los turnos quedan cargados en la plantilla. Deja ver que semanas llegaron solo como foto.';

-- Rellena tienda_id desde la semana
create or replace function app.adjuntos_completar_tienda()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tienda_id is null then
    select s.tienda_id into new.tienda_id
    from public.semanas s where s.id = new.semana_id;
  end if;
  return new;
end;
$$;

create trigger aforo_adjuntos_tienda
  before insert on public.aforo_adjuntos
  for each row execute function app.adjuntos_completar_tienda();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.aforo_adjuntos enable row level security;

create policy "aforo_adjuntos_select" on public.aforo_adjuntos
  for select to authenticated using ( app.puede_ver_tienda(tienda_id) );

create policy "aforo_adjuntos_insert" on public.aforo_adjuntos
  for insert to authenticated with check ( app.puede_editar_tienda(tienda_id) );

create policy "aforo_adjuntos_update" on public.aforo_adjuntos
  for update to authenticated
  using ( app.puede_editar_tienda(tienda_id) )
  with check ( app.puede_editar_tienda(tienda_id) );

create policy "aforo_adjuntos_delete" on public.aforo_adjuntos
  for delete to authenticated using ( app.puede_editar_tienda(tienda_id) );

grant select, insert, update, delete on public.aforo_adjuntos to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- Bucket privado. La ruta empieza con el uuid de la tienda: <tienda>/<semana>/<archivo>
-- y las policies validan ese primer segmento contra los permisos del usuario.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aforos',
  'aforos',
  false,
  10485760,   -- 10 MB
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Una ruta mal formada no debe reventar la policy con un error de cast: devuelve
-- null y el permiso simplemente no se concede.
create or replace function app.tienda_de_ruta(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_id uuid;
begin
  begin
    v_id := ((storage.foldername(p_name))[1])::uuid;
  exception when others then
    return null;
  end;
  return v_id;
end;
$$;

revoke all on function app.tienda_de_ruta(text) from public;
grant execute on function app.tienda_de_ruta(text) to authenticated;

-- Upsert necesita select + insert + update; sin los tres, reemplazar un archivo falla en silencio
create policy "aforos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'aforos'
    and app.puede_ver_tienda(app.tienda_de_ruta(name))
  );

create policy "aforos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'aforos'
    and app.puede_editar_tienda(app.tienda_de_ruta(name))
  );

create policy "aforos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'aforos'
    and app.puede_editar_tienda(app.tienda_de_ruta(name))
  )
  with check (
    bucket_id = 'aforos'
    and app.puede_editar_tienda(app.tienda_de_ruta(name))
  );

create policy "aforos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'aforos'
    and app.puede_editar_tienda(app.tienda_de_ruta(name))
  );
