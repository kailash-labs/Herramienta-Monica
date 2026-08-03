'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { mensajeAmable } from '@/lib/mensajes'

type Resultado =
  | { ok: true; resumen: { total: number; cruzadas: number; sinColaborador: number; sinConcepto: number } }
  | { ok: false; error: string }

export type FilaCruda = {
  codigoEmpleado: string
  nombre?: string
  codigoConcepto: string
  cantidad: number
  valor: number
  fila: number
}

/**
 * Recibe las filas ya parseadas del CSV y las cruza contra colaboradores y
 * conceptos. Lo que no cruza queda guardado igual, marcado, para revisarlo a
 * mano: perder una fila en silencio seria peor que mostrarla sin cruzar.
 */
export async function cargarReporte(entrada: {
  anio: number
  mes: number
  tiendaId: string | null
  archivoNombre: string
  filas: FilaCruda[]
}): Promise<Resultado> {
  const supabase = await createClient()

  if (entrada.filas.length === 0) {
    return { ok: false, error: 'El archivo no tiene filas para cargar.' }
  }

  const { data: colaboradores } = await supabase
    .from('colaboradores')
    .select('id, codigo_empleado, tienda_id')

  const { data: conceptos } = await supabase
    .from('conceptos_nomina')
    .select('id, codigo')

  const porEmpleado = new Map(
    (colaboradores ?? [])
      .filter((c) => c.codigo_empleado)
      .map((c) => [c.codigo_empleado!.trim().toUpperCase(), c]),
  )
  const porConcepto = new Map(
    (conceptos ?? []).map((c) => [c.codigo.trim().toUpperCase(), c]),
  )

  const { data: reporte, error: errRep } = await supabase
    .from('reportes_nomina')
    .insert({
      anio: entrada.anio,
      mes: entrada.mes,
      tienda_id: entrada.tiendaId,
      archivo_nombre: entrada.archivoNombre,
      estado: 'procesado',
      filas_totales: entrada.filas.length,
      procesado_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (errRep || !reporte) {
    return { ok: false, error: errRep?.message ?? 'No se pudo crear el reporte.' }
  }

  let cruzadas = 0
  let sinColaborador = 0
  let sinConcepto = 0

  const movimientos = entrada.filas.map((f) => {
    const colab = porEmpleado.get(f.codigoEmpleado.trim().toUpperCase())
    const concepto = porConcepto.get(f.codigoConcepto.trim().toUpperCase())

    let estado: 'ok' | 'sin_colaborador' | 'sin_concepto' = 'ok'
    if (!colab) {
      estado = 'sin_colaborador'
      sinColaborador++
    } else if (!concepto) {
      estado = 'sin_concepto'
      sinConcepto++
    } else {
      cruzadas++
    }

    return {
      reporte_id: reporte.id,
      tienda_id: colab?.tienda_id ?? entrada.tiendaId,
      colaborador_id: colab?.id ?? null,
      concepto_id: concepto?.id ?? null,
      codigo_empleado_origen: f.codigoEmpleado,
      nombre_origen: f.nombre ?? null,
      codigo_concepto_origen: f.codigoConcepto,
      cantidad: f.cantidad,
      valor: f.valor,
      fila_origen: f.fila,
      estado_match: estado,
      raw: f as unknown as Record<string, unknown>,
    }
  })

  // En tandas: un reporte mensual puede traer miles de filas
  const TANDA = 500
  for (let i = 0; i < movimientos.length; i += TANDA) {
    const { error } = await supabase
      .from('movimientos_nomina')
      .insert(movimientos.slice(i, i + TANDA))

    if (error) {
      await supabase
        .from('reportes_nomina')
        .update({ estado: 'error', error_detalle: error.message })
        .eq('id', reporte.id)
      return { ok: false, error: mensajeAmable(error, 'nomina/cargar') }
    }
  }

  await supabase
    .from('reportes_nomina')
    .update({ filas_con_match: cruzadas })
    .eq('id', reporte.id)

  revalidatePath('/nomina')
  revalidatePath('/consolidado')

  return {
    ok: true,
    resumen: { total: entrada.filas.length, cruzadas, sinColaborador, sinConcepto },
  }
}

export async function borrarReporte(reporteId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('reportes_nomina').delete().eq('id', reporteId)
  if (error) return { ok: false, error: mensajeAmable(error, 'nomina') }
  revalidatePath('/nomina')
  revalidatePath('/consolidado')
  return { ok: true }
}
