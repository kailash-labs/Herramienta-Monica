'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mensajeAmable } from '@/lib/mensajes'
import { fechaCorta } from '@/lib/dominio'
import type { Database } from '@/lib/supabase/database.types'

type TipoJornada = Database['public']['Enums']['tipo_jornada']
type Resultado = { ok: true; resumen?: string } | { ok: false; error: string }

function ruta(tiendaId: string) {
  return `/personal/${tiendaId}`
}

/**
 * El aforo de cualquier semana lista a la gente de la tienda, así que un alta o
 * un retiro cambia todas las semanas, no una. `revalidatePath` sobre el patrón
 * de la ruta las invalida todas de una: enumerarlas sería enumerar el futuro.
 *
 * El patrón tiene que ser el del archivo de ruta completo —parámetros incluidos—
 * porque `revalidatePath` trabaja sobre la estructura de archivos, no sobre la
 * URL. Eso alcanza también a las otras tiendas, que es de más pero no es un
 * error: invalidar no es recalcular, y la próxima visita las vuelve a armar.
 */
function revalidarAforos() {
  revalidatePath('/cronograma/[tiendaId]/[semana]', 'page')
}

export async function guardarPersona(entrada: {
  tiendaId: string
  id: string | null
  nombre: string
  cargoId: string
  tipoJornada: TipoJornada
  horasContrato: number | null
  codigo: string
  documento: string
  fechaIngreso: string
}): Promise<Resultado> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('guardar_colaborador', {
    p_tienda_id: entrada.tiendaId,
    p_nombre: entrada.nombre,
    p_cargo_id: entrada.cargoId,
    p_tipo_jornada: entrada.tipoJornada,
    p_horas_contrato: entrada.horasContrato ?? undefined,
    p_codigo: entrada.codigo || undefined,
    p_documento: entrada.documento || undefined,
    p_fecha_ingreso: entrada.fechaIngreso || undefined,
    p_id: entrada.id ?? undefined,
  })

  if (error) return { ok: false, error: mensajeAmable(error, 'guardarPersona') }

  revalidatePath(ruta(entrada.tiendaId))
  revalidarAforos()
  return {
    ok: true,
    resumen: entrada.id
      ? `Guardé los datos de ${entrada.nombre.trim()}.`
      : `${entrada.nombre.trim()} ya aparece en el aforo.`,
  }
}

type ResultadoRetiro = { nombre: string; liberados: number; semanas: string[] }

export async function retirarPersona(
  tiendaId: string,
  id: string,
  fechaRetiro: string,
): Promise<Resultado> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('retirar_colaborador', {
    p_id: id,
    p_fecha_retiro: fechaRetiro,
  })

  if (error) return { ok: false, error: mensajeAmable(error, 'retirarPersona') }

  const r = data as unknown as ResultadoRetiro

  revalidatePath(ruta(tiendaId))
  revalidarAforos()

  // Se dice cuántos turnos se liberaron y de qué semanas: el retiro le vacía
  // días a un aforo que a lo mejor ya estaba publicado y mandado al grupo.
  const partes = [`${r.nombre} queda retirada desde el ${fechaCorta(fechaRetiro)}.`]
  if (r.liberados > 0) {
    partes.push(
      `Liberé ${r.liberados} turno${r.liberados > 1 ? 's' : ''} posterior${
        r.liberados > 1 ? 'es' : ''
      } en ${r.semanas.length} semana${r.semanas.length > 1 ? 's' : ''}: ` +
        `${r.semanas.map(fechaCorta).join(', ')}. Revisá esos días.`,
    )
  }
  return { ok: true, resumen: partes.join(' ') }
}

export async function reincorporarPersona(
  tiendaId: string,
  id: string,
): Promise<Resultado> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('reincorporar_colaborador', { p_id: id })
  if (error) return { ok: false, error: mensajeAmable(error, 'reincorporarPersona') }

  revalidatePath(ruta(tiendaId))
  revalidarAforos()
  return {
    ok: true,
    resumen: 'Vuelve a aparecer en el aforo. Los turnos que el retiro liberó no vuelven solos.',
  }
}

export async function eliminarPersona(
  tiendaId: string,
  id: string,
): Promise<Resultado> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('eliminar_colaborador', { p_id: id })
  if (error) return { ok: false, error: mensajeAmable(error, 'eliminarPersona') }

  revalidatePath(ruta(tiendaId))
  revalidarAforos()
  const r = data as unknown as { nombre: string }
  return { ok: true, resumen: `Borré a ${r.nombre}.` }
}
