-- =============================================================================
-- 11 · Copiar el aforo de una semana a otra
--
-- Cargar la semana de una sola persona a mano son ~28 toques. La mayoria de las
-- semanas se parecen a la anterior, asi que copiar convierte "crear" en
-- "corregir": en vez de cargar 100 turnos se ajustan 5.
--
-- La copia NUNCA sobrescribe. Lo unico que esta funcion podria destruir es
-- trabajo hecho a mano, y no hay deshacer: cambios_turno es solo de lectura.
-- Como efecto secundario queda re-ejecutable sin dano, que es lo que importa
-- cuando el admin toca el boton dos veces desde el celular con mala senal.
-- =============================================================================

create or replace function public.copiar_aforo_semana(
  p_semana_destino uuid,
  p_semana_origen  uuid                 default null,  -- null = la anterior de la misma tienda
  p_motivo         public.motivo_cambio default 'planeacion_inicial'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_destino   public.semanas;
  v_origen    public.semanas;
  v_desfase   integer;
  v_resultado jsonb;
begin
  -- === 1 · La semana destino existe, se ve y admite cambios ================
  select * into v_destino from public.semanas s where s.id = p_semana_destino;

  if v_destino.id is null then
    raise exception 'La semana que querés llenar no existe o no la podés editar';
  end if;

  -- El trigger turnos_bloquear_semana_cerrada tambien lo impide, pero avisando
  -- antes el mensaje dice de que semana se trata.
  if v_destino.estado = 'cerrada' then
    raise exception 'La semana del % ya está cerrada: no se le pueden agregar turnos',
      to_char(v_destino.fecha_inicio, 'DD/MM/YYYY');
  end if;

  -- Copiar sobre una semana ya publicada no es "planeacion inicial": es un
  -- cambio, y la bitacora tiene que decir de que cambio se trata.
  if v_destino.estado = 'publicada' and p_motivo = 'planeacion_inicial' then
    raise exception 'La semana del % ya está publicada: hay que declarar el motivo del cambio',
      to_char(v_destino.fecha_inicio, 'DD/MM/YYYY');
  end if;

  -- === 2 · La semana origen: la explicita, o la inmediatamente anterior =====
  if p_semana_origen is null then
    select * into v_origen
    from public.semanas s
    where s.tienda_id = v_destino.tienda_id
      and s.fecha_inicio = v_destino.fecha_inicio - 7;
  else
    select * into v_origen from public.semanas s where s.id = p_semana_origen;
  end if;

  -- Que no haya semana anterior no es un error del usuario: es la primera
  -- semana de la tienda. Se informa, no se rompe.
  if v_origen.id is null then
    return jsonb_build_object(
      'origen_existe',   false,
      'semana_origen',   null,
      'semana_destino',  v_destino.fecha_inicio,
      'turnos_copiados', 0,
      'dias_copiados',   0,
      'personas',        0,
      'omitidos',        '[]'::jsonb,
      'bloqueantes',     0,
      'advertencias',    0
    );
  end if;

  if v_origen.tienda_id <> v_destino.tienda_id then
    raise exception 'Las dos semanas son de tiendas distintas';
  end if;

  if v_origen.id = v_destino.id then
    raise exception 'La semana de origen y la de destino son la misma';
  end if;

  -- Las dos empiezan lunes (semanas_inicia_lunes_ck), asi que el desfase es
  -- multiplo de 7 y cada dia copiado cae dentro de la semana destino por
  -- construccion: turnos_fecha_en_semana_ck no puede fallar aca.
  v_desfase := v_destino.fecha_inicio - v_origen.fecha_inicio;

  -- El trigger de trazabilidad lee estas variables. true = solo esta transaccion.
  perform set_config('app.motivo_cambio', p_motivo::text, true);
  perform set_config('app.ausencia_id', '', true);

  -- === 3 · Clasificar, copiar e informar en una sola sentencia ==============
  -- Una sentencia y no un loop: los triggers por fila corren igual, pero se
  -- ahorran ~160 planificaciones. Los exists() ven el snapshot previo al
  -- insert, asi que la copia no se interfiere a si misma.
  with candidatos as (
    select
      t.colaborador_id,
      c.nombre_completo    as persona,
      t.fecha + v_desfase  as fecha_destino,
      t.orden_bloque,
      t.hora_inicio,
      t.hora_fin,
      t.tipo_turno,
      c.activo,
      c.fecha_ingreso,
      c.fecha_retiro
    from public.turnos t
    join public.colaboradores c on c.id = t.colaborador_id
    where t.semana_id = v_origen.id
    -- turnos.nota no se copia: "cubre a Andrea" es falso esta semana.
  ),
  clasificados as (
    select
      k.*,
      aus.tipo as tipo_ausencia,
      case
        -- Orden intencional: el estado de la persona pesa mas que el del dia
        when not k.activo
          then 'inactivo'
        when k.fecha_retiro is not null and k.fecha_retiro < k.fecha_destino
          then 'retirado'
        when k.fecha_ingreso is not null and k.fecha_ingreso > k.fecha_destino
          then 'sin_ingresar'
        when aus.tipo is not null
          then 'ausencia'
        -- Se mira el dia completo y no el bloque: si el destino ya tiene medio
        -- partido cargado, no se completa con el otro medio de la semana pasada
        when exists (
          select 1 from public.turnos t2
          where t2.colaborador_id = k.colaborador_id
            and t2.fecha = k.fecha_destino
        ) then 'ya_cargado'
        else null
      end as omitir
    from candidatos k
    left join lateral (
      -- Las ausencias no estan acotadas a una semana: una incapacidad que
      -- empezo antes cubre igual el dia destino.
      select a.tipo
      from public.ausencias a
      where a.colaborador_id = k.colaborador_id
        and k.fecha_destino between a.fecha_inicio and a.fecha_fin
      order by a.fecha_inicio
      limit 1
    ) aus on true
  ),
  copiados as (
    insert into public.turnos (
      semana_id, colaborador_id, fecha, orden_bloque, hora_inicio, hora_fin, tipo_turno
    )
    select
      v_destino.id, x.colaborador_id, x.fecha_destino, x.orden_bloque,
      x.hora_inicio, x.hora_fin, x.tipo_turno
    from clasificados x
    where x.omitir is null
    -- Red contra una escritura concurrente entre la clasificacion y el insert:
    -- una carrera no aborta la copia entera. El AFTER trigger solo corre para
    -- las filas realmente insertadas, asi que la bitacora no miente.
    on conflict (colaborador_id, fecha, orden_bloque) do nothing
    returning colaborador_id, fecha
  ),
  omitidos as (
    select
      x.omitir                             as motivo,
      x.persona,
      max(x.tipo_ausencia::text)           as detalle,
      count(distinct x.fecha_destino)::int as dias
    from clasificados x
    where x.omitir is not null
    group by x.omitir, x.persona
  )
  select jsonb_build_object(
    'origen_existe',   true,
    'semana_origen',   v_origen.fecha_inicio,
    'semana_destino',  v_destino.fecha_inicio,
    'turnos_copiados', (select count(*) from copiados),
    'dias_copiados',   (select count(distinct (colaborador_id, fecha)) from copiados),
    'personas',        (select count(distinct colaborador_id) from copiados),
    'omitidos',        coalesce(
                         (select jsonb_agg(to_jsonb(o) order by o.motivo, o.persona)
                          from omitidos o),
                         '[]'::jsonb)
  )
  into v_resultado;

  -- === 4 · Recalcular reglas en la misma transaccion =======================
  -- 160 turnos nuevos casi siempre mueven alguna regla. Si esto quedara
  -- afuera, el usuario veria el conteo de alertas de antes de la copia.
  perform public.validar_semana(p_semana_destino);

  return v_resultado || jsonb_build_object(
    'bloqueantes', (
      select count(*) from public.validaciones v
      where v.semana_id = p_semana_destino
        and v.estado = 'abierta' and v.severidad = 'bloqueante'
    ),
    'advertencias', (
      select count(*) from public.validaciones v
      where v.semana_id = p_semana_destino
        and v.estado = 'abierta' and v.severidad = 'advertencia'
    )
  );
end;
$$;

comment on function public.copiar_aforo_semana(uuid, uuid, public.motivo_cambio) is
  'Traslada los turnos de una semana a otra sin sobrescribir nada. Omite personas inactivas, retiradas, no ingresadas, dias con ausencia registrada y dias ya cargados, y devuelve el detalle de cada omision.';

grant execute on function public.copiar_aforo_semana(uuid, uuid, public.motivo_cambio) to authenticated;

-- ---------------------------------------------------------------------------
-- Envoltorio: crear la semana y copiarla en un solo paso y una sola
-- transaccion. Es lo que necesita la pantalla de "esta semana todavia no
-- existe": un boton, no dos.
-- ---------------------------------------------------------------------------

create or replace function public.crear_aforo_copiando_anterior(
  p_tienda_id    uuid,
  p_fecha_inicio date
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_semana_id uuid;
begin
  if extract(isodow from p_fecha_inicio) <> 1 then
    raise exception 'La semana tiene que empezar un lunes';
  end if;

  select s.id into v_semana_id
  from public.semanas s
  where s.tienda_id = p_tienda_id and s.fecha_inicio = p_fecha_inicio;

  if v_semana_id is null then
    insert into public.semanas (tienda_id, fecha_inicio, created_by)
    values (p_tienda_id, p_fecha_inicio, (select auth.uid()))
    returning id into v_semana_id;
  end if;

  return public.copiar_aforo_semana(v_semana_id, null, 'planeacion_inicial')
         || jsonb_build_object('semana_id', v_semana_id);
end;
$$;

comment on function public.crear_aforo_copiando_anterior(uuid, date) is
  'Crea la semana si falta y le copia el aforo de la anterior, en una sola transaccion.';

grant execute on function public.crear_aforo_copiando_anterior(uuid, date) to authenticated;
