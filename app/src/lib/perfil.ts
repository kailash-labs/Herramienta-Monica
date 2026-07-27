import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type Perfil = {
  id: string
  nombre: string
  rol: Database['public']['Enums']['app_rol']
}

/**
 * Perfil del usuario de la sesion.
 *
 * Ojo: hay que filtrar por id explicitamente. Un coordinador ve todos los
 * perfiles por RLS, asi que un select sin filtro devuelve varias filas y
 * .single() falla justo para quien mas permisos tiene.
 */
export async function perfilActual(): Promise<Perfil | null> {
  const supabase = await createClient()

  const { data: claims } = await supabase.auth.getClaims()
  const uid = claims?.claims?.sub
  if (!uid) return null

  const { data } = await supabase
    .from('perfiles')
    .select('id, nombre, rol')
    .eq('id', uid)
    .maybeSingle()

  return data ?? null
}

export async function esCoordinador(): Promise<boolean> {
  const p = await perfilActual()
  return p?.rol === 'coordinador'
}
