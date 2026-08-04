import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { credencialesSupabase } from './entorno'

const PUBLICAS = ['/ingresar', '/auth']

export async function actualizarSesion(request: NextRequest) {
  let respuesta = NextResponse.next({ request })

  // Acá arriba de todo a propósito: si falta la configuración, el mensaje que
  // queda en el log del servidor dice qué falta, en vez del «Internal Server
  // Error» sin pistas que da fallar adentro de createServerClient.
  const [url, clave] = credencialesSupabase()

  const supabase = createServerClient(
    url,
    clave,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          respuesta = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getClaims valida la firma del JWT. getSession no sirve para autorizar.
  const { data } = await supabase.auth.getClaims()

  const ruta = request.nextUrl.pathname
  const esPublica = PUBLICAS.some((p) => ruta.startsWith(p))

  if (!data?.claims && !esPublica) {
    const url = request.nextUrl.clone()
    url.pathname = '/ingresar'
    url.searchParams.set('desde', ruta)
    return NextResponse.redirect(url)
  }

  return respuesta
}
