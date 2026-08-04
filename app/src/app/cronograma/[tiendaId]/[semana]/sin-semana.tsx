'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { copiarAforoAnterior, crearSemana } from './acciones'
import { fechaCorta, rangoSemana } from '@/lib/dominio'
import { guardarAviso } from './aviso-traspaso'
import NavegacionSemana from './navegacion-semana'

/**
 * La pantalla que ve el admin cuando abre una semana que todavía no existe.
 *
 * La acción principal es copiar la anterior, no empezar en blanco: la mayoría de
 * las semanas se parecen a la previa, así que copiar convierte "cargar 100
 * turnos" en "ajustar 5". Empezar en blanco queda como salida secundaria, para
 * la primera semana de una tienda o para un cambio de fondo en la operación.
 */
export default function SinSemana({
  tienda,
  semana,
  semanaAnterior,
}: {
  tienda: { id: string; codigo: string; nombre: string }
  semana: string
  /** El lunes de la semana anterior, si tiene turnos que valga la pena copiar */
  semanaAnterior: string | null
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function copiar() {
    setError(null)
    iniciar(async () => {
      const r = await copiarAforoAnterior({ tiendaId: tienda.id, semana, semanaId: null })
      if (!r.ok) return setError(r.error)
      // Al refrescar, el servidor devuelve la grilla y esta pantalla desaparece:
      // el resumen viaja para que lo muestre ella.
      if (r.resumen) guardarAviso(r.resumen)
      router.refresh()
    })
  }

  function empezarEnBlanco() {
    setError(null)
    iniciar(async () => {
      const r = await crearSemana(tienda.id, semana)
      if (!r.ok) setError(r.error)
      else router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <NavegacionSemana tiendaId={tienda.id} semana={semana} tienda={tienda} />

      <div className="mt-8 grid place-items-center rounded-[var(--radio)] border border-dashed bg-[var(--superficie)] px-4 py-14 text-center sm:px-6 sm:py-20">
        <div className="max-w-sm">
          <h2 className="text-sm font-semibold">
            El aforo de esta semana todavía no existe
          </h2>
          <p className="mt-2 text-sm text-[var(--texto-suave)]">
            {tienda.codigo} · semana del {rangoSemana(semana)}
          </p>

          {error && (
            <p className="mt-4 rounded-md bg-[var(--error-fondo)] px-3 py-2 text-xs text-[var(--error)]">
              {error}
            </p>
          )}

          {semanaAnterior ? (
            <>
              <button
                data-guia="copiar-anterior"
                onClick={copiar}
                disabled={pendiente}
                className="mt-6 w-full rounded-md bg-[var(--texto)] px-4 py-3 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
              >
                {pendiente ? 'Copiando…' : 'Copiar el aforo de la semana pasada'}
              </button>

              <p className="mt-3 text-xs leading-relaxed text-[var(--texto-tenue)]">
                Se copian los turnos de la semana del {fechaCorta(semanaAnterior)}.
                No se copian las personas que ya no están, ni los días con una
                novedad ya registrada. Después ajustás lo que cambió.
              </p>

              <button
                data-guia="empezar-blanco"
                onClick={empezarEnBlanco}
                disabled={pendiente}
                className="mt-5 text-xs text-[var(--texto-suave)] underline underline-offset-2 transition hover:text-[var(--texto)] disabled:opacity-50"
              >
                Prefiero empezar en blanco
              </button>
            </>
          ) : (
            <>
              <button
                data-guia="empezar-blanco"
                onClick={empezarEnBlanco}
                disabled={pendiente}
                className="mt-6 w-full rounded-md bg-[var(--texto)] px-4 py-3 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
              >
                {pendiente ? 'Creando…' : 'Empezar el aforo de esta semana'}
              </button>

              <p className="mt-3 text-xs text-[var(--texto-tenue)]">
                Es la primera semana de {tienda.codigo}: no hay una anterior para
                copiar. Desde la próxima, alcanza con copiar y ajustar.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
