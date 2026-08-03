-- =============================================================================
-- 13 · Personal: dar de alta, corregir y retirar gente
--
-- Hasta ahora la nomina de cada tienda solo se podia tocar por SQL. El aforo
-- lista a quien esta en `colaboradores`, asi que si entra alguien nuevo no hay
-- forma de cargarle turnos, y si alguien se va sigue apareciendo semana a semana
-- con sus celdas vacias.
--
-- La decision de fondo: **quien trabajo no se borra, se retira**. Sus turnos,
-- sus novedades y sus movimientos de nomina son historia pagada, y el
-- consolidado de un mes cerrado tiene que seguir cuadrando dentro de un ano.
-- Borrar de verdad queda solo para el caso que no es historia: alguien cargado
-- por error, sin nada colgando.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0 · Que un borrado en cascada no explote
--
-- Defecto latente que este trabajo vuelve alcanzable: al borrar una semana, una
-- tienda o un colaborador, Postgres borra sus turnos, y el trigger de bitacora
-- intenta escribir una fila cuyas claves foraneas apuntan al padre que se acaba
-- de ir. La cascada fallaba entera con un error de clave foranea.
--
-- Se parchea con un reemplazo quirurgico sobre la definicion viva, no
-- reescribiendo la funcion: asi cualquier cambio que otra migracion le haya
-- hecho al cuerpo sobrevive, y si la funcion cambio de forma esto falla ruidoso
-- en vez de revertir el trabajo de otro en silencio.
-- ---------------------------------------------------------------------------

do $migracion$
declare
  v_def   text := pg_get_functiondef('app.registrar_cambio_turno()'::regprocedure);
  v_ancla constant text := '  v_row := coalesce(new, old);';
  v_nuevo constant text := $guarda$  v_row := coalesce(new, old);

  -- Un borrado en cascada llega aca con el padre ya eliminado: no se puede
  -- escribir la bitacora porque sus claves foraneas apuntan a filas que ya no
  -- existen. Tampoco haria falta: cambios_turno cuelga de la semana y de la
  -- tienda con on delete cascade, asi que se iria detras del padre igual.
  if tg_op = 'DELETE' and (
       not exists (select 1 from public.semanas  where id = old.semana_id)
    or not exists (select 1 from public.tiendas  where id = old.tienda_id)
    or (old.colaborador_id is not null
        and not exists (select 1 from public.colaboradores where id = old.colaborador_id))
  ) then
    return old;
  end if;$guarda$;
begin
  if position(v_ancla in v_def) = 0 then
    raise exception 'app.registrar_cambio_turno() cambio de forma: revisar esta migracion';
  end if;

  execute replace(v_def, v_ancla, v_nuevo);
end
$migracion$;


-- ---------------------------------------------------------------------------
-- 1 · Alta y correccion
--
-- Una sola funcion para las dos cosas porque el formulario es el mismo y las
-- validaciones tambien. `p_id` nulo es alta.
--
-- Los choques de codigo y documento se atajan a mano en vez de dejar salir el
-- error de indice unico: los indices son globales a toda la empresa, asi que el
-- duplicado puede estar en una tienda que quien carga ni siquiera ve, y
-- "violates unique constraint colaboradores_codigo_empleado_uk" no le dice a
-- nadie que el codigo ya lo tiene otra persona.
-- ---------------------------------------------------------------------------

create or replace function public.guardar_colaborador(
  p_tienda_id      uuid,
  p_nombre         text,
  p_cargo_id       uuid,
  p_tipo_jornada   public.tipo_jornada default 'completa',
  p_horas_contrato numeric default null,
  p_codigo         text default null,
  p_documento      text default null,
  p_fecha_ingreso  date default null,
  p_id             uuid default null
)
returns public.colaboradores
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_fila   public.colaboradores;
  v_nombre text    := nullif(btrim(p_nombre), '');
  v_codigo text    := nullif(btrim(p_codigo), '');
  v_doc    text    := nullif(btrim(p_documento), '');
  v_horas  numeric := coalesce(
                        p_horas_contrato,
                        case p_tipo_jornada
                          when 'medio_tiempo' then 21
                          when 'aprendiz'     then 36
                          else 42
                        end);
begin
  if v_nombre is null then
    raise exception 'Falta el nombre de la persona';
  end if;

  if not exists (select 1 from public.cargos where id = p_cargo_id and activo) then
    raise exception 'Ese cargo ya no está disponible'
      using hint = 'Elegí uno de la lista.';
  end if;

  if v_horas <= 0 or v_horas > 60 then
    raise exception 'Las horas de contrato tienen que estar entre 1 y 60'
      using hint = format('Se escribieron %s.', trim(to_char(v_horas, 'FM999990.99')));
  end if;

  if p_id is not null then
    select * into v_fila from public.colaboradores where id = p_id;

    if not found then
      raise exception 'Esa persona ya no está en la herramienta';
    end if;

    if v_fila.tienda_id <> p_tienda_id then
      raise exception 'No se puede mover a una persona de tienda desde acá'
        using hint = 'Retirala de esta tienda y dala de alta en la otra: así el historial de cada tienda queda derecho.';
    end if;

    if v_fila.fecha_retiro is not null and p_fecha_ingreso is not null
       and v_fila.fecha_retiro < p_fecha_ingreso then
      raise exception 'La fecha de ingreso quedaría después de la de retiro';
    end if;
  end if;

  -- El pre-chequeo cubre lo que quien carga puede ver; el bloque de excepcion de
  -- abajo cubre lo que no ve, que es justo donde el mensaje crudo seria inutil.
  if v_codigo is not null and exists (
    select 1 from public.colaboradores c
     where c.codigo_empleado = v_codigo and c.id is distinct from p_id
  ) then
    raise exception 'El código % ya es de otra persona', v_codigo
      using hint = 'Revisá el código en el reporte de nómina: es el que se usa para cruzar.';
  end if;

  if v_doc is not null and exists (
    select 1 from public.colaboradores c
     where c.documento = v_doc and c.id is distinct from p_id
  ) then
    raise exception 'Ese documento ya está registrado con otra persona';
  end if;

  begin
    if p_id is null then
      -- Un insert que RLS rechaza si levanta error propio (42501), asi que aca
      -- no hace falta chequear nada mas.
      insert into public.colaboradores (
        tienda_id, cargo_id, nombre_completo, codigo_empleado, documento,
        tipo_jornada, horas_contrato, fecha_ingreso
      )
      values (
        p_tienda_id, p_cargo_id, v_nombre, v_codigo, v_doc,
        p_tipo_jornada, v_horas, p_fecha_ingreso
      )
      returning * into v_fila;
    else
      update public.colaboradores
         set cargo_id        = p_cargo_id,
             nombre_completo = v_nombre,
             codigo_empleado = v_codigo,
             documento       = v_doc,
             tipo_jornada    = p_tipo_jornada,
             horas_contrato  = v_horas,
             fecha_ingreso   = p_fecha_ingreso
       where id = p_id
      returning * into v_fila;

      -- Un update que RLS rechaza no da error: filtra la fila y afecta cero.
      -- Sin esto la pantalla diria "guardado" y no se habria guardado nada.
      if not found then
        raise exception 'No tenés permiso para editar a las personas de esta tienda';
      end if;
    end if;
  exception when unique_violation then
    raise exception 'Ese código o documento ya está registrado con otra persona'
      using hint = 'Puede estar cargada en otra tienda, donde no la ves.';
  end;

  return v_fila;
end;
$$;

comment on function public.guardar_colaborador(uuid, text, uuid, public.tipo_jornada, numeric, text, text, date, uuid) is
  'Alta o correccion de una persona de la tienda. p_id nulo es alta.';

grant execute on function public.guardar_colaborador(uuid, text, uuid, public.tipo_jornada, numeric, text, text, date, uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- 2 · Retiro
--
-- Es el borrado de verdad de la app: la persona deja de aparecer en el aforo,
-- pero todo lo que trabajo sigue existiendo.
--
-- Se liberan los turnos **posteriores** a la fecha de retiro, no los de ese dia:
-- la fecha de retiro es el ultimo dia trabajado. Y solo en semanas abiertas, por
-- lo mismo que en `registrar_ausencia`: una semana cerrada ya se concilio contra
-- nomina y tocarla dejaria de cuadrar.
-- ---------------------------------------------------------------------------

create or replace function public.retirar_colaborador(
  p_id           uuid,
  p_fecha_retiro date default current_date
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_fila      public.colaboradores;
  v_liberados integer := 0;
  v_semanas   date[];
begin
  select * into v_fila from public.colaboradores where id = p_id;

  if not found then
    raise exception 'Esa persona ya no está en la herramienta';
  end if;

  if v_fila.fecha_ingreso is not null and p_fecha_retiro < v_fila.fecha_ingreso then
    raise exception 'La fecha de retiro no puede ser anterior a la de ingreso';
  end if;

  perform set_config('app.motivo_cambio', 'retiro', true);

  with borrados as (
    delete from public.turnos t
    using public.semanas s
    where t.semana_id = s.id
      and t.colaborador_id = p_id
      and t.fecha > p_fecha_retiro
      and s.estado <> 'cerrada'
    returning s.fecha_inicio
  )
  select count(*)::integer, coalesce(array_agg(distinct fecha_inicio), '{}')
    into v_liberados, v_semanas
  from borrados;

  update public.colaboradores
     set fecha_retiro = p_fecha_retiro,
         activo       = false
   where id = p_id
  returning * into v_fila;

  -- RLS filtra en silencio en un update: sin esto la pantalla diria que la
  -- retiro y la persona seguiria apareciendo en el aforo.
  if not found then
    raise exception 'No tenés permiso para retirar personas de esta tienda';
  end if;

  -- Las horas de la semana cambiaron: las reglas se recalculan de una, igual que
  -- al guardar un turno. Si no, quedan alertas de una persona que ya no esta.
  perform public.validar_semana(s.id)
     from public.semanas s
    where s.tienda_id = v_fila.tienda_id
      and s.fecha_inicio = any(v_semanas);

  return jsonb_build_object(
    'nombre',    v_fila.nombre_completo,
    'liberados', v_liberados,
    'semanas',   to_jsonb(v_semanas)
  );
end;
$$;

comment on function public.retirar_colaborador(uuid, date) is
  'Marca el retiro y libera los turnos posteriores en semanas abiertas, conservando todo el historial.';

grant execute on function public.retirar_colaborador(uuid, date) to authenticated;


-- ---------------------------------------------------------------------------
-- 3 · Reincorporar
--
-- Un retiro cargado por error no puede ser irreversible: los turnos liberados no
-- vuelven solos, pero la persona si.
-- ---------------------------------------------------------------------------

create or replace function public.reincorporar_colaborador(p_id uuid)
returns public.colaboradores
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_fila public.colaboradores;
begin
  update public.colaboradores
     set fecha_retiro = null,
         activo       = true
   where id = p_id
  returning * into v_fila;

  if not found then
    raise exception 'No encontramos a esa persona, o no tenés permiso sobre su tienda';
  end if;

  return v_fila;
end;
$$;

comment on function public.reincorporar_colaborador(uuid) is
  'Deshace un retiro. Los turnos que el retiro libero no se restauran.';

grant execute on function public.reincorporar_colaborador(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- 4 · Borrar de verdad
--
-- Solo para lo que no es historia: alguien cargado por error, duplicado o mal
-- tipeado, sin un solo turno, novedad ni movimiento de nomina. Con historia se
-- retira, y esta funcion lo dice en vez de dejar que la cascada arrase.
--
-- La politica de RLS ya limita el delete a coordinacion, pero RLS filtra en
-- silencio: sin el chequeo de abajo, un admin de tienda veria "listo" y la
-- persona seguiria ahi.
-- ---------------------------------------------------------------------------

create or replace function public.eliminar_colaborador(p_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_fila    public.colaboradores;
  v_turnos  integer;
  v_novedad integer;
  v_nomina  integer;
begin
  select * into v_fila from public.colaboradores where id = p_id;

  if not found then
    raise exception 'Esa persona ya no está en la herramienta';
  end if;

  select count(*) into v_turnos  from public.turnos             where colaborador_id = p_id;
  select count(*) into v_novedad from public.ausencias          where colaborador_id = p_id;
  select count(*) into v_nomina  from public.movimientos_nomina where colaborador_id = p_id;

  if v_turnos + v_novedad + v_nomina > 0 then
    raise exception '% ya tiene historial en la herramienta y no se puede borrar', v_fila.nombre_completo
      using hint = 'Si ya no trabaja acá, marcala como retirada: sale del aforo y se conserva lo que trabajó.';
  end if;

  delete from public.colaboradores where id = p_id;

  if not found then
    raise exception 'Solo coordinación puede borrar a una persona'
      using hint = 'Vos sí podés retirarla, que es lo que corresponde cuando ya trabajó.';
  end if;

  return jsonb_build_object('nombre', v_fila.nombre_completo);
end;
$$;

comment on function public.eliminar_colaborador(uuid) is
  'Borra a alguien cargado por error. Se niega si tiene turnos, novedades o movimientos de nomina.';

grant execute on function public.eliminar_colaborador(uuid) to authenticated;
