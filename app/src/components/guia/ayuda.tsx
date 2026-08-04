'use client'

import { useEffect, useState } from 'react'
import Recorrido from './recorrido'
import LectorManual from './lector-manual'
import { PASOS, type Seccion } from './pasos'

const YA_LO_VIO = 'guia:vista'

/**
 * El signo de pregunta de la barra de arriba.
 *
 * La primera vez que alguien entra, el recorrido arranca solo: una herramienta
 * que hay que estudiar antes de usar no se usa, y quien la abre en medio de un
 * turno no va a buscar la ayuda por su cuenta. Después de esa vez no vuelve a
 * aparecer salvo que la pidan.
 */
export default function Ayuda({
  seccion,
  esCoordinador,
}: {
  seccion?: Seccion
  esCoordinador: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const [recorriendo, setRecorriendo] = useState(false)
  const [leyendo, setLeyendo] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(YA_LO_VIO)) {
        localStorage.setItem(YA_LO_VIO, '1')
        // Un instante para que la pantalla termine de dibujarse: el recorrido
        // mide elementos reales y necesita que ya estén donde van.
        const t = setTimeout(() => setRecorriendo(true), 700)
        return () => clearTimeout(t)
      }
    } catch {
      // Sin localStorage (modo incógnito): simplemente no arranca solo.
    }
  }, [])

  const pasos = PASOS[seccion ?? 'cronograma']

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setAbierto((x) => !x)}
          aria-expanded={abierto}
          aria-haspopup="menu"
          title="Ayuda"
          className="grid h-7 w-7 place-items-center rounded-full border text-sm font-semibold text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
        >
          ?<span className="sr-only">Ayuda</span>
        </button>

        {abierto && (
          <>
            <button
              aria-label="Cerrar la ayuda"
              onClick={() => setAbierto(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              role="menu"
              className="absolute right-0 z-50 mt-1.5 w-64 overflow-hidden rounded-[var(--radio)] border bg-[var(--superficie)] py-1 shadow-[var(--sombra)]"
            >
              <button
                role="menuitem"
                onClick={() => {
                  setAbierto(false)
                  setRecorriendo(true)
                }}
                className="block w-full px-3 py-2.5 text-left transition hover:bg-[var(--superficie-alt)]"
              >
                <span className="block text-sm">Recorrido guiado</span>
                <span className="mt-0.5 block text-[11px] text-[var(--texto-tenue)]">
                  Señala cada parte de esta pantalla
                </span>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  setAbierto(false)
                  setLeyendo(true)
                }}
                className="block w-full px-3 py-2.5 text-left transition hover:bg-[var(--superficie-alt)]"
              >
                <span className="block text-sm">Manual de uso</span>
                <span className="mt-0.5 block text-[11px] text-[var(--texto-tenue)]">
                  El paso a paso de cada tarea
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {recorriendo && <Recorrido pasos={pasos} onCerrar={() => setRecorriendo(false)} />}
      {leyendo && (
        <LectorManual esCoordinador={esCoordinador} onCerrar={() => setLeyendo(false)} />
      )}
    </>
  )
}
