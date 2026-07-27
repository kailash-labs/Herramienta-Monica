import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { lunesDe, sumarDias } from '@/lib/dominio'
import HojaImpresion from './hoja'

export default async function PaginaImprimir(props: {
  params: Promise<{ tiendaId: string; semana: string }>
}) {
  const { tiendaId, semana } = await props.params
  const lunes = lunesDe(new Date(`${semana}T00:00:00`))
  const finSemana = sumarDias(lunes, 6)

  const supabase = await createClient()

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, codigo, nombre, ciudad')
    .eq('id', tiendaId)
    .maybeSingle()

  if (!tienda) notFound()

  const { data: semanaFila } = await supabase
    .from('semanas')
    .select('id, fecha_inicio, estado, publicada_at, notas')
    .eq('tienda_id', tiendaId)
    .eq('fecha_inicio', lunes)
    .maybeSingle()

  if (!semanaFila) notFound()

  const [{ data: cargos }, { data: colaboradores }, { data: turnos }, { data: resumen }, { data: ausencias }] =
    await Promise.all([
      supabase.from('cargos').select('id, nombre, color, orden').eq('activo', true).order('orden'),
      supabase
        .from('colaboradores')
        .select('id, nombre_completo, codigo_empleado, cargo_id')
        .eq('tienda_id', tiendaId)
        .eq('activo', true)
        .order('codigo_empleado'),
      supabase
        .from('turnos')
        .select('id, colaborador_id, fecha, orden_bloque, hora_inicio, hora_fin, tipo_turno, duracion_minutos')
        .eq('semana_id', semanaFila.id)
        .order('fecha')
        .order('orden_bloque'),
      supabase.rpc('resumen_semana', { p_semana_id: semanaFila.id }),
      supabase
        .from('ausencias')
        .select('id, colaborador_id, tipo, fecha_inicio, fecha_fin')
        .eq('tienda_id', tiendaId)
        .lte('fecha_inicio', finSemana)
        .gte('fecha_fin', lunes),
    ])

  return (
    <HojaImpresion
      tienda={tienda}
      semana={semanaFila}
      cargos={cargos ?? []}
      colaboradores={colaboradores ?? []}
      turnos={turnos ?? []}
      resumen={resumen ?? []}
      ausencias={ausencias ?? []}
    />
  )
}
