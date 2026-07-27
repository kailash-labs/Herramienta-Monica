'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type TipoAusencia = Database['public']['Enums']['tipo_ausencia']
type CausaAusencia = Database['public']['Enums']['causa_ausencia']
type Resultado = { ok: true; liberados: number } | { ok: false; error: string }

function ruta(tiendaId: string, semana: string) {
  return `/cronograma/${tiendaId}/${semana}`
}

export async function registrarAusencia(entrada: {
  tiendaId: string
  semana: string
  colaboradorId: string
  tipo: TipoAusencia
  causa: CausaAusencia | null
  fechaInicio: string
  fechaFin: string
  descripcion: string
  liberarTurnos: boolean
}): Promise<Resultado> {
  const supabase = await createClient()

  if (entrada.tipo === 'incapacidad' && !entrada.causa) {
    return { ok: false, error: 'Una incapacidad necesita la causa.' }
  }

  if (entrada.fechaFin < entrada.fechaInicio) {
    return { ok: false, error: 'La fecha de fin no puede ser anterior a la de inicio.' }
  }

  // Cuantos turnos hay en el rango: sirve para contarle al usuario que se libero
  const { count } = await supabase
    .from('turnos')
    .select('id', { count: 'exact', head: true })
    .eq('colaborador_id', entrada.colaboradorId)
    .gte('fecha', entrada.fechaInicio)
    .lte('fecha', entrada.fechaFin)

  const { error } = await supabase.rpc('registrar_ausencia', {
    p_colaborador_id: entrada.colaboradorId,
    p_tipo: entrada.tipo,
    p_fecha_inicio: entrada.fechaInicio,
    p_fecha_fin: entrada.fechaFin,
    p_causa: entrada.causa ?? undefined,
    p_descripcion: entrada.descripcion || undefined,
    p_liberar_turnos: entrada.liberarTurnos,
  })

  if (error) return { ok: false, error: error.message }

  // Liberar turnos cambia las horas: las reglas se recalculan de una
  if (entrada.liberarTurnos) {
    const { data: semanas } = await supabase
      .from('semanas')
      .select('id')
      .eq('tienda_id', entrada.tiendaId)
      .neq('estado', 'cerrada')
      .lte('fecha_inicio', entrada.fechaFin)
      .gte('fecha_fin', entrada.fechaInicio)

    for (const s of semanas ?? []) {
      await supabase.rpc('validar_semana', { p_semana_id: s.id })
    }
  }

  revalidatePath(ruta(entrada.tiendaId, entrada.semana))
  return { ok: true, liberados: entrada.liberarTurnos ? (count ?? 0) : 0 }
}

export async function borrarAusencia(
  tiendaId: string,
  semana: string,
  ausenciaId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('ausencias').delete().eq('id', ausenciaId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(ruta(tiendaId, semana))
  return { ok: true }
}
