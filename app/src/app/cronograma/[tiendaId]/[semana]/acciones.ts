'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { MotivoCambio, TipoTurno } from '@/lib/dominio'

type Resultado = { ok: true } | { ok: false; error: string }

function ruta(tiendaId: string, semana: string) {
  return `/cronograma/${tiendaId}/${semana}`
}

export async function guardarTurno(entrada: {
  tiendaId: string
  semana: string
  semanaId: string
  colaboradorId: string
  fecha: string
  tipo: TipoTurno
  bloques: { inicio: string; fin: string }[]
  motivo: MotivoCambio
}): Promise<Resultado> {
  const supabase = await createClient()

  for (const b of entrada.bloques) {
    if (!b.inicio || !b.fin) {
      return { ok: false, error: 'Cada bloque necesita hora de inicio y de fin.' }
    }
  }

  const { error: errRpc } = await supabase.rpc('guardar_turno_dia', {
    p_semana_id: entrada.semanaId,
    p_colaborador_id: entrada.colaboradorId,
    p_fecha: entrada.fecha,
    p_tipo: entrada.tipo,
    p_bloques: entrada.bloques,
    p_motivo: entrada.motivo,
  })

  if (errRpc) return { ok: false, error: errRpc.message }

  // Las reglas se recalculan al vuelo: si el cambio genera una extra, se ve ya
  await supabase.rpc('validar_semana', { p_semana_id: entrada.semanaId })

  revalidatePath(ruta(entrada.tiendaId, entrada.semana))
  return { ok: true }
}

export async function borrarTurno(entrada: {
  tiendaId: string
  semana: string
  semanaId: string
  colaboradorId: string
  fecha: string
  motivo: MotivoCambio
}): Promise<Resultado> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('guardar_turno_dia', {
    p_semana_id: entrada.semanaId,
    p_colaborador_id: entrada.colaboradorId,
    p_fecha: entrada.fecha,
    p_tipo: 'completo',
    p_bloques: [],
    p_motivo: entrada.motivo,
  })

  if (error) return { ok: false, error: error.message }

  await supabase.rpc('validar_semana', { p_semana_id: entrada.semanaId })

  revalidatePath(ruta(entrada.tiendaId, entrada.semana))
  return { ok: true }
}

export async function revalidar(
  tiendaId: string,
  semana: string,
  semanaId: string,
): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('validar_semana', { p_semana_id: semanaId })
  if (error) return { ok: false, error: error.message }
  revalidatePath(ruta(tiendaId, semana))
  return { ok: true }
}

export async function publicar(
  tiendaId: string,
  semana: string,
  semanaId: string,
): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('publicar_semana', { p_semana_id: semanaId })
  if (error) return { ok: false, error: error.message }
  revalidatePath(ruta(tiendaId, semana))
  return { ok: true }
}

export async function crearSemana(
  tiendaId: string,
  semana: string,
): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('semanas')
    .insert({ tienda_id: tiendaId, fecha_inicio: semana })
  if (error) return { ok: false, error: error.message }
  revalidatePath(ruta(tiendaId, semana))
  return { ok: true }
}

export async function justificarHallazgo(
  tiendaId: string,
  semana: string,
  validacionId: string,
  justificacion: string,
): Promise<Resultado> {
  if (!justificacion.trim()) {
    return { ok: false, error: 'Hace falta escribir la justificación.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('validaciones')
    .update({
      estado: 'aceptada',
      justificacion,
      resuelta_at: new Date().toISOString(),
    })
    .eq('id', validacionId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(ruta(tiendaId, semana))
  return { ok: true }
}
