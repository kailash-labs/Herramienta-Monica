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

/**
 * La URL no es secreta, así que cuando está mal se muestra tal cual: sin ver el
 * valor no se distingue «pegué el identificador solo» de «quedó un salto de
 * línea al final», que se arreglan distinto. La clave sí se describe por su
 * forma y nunca se imprime.
 */
function describirClave(clave: string): string {
  return `${clave.length} caracteres que empiezan con «${clave.slice(0, 12)}…»`
}

/** Devuelve [url, clave] o falla diciendo qué está mal y qué llegó. */
export function credencialesSupabase(): [string, string] {
  // Recortadas: pegar en un campo web arrastra espacios y saltos de línea muy
  // seguido, y un valor con un '\n' al final se ve idéntico al correcto.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

  const faltan = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !clave && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean)

  if (faltan.length > 0 || !url || !clave) {
    throw new Error(
      `Falta la configuración de Supabase: ${faltan.join(' y ')}. ${COMO_SE_ARREGLA}`,
    )
  }

  let host: string
  try {
    const parsed = new URL(url)
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('protocolo')
    host = parsed.host
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL no es una URL válida. Llegó «${url}», y tiene ` +
        `que ser la URL del proyecto entera, con https:// adelante y ` +
        `.supabase.co al final. Está en Supabase → Project Settings → Data API.`,
    )
  }

  if (host.endsWith('supabase.com')) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL apunta al panel de Supabase y no al proyecto. ` +
        `Llegó «${url}». La que va es del tipo https://<id>.supabase.co, sin ` +
        `«/dashboard/» en el medio.`,
    )
  }

  if (/^https?:/i.test(clave)) {
    throw new Error(
      'Las dos variables de Supabase quedaron cruzadas: la clave contiene una ' +
        'URL. Revisá que NEXT_PUBLIC_SUPABASE_URL tenga la URL y ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY la clave publishable.',
    )
  }

  // Esta clave viaja al navegador de cualquiera que abra la app. La secret
  // saltea RLS entera, así que si se coló hay que frenar antes de exponerla.
  if (clave.startsWith('sb_secret_') || clave.includes('service_role')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tiene la clave SECRETA de Supabase ' +
        `(${describirClave(clave)}). Esa clave saltea la seguridad por filas y ` +
        'esta variable se publica en el navegador. Cambiala por la publishable ' +
        'y rotá la secret desde el dashboard, porque quedó en el historial del ' +
        'proyecto.',
    )
  }

  return [url, clave]
}
