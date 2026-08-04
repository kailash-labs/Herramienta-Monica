'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mensajeAmable } from '@/lib/mensajes'
import { fechaCorta } from '@/lib/dominio'
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

  if (errRpc) return { ok: false, error: mensajeAmable(errRpc, 'guardarTurno') }

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

  if (error) return { ok: false, error: mensajeAmable(error, 'borrarTurno') }

  await supabase.rpc('validar_semana', { p_semana_id: entrada.semanaId })

  revalidatePath(ruta(entrada.tiendaId, entrada.semana))
  return { ok: true }
}

export async function publicar(
  tiendaId: string,
  semana: string,
  semanaId: string,
): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('publicar_semana', { p_semana_id: semanaId })
  if (error) return { ok: false, error: mensajeAmable(error, 'publicar') }
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
  if (error) return { ok: false, error: mensajeAmable(error, 'crearSemana') }
  revalidatePath(ruta(tiendaId, semana))
  return { ok: true }
}

/**
 * Copiar el aforo de la semana anterior. Es la acción que convierte "crear la
 * semana" en "corregir la semana": cargar los seis días de una sola persona a
 * mano son ~28 toques.
 *
 * `crearSemana` es true cuando la semana todavía no existe: el RPC la crea y le
 * copia la anterior en la misma transacción, para que la pantalla vacía tenga
 * una sola acción y no dos pasos.
 */
export async function copiarAforoAnterior(entrada: {
  tiendaId: string
  semana: string
  semanaId: string | null
}): Promise<Resultado & { resumen?: string }> {
  const supabase = await createClient()

  const { data, error } = entrada.semanaId
    ? await supabase.rpc('copiar_aforo_semana', { p_semana_destino: entrada.semanaId })
    : await supabase.rpc('crear_aforo_copiando_anterior', {
        p_tienda_id: entrada.tiendaId,
        p_fecha_inicio: entrada.semana,
      })

  if (error) return { ok: false, error: mensajeAmable(error, 'copiarAforoAnterior') }

  revalidatePath(ruta(entrada.tiendaId, entrada.semana))
  return { ok: true, resumen: resumenDeCopia(data as ResultadoCopia) }
}

type ResultadoCopia = {
  origen_existe: boolean
  semana_origen: string | null
  dias_copiados: number
  personas: number
  bloqueantes: number
  omitidos: { motivo: string; persona: string; dias: number; detalle: string | null }[]
}

/** Por qué no se copió a alguien, dicho sin exponer la clave interna */
const PORQUE_NO: Record<string, (detalle: string | null) => string> = {
  ya_cargado: () => 'ya tenía turnos cargados',
  ausencia: (d) => `tiene ${d ? ETIQUETA_AUSENCIA[d] ?? 'una novedad' : 'una novedad'} registrada`,
  retirado: () => 'ya no está en la tienda',
  sin_ingresar: () => 'entró después de esa semana',
  inactivo: () => 'está inactivo',
}

const ETIQUETA_AUSENCIA: Record<string, string> = {
  incapacidad: 'una incapacidad',
  permiso_remunerado: 'un permiso',
  permiso_no_remunerado: 'un permiso',
  ausencia_injustificada: 'una ausencia',
  vacaciones: 'vacaciones',
  licencia: 'una licencia',
}

function resumenDeCopia(r: ResultadoCopia): string {
  if (!r.origen_existe) {
    return 'Creé la semana en blanco: no hay una semana anterior de esta tienda para copiar.'
  }

  const partes: string[] = []

  if (r.dias_copiados === 0) {
    partes.push('No había nada nuevo que copiar de la semana anterior.')
  } else {
    partes.push(
      `Copié el aforo del ${fechaCorta(r.semana_origen!)}: ` +
        `${r.dias_copiados} día(s) de ${r.personas} persona(s).`,
    )
  }

  // Se agrupan por motivo: nombrar a diecisiete personas una por una no se lee.
  const porMotivo = new Map<string, { personas: number; dias: number; detalle: string | null }>()
  for (const o of r.omitidos) {
    const acc = porMotivo.get(o.motivo) ?? { personas: 0, dias: 0, detalle: o.detalle }
    porMotivo.set(o.motivo, {
      personas: acc.personas + 1,
      dias: acc.dias + o.dias,
      detalle: acc.detalle,
    })
  }

  for (const [motivo, x] of porMotivo) {
    const porque = PORQUE_NO[motivo]?.(x.detalle)
    if (!porque) continue
    partes.push(`No copié ${x.dias} día(s) de ${x.personas} persona(s) que ${porque}.`)
  }

  if (r.bloqueantes > 0) {
    partes.push(`Quedan ${r.bloqueantes} alerta(s) por resolver antes de publicar.`)
  }

  return partes.join(' ')
}

export async function justificarAlerta(
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

  if (error) return { ok: false, error: mensajeAmable(error, 'justificarAlerta') }

  revalidatePath(ruta(tiendaId, semana))
  return { ok: true }
}
