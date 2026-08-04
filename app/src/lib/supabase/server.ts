import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { credencialesSupabase } from './entorno'

// En Next 16 cookies() es asincrono: sin el await la sesion no se lee.
export async function createClient() {
  const cookieStore = await cookies()
  const [url, clave] = credencialesSupabase()

  return createServerClient(
    url,
    clave,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Component: el refresco de cookie lo hace el proxy.
          }
        },
      },
    },
  )
}
