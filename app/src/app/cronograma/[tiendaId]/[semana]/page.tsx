import { notFound } from 'next/navigation'
import Shell from '@/components/shell'
import { createClient } from '@/lib/supabase/server'
import { lunesDe, sumarDias } from '@/lib/dominio'
import { lecturaConfigurada } from '@/lib/importacion/extraer'
import Aforo from './grilla'
import SinSemana from './sin-semana'

export default async function PaginaAforo(props: {
  params: Promise<{ tiendaId: string; semana: string }>
}) {
  const { tiendaId, semana } = await props.params

  // La semana siempre arranca lunes: si llega otra fecha, la normalizamos
  const lunes = lunesDe(new Date(`${semana}T00:00:00`))
  const anterior = sumarDias(lunes, -7)

  const supabase = await createClient()

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, codigo, nombre, ciudad')
    .eq('id', tiendaId)
    .maybeSingle()

  if (!tienda) notFound()

  const [{ data: semanaFila }, { data: cargos }, { data: colaboradores }] = await Promise.all([
    supabase
      .from('semanas')
      .select('id, fecha_inicio, fecha_fin, estado, notas, publicada_at')
      .eq('tienda_id', tiendaId)
      .eq('fecha_inicio', lunes)
      .maybeSingle(),
    supabase
      .from('cargos')
      .select('id, codigo, nombre, color, orden')
      .eq('activo', true)
      .order('orden'),
    supabase
      .from('colaboradores')
      .select('id, nombre_completo, codigo_empleado, cargo_id, horas_contrato, tipo_jornada')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .order('nombre_completo'),
  ])

  if (!semanaFila) {
    // Solo se ofrece copiar si la semana anterior existe y tiene algo adentro:
    // un botón que copia cero turnos es peor que no tener el botón.
    // turnos.semana_inicio está denormalizado, así que esto se resuelve en una
    // sola consulta sin pasar por semanas.
    const { count: turnosPrevios } = await supabase
      .from('turnos')
      .select('id', { count: 'exact', head: true })
      .eq('tienda_id', tiendaId)
      .eq('semana_inicio', anterior)

    return (
      <Shell actual="cronograma">
        <SinSemana
          tienda={tienda}
          semana={lunes}
          semanaAnterior={turnosPrevios && turnosPrevios > 0 ? anterior : null}
        />
      </Shell>
    )
  }

  const finSemana = sumarDias(lunes, 6)

  const [
    { data: turnos },
    { data: resumen },
    { data: validaciones },
    { data: adjuntos },
    { data: ausencias },
    { data: frecuentes },
  ] = await Promise.all([
    supabase
      .from('turnos')
      .select('id, colaborador_id, fecha, orden_bloque, hora_inicio, hora_fin, tipo_turno, duracion_minutos')
      .eq('semana_id', semanaFila.id)
      .order('fecha')
      .order('orden_bloque'),
    supabase.rpc('resumen_semana', { p_semana_id: semanaFila.id }),
    supabase
      .from('validaciones')
      .select('id, codigo_regla, severidad, colaborador_id, mensaje, estado, justificacion')
      .eq('semana_id', semanaFila.id)
      .order('severidad'),
    supabase
      .from('aforo_adjuntos')
      .select('id, storage_path, archivo_nombre, origen, estado, subido_at, mime_type')
      .eq('semana_id', semanaFila.id)
      .order('subido_at', { ascending: false }),
    // Toda ausencia que se solape con la semana, aunque empiece antes
    supabase
      .from('ausencias')
      .select('id, colaborador_id, tipo, causa, fecha_inicio, fecha_fin, dias, descripcion')
      .eq('tienda_id', tiendaId)
      .lte('fecha_inicio', finSemana)
      .gte('fecha_fin', lunes)
      .order('fecha_inicio'),
    // Los horarios más usados de esta tienda, para el atajo de un toque
    supabase.rpc('turnos_frecuentes', { p_tienda_id: tiendaId, p_limite: 8 }),
  ])

  return (
    <Shell actual="cronograma">
      <Aforo
        tienda={tienda}
        semana={semanaFila}
        semanaAnterior={anterior}
        cargos={cargos ?? []}
        colaboradores={colaboradores ?? []}
        turnos={turnos ?? []}
        resumen={resumen ?? []}
        validaciones={validaciones ?? []}
        adjuntos={adjuntos ?? []}
        ausencias={ausencias ?? []}
        frecuentes={frecuentes ?? []}
        lecturaDisponible={lecturaConfigurada()}
      />
    </Shell>
  )
}
