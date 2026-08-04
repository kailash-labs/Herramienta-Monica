-- =============================================================================
-- 12 · Mensajes en lenguaje llano
--
-- Todo texto que sale de la base puede terminar en la pantalla de Mónica, asi
-- que se le aplica el mismo criterio que a la interfaz: acentos, la palabra
-- "alerta" en vez de "hallazgo", y el proximo paso dicho en una frase.
--
-- Los mensajes se corrigen con un replace sobre el cuerpo actual de cada
-- funcion en vez de copiar sus definiciones enteras. El cambio es de texto, no
-- de logica, y volver a escribir 200 lineas para arreglar un acento es la forma
-- mas facil de introducir un error donde no habia ninguno. Cada replace se
-- verifica, asi que si el texto de origen cambia esta migracion falla en vez de
-- no hacer nada.
-- =============================================================================

create or replace function app.reescribir_mensajes(
  p_funcion      regprocedure,
  p_correcciones text[][]
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_def      text;
  v_original text;
  v_par      text[];
begin
  v_def := pg_get_functiondef(p_funcion);

  foreach v_par slice 1 in array p_correcciones loop
    v_original := v_def;
    v_def := replace(v_def, v_par[1], v_par[2]);
    if v_def = v_original then
      raise exception 'No se encontró el texto «%» en %: revisar la migración',
        v_par[1], p_funcion;
    end if;
  end loop;

  execute v_def;
end;
$$;

-- Vive solo lo que dura esta migracion: al final se borra. Una funcion que
-- ejecuta texto arbitrario no tiene por que quedar instalada en la base.

-- Las alertas del motor -------------------------------------------------------
select app.reescribir_mensajes('public.validar_semana(uuid)', array[
  ['%s dia(s) de descanso', '%s día(s) de descanso'],
  ['el minimo es',          'el mínimo es'],
  ['(minimo %s h)',         '(mínimo %s h)'],
  ['%s dias seguidos',      '%s días seguidos'],
  ['el maximo es',          'el máximo es'],
  ['brecha maxima',         'brecha máxima']
]);

-- La edicion de un dia --------------------------------------------------------
select app.reescribir_mensajes(
  'public.guardar_turno_dia(uuid, uuid, date, public.tipo_turno, jsonb, public.motivo_cambio, uuid)',
  array[
    ['Los bloques deben venir como arreglo',    'Los bloques del día llegaron mal armados'],
    ['Un dia admite como maximo dos bloques',   'Un día admite como máximo dos bloques'],
    ['Cada bloque necesita hora de inicio y de fin',
     'Cada bloque necesita hora de entrada y de salida'],
    ['El bloque % no puede empezar y terminar a la misma hora',
     'El bloque % empieza y termina a la misma hora']
  ]
);

-- El registro de una ausencia -------------------------------------------------
select app.reescribir_mensajes(
  'public.registrar_ausencia(uuid, public.tipo_ausencia, date, date, public.causa_ausencia, text, boolean)',
  array[
    ['La fecha de fin no puede ser anterior a la de inicio',
     'La fecha de regreso no puede ser anterior a la de inicio'],
    ['El colaborador no existe o no es visible',
     'No encontramos a esa persona, o no está en una tienda que puedas editar']
  ]
);

-- El bloqueo de una semana cerrada -------------------------------------------
select app.reescribir_mensajes('app.turnos_bloquear_semana_cerrada()', array[
  ['La semana esta cerrada: no admite cambios de turnos',
   'Esa semana ya está cerrada y no admite cambios']
]);

-- Las alertas guardan el mensaje ya armado, y validar_semana solo reescribe las
-- que no estan aceptadas: sin este update, una alerta justificada conservaria la
-- ortografia vieja para siempre y en la misma pantalla convivirian las dos.
update public.validaciones
set mensaje = replace(replace(replace(replace(replace(replace(
        mensaje,
        'dia(s) de descanso', 'día(s) de descanso'),
        'el minimo es',       'el mínimo es'),
        '(minimo ',           '(mínimo '),
        ' dias seguidos',     ' días seguidos'),
        'el maximo es',       'el máximo es'),
        'brecha maxima',      'brecha máxima')
where mensaje like '%minimo%'
   or mensaje like '%maximo%'
   or mensaje like '%dia(s)%'
   or mensaje like '% dias seguidos%';

-- ---------------------------------------------------------------------------
-- Publicar: decir cuantas alertas faltan y cual es el proximo paso.
-- Esta se reescribe completa a proposito: no es solo el texto, tambien
-- documenta que su predicado es el mismo que usa la grilla.
-- ---------------------------------------------------------------------------

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

  -- Este predicado es el mismo con el que la grilla deshabilita el boton de
  -- publicar (grilla.tsx). Si se cambia uno hay que cambiar el otro.
  select count(*) into v_bloqueantes
  from public.validaciones v
  where v.semana_id = p_semana_id
    and v.estado = 'abierta'
    and v.severidad = 'bloqueante';

  if v_bloqueantes > 0 then
    raise exception 'Todavía queda % alerta(s) por resolver antes de publicar', v_bloqueantes
      using hint = 'Corregí el horario, o justificá la alerta si el caso lo amerita.';
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

comment on function public.validar_semana(uuid) is
  'Corre el motor sobre una semana, refresca las alertas y devuelve las abiertas.';

drop function app.reescribir_mensajes(regprocedure, text[][]);
