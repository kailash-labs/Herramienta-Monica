'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SinConfigurar, extraerAforo, type AforoLeido } from '@/lib/importacion/extraer'
import { duracionMinutos } from '@/lib/dominio'
import { mensajeAmable } from '@/lib/mensajes'

export type FilaPropuesta = {
  clave: string
  colaboradorLeido: string
  cargoLeido: string | null
  colaboradorId: string | null
  dia: number
  fecha: string
  bloques: { inicio: string; fin: string }[]
  minutos: number
  confianza: 'alta' | 'media' | 'baja'
  problema: string | null
}

export type Propuesta = {
  turnos: FilaPropuesta[]
  advertencias: string[]
  sinReconocer: string[]
  resumen: { total: number; listos: number; dudosos: number; sinColaborador: number }
}

type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string }

const MIMES_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Normaliza para comparar nombres: sin tildes, sin puntuación, minúsculas */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function horaValida(h: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(h)
}

/**
 * Lee el archivo y devuelve una propuesta para revisar. No escribe turnos:
 * eso lo hace aplicarImportacion, después de que una persona confirme.
 */
export async function leerArchivo(entrada: {
  tiendaId: string
  semana: string
  nombreArchivo: string
  mime: string
  base64: string
}): Promise<Resultado<Propuesta>> {
  const supabase = await createClient()

  const { data: colaboradores } = await supabase
    .from('colaboradores')
    .select('id, nombre_completo, codigo_empleado')
    .eq('tienda_id', entrada.tiendaId)
    .eq('activo', true)

  if (!colaboradores?.length) {
    return { ok: false, error: 'La tienda no tiene colaboradores cargados todavía.' }
  }

  let leido: AforoLeido
  try {
    const bytes = Buffer.from(entrada.base64, 'base64')

    if (MIMES_IMAGEN.includes(entrada.mime)) {
      leido = await extraerAforo({ tipo: 'imagen', mime: entrada.mime, base64: entrada.base64 })
    } else if (entrada.mime === 'application/pdf') {
      leido = await extraerAforo({ tipo: 'pdf', base64: entrada.base64 })
    } else if (
      entrada.mime.includes('spreadsheet') ||
      entrada.nombreArchivo.toLowerCase().endsWith('.xlsx')
    ) {
      leido = await extraerAforo({ tipo: 'excel', datos: new Uint8Array(bytes) })
    } else {
      return {
        ok: false,
        error: 'Formato no soportado. Subí una foto (JPG, PNG), un PDF o un Excel (.xlsx).',
      }
    }
  } catch (e) {
    if (e instanceof SinConfigurar) {
      return {
        ok: false,
        error:
          'La lectura automática de archivos todavía no está disponible. Podés cargar los turnos a mano.',
      }
    }
    console.error('[importar] no se pudo leer el archivo', e)
    return {
      ok: false,
      error:
        'No pudimos leer ese archivo. Probá con una foto más nítida, o cargá los turnos a mano.',
    }
  }

  // Cruce contra los colaboradores reales: por código primero, luego por nombre
  const porCodigo = new Map<string, string>()
  const porNombre = new Map<string, string>()
  for (const c of colaboradores) {
    if (c.codigo_empleado) porCodigo.set(normalizar(c.codigo_empleado), c.id)
    porNombre.set(normalizar(c.nombre_completo), c.id)
  }

  const sinReconocer = new Set<string>()
  const turnos: FilaPropuesta[] = []

  for (const [i, t] of leido.turnos.entries()) {
    const clave = normalizar(t.colaborador)
    const colaboradorId = porCodigo.get(clave) ?? porNombre.get(clave) ?? null
    if (!colaboradorId) sinReconocer.add(t.colaborador)

    let problema: string | null = null

    if (t.bloques.length === 0) continue
    if (t.bloques.length > 2) problema = 'Se leyeron más de dos bloques en un día.'

    for (const b of t.bloques) {
      if (!horaValida(b.inicio) || !horaValida(b.fin)) {
        problema = `Hora ilegible: ${b.inicio} – ${b.fin}.`
      } else if (b.inicio === b.fin) {
        problema = 'El turno empieza y termina a la misma hora.'
      }
    }

    const minutos = problema
      ? 0
      : t.bloques.reduce((s, b) => s + duracionMinutos(b.inicio, b.fin), 0)

    if (!problema && minutos > 16 * 60) {
      problema = 'El turno dura más de 16 horas; probablemente se leyó mal.'
    }

    const fecha = new Date(`${entrada.semana}T00:00:00Z`)
    fecha.setUTCDate(fecha.getUTCDate() + (t.dia - 1))

    turnos.push({
      clave: `${i}`,
      colaboradorLeido: t.colaborador,
      cargoLeido: t.cargo,
      colaboradorId,
      dia: t.dia,
      fecha: fecha.toISOString().slice(0, 10),
      bloques: t.bloques,
      minutos,
      confianza: t.confianza,
      problema,
    })
  }

  const listos = turnos.filter(
    (t) => t.colaboradorId && !t.problema && t.confianza === 'alta',
  ).length

  return {
    ok: true,
    datos: {
      turnos,
      advertencias: leido.advertencias,
      sinReconocer: [...sinReconocer],
      resumen: {
        total: turnos.length,
        listos,
        dudosos: turnos.filter((t) => t.problema || t.confianza !== 'alta').length,
        sinColaborador: turnos.filter((t) => !t.colaboradorId).length,
      },
    },
  }
}

/**
 * Escribe los turnos que la persona confirmó. Cada uno queda en la bitácora con
 * motivo 'correccion', igual que una edición hecha a mano.
 */
export async function aplicarImportacion(entrada: {
  tiendaId: string
  semana: string
  semanaId: string
  turnos: FilaPropuesta[]
}): Promise<Resultado<{ aplicados: number }>> {
  const supabase = await createClient()

  const validos = entrada.turnos.filter((t) => t.colaboradorId && !t.problema)
  if (validos.length === 0) {
    return { ok: false, error: 'No hay turnos válidos para aplicar.' }
  }

  let aplicados = 0
  const fallidos: string[] = []

  for (const t of validos) {
    const { error } = await supabase.rpc('guardar_turno_dia', {
      p_semana_id: entrada.semanaId,
      p_colaborador_id: t.colaboradorId!,
      p_fecha: t.fecha,
      p_tipo: t.bloques.length > 1 ? 'partido' : 'completo',
      p_bloques: t.bloques,
      p_motivo: 'correccion',
    })

    if (error) fallidos.push(`${t.colaboradorLeido} (${t.fecha}): ${mensajeAmable(error, 'importar/fila')}`)
    else aplicados++
  }

  await supabase.rpc('validar_semana', { p_semana_id: entrada.semanaId })
  revalidatePath(`/cronograma/${entrada.tiendaId}/${entrada.semana}`)

  if (fallidos.length) {
    return {
      ok: false,
      error: `Se aplicaron ${aplicados} de ${validos.length}. Fallaron: ${fallidos.slice(0, 3).join('; ')}${fallidos.length > 3 ? '…' : ''}`,
    }
  }

  return { ok: true, datos: { aplicados } }
}
