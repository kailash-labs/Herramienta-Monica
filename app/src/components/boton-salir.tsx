'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function BotonSalir() {
  const router = useRouter()

  async function salir() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/ingresar')
    router.refresh()
  }

  return (
    <button
      onClick={salir}
      className="rounded-md border px-2.5 py-1 text-xs text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
    >
      Salir
    </button>
  )
}
