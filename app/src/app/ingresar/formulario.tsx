'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function FormularioIngreso() {
  const router = useRouter()
  const params = useSearchParams()
  const destino = params.get('desde') || '/'

  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: clave,
    })

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : error.message,
      )
      setCargando(false)
      return
    }

    router.push(destino)
    router.refresh()
  }

  return (
    <form
      onSubmit={enviar}
      className="rounded-[var(--radio)] border bg-[var(--superficie)] p-6 shadow-[var(--sombra)]"
    >
      <label className="block text-xs font-medium text-[var(--texto-suave)]">
        Correo
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--texto)] outline-none focus:border-[var(--acento)] focus:ring-2 focus:ring-[var(--acento)]/20"
        />
      </label>

      <label className="mt-4 block text-xs font-medium text-[var(--texto-suave)]">
        Contraseña
        <input
          type="password"
          required
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm text-[var(--texto)] outline-none focus:border-[var(--acento)] focus:ring-2 focus:ring-[var(--acento)]/20"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-[var(--error-fondo)] px-3 py-2 text-xs text-[var(--error)]"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={cargando}
        className="mt-6 w-full rounded-md bg-[var(--texto)] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
      >
        {cargando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
