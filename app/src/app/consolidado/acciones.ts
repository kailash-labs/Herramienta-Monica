'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mensajeAmable } from '@/lib/mensajes'

type Resultado = { ok: true } | { ok: false; error: string }

export async function conciliar(
  tiendaId: string,
  anio: number,
  mes: number,
): Promise<Resultado> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('conciliar_periodo', {
    p_tienda_id: tiendaId,
    p_anio: anio,
    p_mes: mes,
  })

  if (error) return { ok: false, error: mensajeAmable(error, 'consolidado') }

  // Si algo no cuadra, dejamos los borradores listos de una
  const conciliacionId = Array.isArray(data) ? data[0]?.id : (data as { id?: string })?.id
  if (conciliacionId) {
    await supabase.rpc('generar_alertas_conciliacion', {
      p_conciliacion_id: conciliacionId,
    })
  }

  revalidatePath('/consolidado')
  return { ok: true }
}

export async function conciliarTodas(
  tiendaIds: string[],
  anio: number,
  mes: number,
): Promise<Resultado> {
  for (const id of tiendaIds) {
    const r = await conciliar(id, anio, mes)
    if (!r.ok) return r
  }
  return { ok: true }
}

export async function marcarAlertaEnviada(alertaId: string): Promise<Resultado> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('alertas')
    .update({ estado: 'enviada', enviada_at: new Date().toISOString() })
    .eq('id', alertaId)

  if (error) return { ok: false, error: mensajeAmable(error, 'consolidado') }

  revalidatePath('/consolidado')
  return { ok: true }
}

export async function descartarAlerta(alertaId: string): Promise<Resultado> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('alertas')
    .update({ estado: 'descartada' })
    .eq('id', alertaId)

  if (error) return { ok: false, error: mensajeAmable(error, 'consolidado') }

  revalidatePath('/consolidado')
  return { ok: true }
}
