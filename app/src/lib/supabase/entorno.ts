/**
 * Las dos variables que la app necesita para hablar con Supabase.
 *
 * Existe este archivo por una sola razón: cuando faltan, `createServerClient`
 * falla dentro del proxy —que corre antes que cualquier página— y toda la app
 * responde «Internal Server Error», en todas las rutas, sin decir qué falta.
 * Es el mismo problema que `mensajeAmable` resuelve para los errores de la base:
 * el detalle técnico va al log del servidor, pero tiene que estar escrito para
 * que alguien lo pueda leer y arreglar.
 *
 * Ojo con `process.env.X` escrito literal: Next reemplaza esa expresión por el
 * valor **al compilar**, y solo la reconoce en esa forma exacta. Con
 * `process.env[nombre]` el reemplazo no ocurre y en producción llega undefined,
 * que es justo el error que esto viene a explicar.
 */

const COMO_SE_ARREGLA =
  'Cargalas en las variables de entorno del proyecto (en Vercel: Settings → ' +
  'Environment Variables, para Production y Preview) y volvé a desplegar. ' +
  'Agregarlas no alcanza: Next las incrusta al compilar, así que el deploy que ' +
  'ya está sigue sin verlas hasta que se reconstruya. Los valores salen del ' +
  'dashboard de Supabase, en Project Settings → API Keys; va la clave ' +
  'publishable, nunca la secret.'

/** Devuelve [url, clave] o falla diciendo exactamente cuál de las dos falta. */
export function credencialesSupabase(): [string, string] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (url && clave) return [url, clave]

  const faltan = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !clave && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]
    .filter(Boolean)
    .join(' y ')

  throw new Error(
    `Falta la configuración de Supabase: ${faltan}. ${COMO_SE_ARREGLA}`,
  )
}
