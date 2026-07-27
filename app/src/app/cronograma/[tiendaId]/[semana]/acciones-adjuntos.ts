'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type EstadoAdjunto = Database['public']['Enums']['estado_adjunto']
type OrigenAdjunto = Database['public']['Enums']['origen_adjunto']
type Resultado = { ok: true } | { ok: false; error: string }

function ruta(tiendaId: string, semana: string) {
  return `/cronograma/${tiendaId}/${semana}`
}

export async function registrarAdjunto(entrada: {
  tiendaId: string
  semana: string
  semanaId: string
  storagePath: string
  archivoNombre: string
  mimeType: string
  tamanoBytes: number
  origen: OrigenAdjunto
}): Promise<Resultado> {
  const supabase = await createClient()

  const { error } = await supabase.from('aforo_adjuntos').insert({
    semana_id: entrada.semanaId,
    tienda_id: entrada.tiendaId,
    storage_path: entrada.storagePath,
    archivo_nombre: entrada.archivoNombre,
    mime_type: entrada.mimeType,
    tamano_bytes: entrada.tamanoBytes,
    origen: entrada.origen,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath(ruta(entrada.tiendaId, entrada.semana))
  return { ok: true }
}

export async function cambiarEstadoAdjunto(
  tiendaId: string,
  semana: string,
  adjuntoId: string,
  estado: EstadoAdjunto,
): Promise<Resultado> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('aforo_adjuntos')
    .update({ estado })
    .eq('id', adjuntoId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(ruta(tiendaId, semana))
  return { ok: true }
}

export async function borrarAdjunto(
  tiendaId: string,
  semana: string,
  adjuntoId: string,
  storagePath: string,
): Promise<Resultado> {
  const supabase = await createClient()

  // Primero el archivo: si falla, la fila sigue apuntando a algo que existe
  const { error: errStorage } = await supabase.storage
    .from('aforos')
    .remove([storagePath])

  if (errStorage) return { ok: false, error: errStorage.message }

  const { error } = await supabase
    .from('aforo_adjuntos')
    .delete()
    .eq('id', adjuntoId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(ruta(tiendaId, semana))
  return { ok: true }
}
