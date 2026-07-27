'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearSemana } from './acciones'
import { rangoSemana } from '@/lib/dominio'
import NavegacionSemana from './navegacion-semana'

export default function SinSemana({
  tienda,
  semana,
}: {
  tienda: { id: string; codigo: string; nombre: string }
  semana: string
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function crear() {
    setError(null)
    iniciar(async () => {
      const r = await crearSemana(tienda.id, semana)
      if (!r.ok) setError(r.error)
      else router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6">
      <NavegacionSemana tiendaId={tienda.id} semana={semana} tienda={tienda} />

      <div className="mt-10 grid place-items-center rounded-[var(--radio)] border border-dashed bg-[var(--superficie)] px-6 py-20 text-center">
        <div className="max-w-sm">
          <h2 className="text-sm font-semibold">Esta semana todavía no existe</h2>
          <p className="mt-2 text-sm text-[var(--texto-suave)]">
            La semana del {rangoSemana(semana)} no está creada para{' '}
            {tienda.codigo}. Al crearla queda en borrador y podés armar el aforo.
          </p>

          {error && (
            <p className="mt-4 rounded-md bg-[var(--error-fondo)] px-3 py-2 text-xs text-[var(--error)]">
              {error}
            </p>
          )}

          <button
            onClick={crear}
            disabled={pendiente}
            className="mt-6 rounded-md bg-[var(--texto)] px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
          >
            {pendiente ? 'Creando…' : 'Crear la semana'}
          </button>
        </div>
      </div>
    </div>
  )
}
