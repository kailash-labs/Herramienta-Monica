'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mensajeAmable } from '@/lib/mensajes'
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
    return { ok: false, error: 'Una incapacidad necesita que elijas la causa.' }
  }

  if (entrada.fechaFin < entrada.fechaInicio) {
    return {
      ok: false,
      error: 'La fecha de regreso no puede ser anterior a la de inicio.',
    }
  }

  // Una ausencia puede cruzar varias semanas, y registrar_ausencia libera turnos
  // en todas las que no estén cerradas. Se resuelven acá porque hacen falta tres
  // veces: para contar lo que se va a liberar, para revalidar las reglas y para
  // invalidar el caché de cada una.
  const { data: afectadas } = await supabase
    .from('semanas')
    .select('id, fecha_inicio')
    .eq('tienda_id', entrada.tiendaId)
    .neq('estado', 'cerrada')
    .lte('fecha_inicio', entrada.fechaFin)
    .gte('fecha_fin', entrada.fechaInicio)

  const semanas = afectadas ?? []

  // El conteo se limita a esas semanas: contar todos los turnos del rango le
  // prometería al usuario que se liberaron turnos de una semana cerrada, donde
  // el trigger no deja tocar nada.
  let porLiberar = 0
  if (entrada.liberarTurnos && semanas.length > 0) {
    const { count } = await supabase
      .from('turnos')
      .select('id', { count: 'exact', head: true })
      .eq('colaborador_id', entrada.colaboradorId)
      .in('semana_id', semanas.map((s) => s.id))
      .gte('fecha', entrada.fechaInicio)
      .lte('fecha', entrada.fechaFin)
    porLiberar = count ?? 0
  }

  const { error } = await supabase.rpc('registrar_ausencia', {
    p_colaborador_id: entrada.colaboradorId,
    p_tipo: entrada.tipo,
    p_fecha_inicio: entrada.fechaInicio,
    p_fecha_fin: entrada.fechaFin,
    p_causa: entrada.causa ?? undefined,
    p_descripcion: entrada.descripcion || undefined,
    p_liberar_turnos: entrada.liberarTurnos,
  })

  if (error) return { ok: false, error: mensajeAmable(error, 'registrarAusencia') }

  // Liberar turnos cambia las horas: las reglas se recalculan de una
  if (entrada.liberarTurnos) {
    for (const s of semanas) {
      await supabase.rpc('validar_semana', { p_semana_id: s.id })
    }
  }

  // Cada semana tocada, no solo la que está en pantalla: si no, las otras
  // muestran turnos que ya no existen.
  revalidatePath(ruta(entrada.tiendaId, entrada.semana))
  for (const s of semanas) revalidatePath(ruta(entrada.tiendaId, s.fecha_inicio))

  return { ok: true, liberados: entrada.liberarTurnos ? porLiberar : 0 }
}

export async function borrarAusencia(
  tiendaId: string,
  semana: string,
  ausenciaId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('ausencias').delete().eq('id', ausenciaId)
  if (error) return { ok: false, error: mensajeAmable(error, 'borrarAusencia') }

  revalidatePath(ruta(tiendaId, semana))
  return { ok: true }
}
