import { notFound } from 'next/navigation'
import Shell from '@/components/shell'
import { createClient } from '@/lib/supabase/server'
import { lunesDe, sumarDias } from '@/lib/dominio'
import Grilla from './grilla'
import SinSemana from './sin-semana'

export default async function PaginaCronograma(props: {
  params: Promise<{ tiendaId: string; semana: string }>
}) {
  const { tiendaId, semana } = await props.params

  // La semana siempre arranca lunes: si llega otra fecha, la normalizamos
  const lunes = lunesDe(new Date(`${semana}T00:00:00`))

  const supabase = await createClient()

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, codigo, nombre, ciudad')
    .eq('id', tiendaId)
    .maybeSingle()

  if (!tienda) notFound()

  const { data: semanaFila } = await supabase
    .from('semanas')
    .select('id, fecha_inicio, fecha_fin, estado, notas, publicada_at')
    .eq('tienda_id', tiendaId)
    .eq('fecha_inicio', lunes)
    .maybeSingle()

  const { data: cargos } = await supabase
    .from('cargos')
    .select('id, codigo, nombre, color, orden')
    .eq('activo', true)
    .order('orden')

  const { data: colaboradores } = await supabase
    .from('colaboradores')
    .select('id, nombre_completo, codigo_empleado, cargo_id, horas_contrato')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .order('codigo_empleado')

  if (!semanaFila) {
    return (
      <Shell actual="cronograma">
        <SinSemana tienda={tienda} semana={lunes} />
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
    ])

  return (
    <Shell actual="cronograma">
      <Grilla
        tienda={tienda}
        semana={semanaFila}
        cargos={cargos ?? []}
        colaboradores={colaboradores ?? []}
        turnos={turnos ?? []}
        resumen={resumen ?? []}
        validaciones={validaciones ?? []}
        adjuntos={adjuntos ?? []}
        ausencias={ausencias ?? []}
      />
    </Shell>
  )
}
