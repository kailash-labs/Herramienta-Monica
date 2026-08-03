'use client'

import { useEffect, useState } from 'react'
import { MANUAL, type Bloque } from './manual'

/**
 * El manual escrito, con su índice al costado.
 *
 * A un administrador de tienda no se le muestran las secciones de coordinación:
 * no puede entrar a esas pantallas, así que leerlas solo le agrega ruido a un
 * documento que ya es largo.
 */
export default function LectorManual({
  esCoordinador,
  onCerrar,
}: {
  esCoordinador: boolean
  onCerrar: () => void
}) {
  const secciones = MANUAL.filter((s) => esCoordinador || !s.soloCoordinacion)
  const [actual, setActual] = useState(secciones[0].id)
  const seccion = secciones.find((s) => s.id === actual) ?? secciones[0]

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar])

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/30 p-3 sm:p-6"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manual de uso"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--radio)] border bg-[var(--superficie)] shadow-xl"
      >
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Manual de uso</h2>
            <p className="text-[11px] text-[var(--texto-suave)]">
              El paso a paso de cada tarea
            </p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar el manual"
            className="ml-auto rounded-md px-2 py-1 text-sm text-[var(--texto-tenue)] transition hover:bg-[var(--superficie-alt)]"
          >
            ✕
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* En pantalla angosta el índice va arriba, en una fila que se desliza */}
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 sm:w-56 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
            {secciones.map((s) => (
              <button
                key={s.id}
                onClick={() => setActual(s.id)}
                className={`shrink-0 rounded-md px-2.5 py-2 text-left text-xs transition sm:shrink ${
                  s.id === actual
                    ? 'bg-[var(--superficie-alt)] font-medium text-[var(--texto)]'
                    : 'text-[var(--texto-suave)] hover:bg-[var(--superficie-alt)]'
                }`}
              >
                {s.titulo}
              </button>
            ))}
          </nav>

          <article className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <h3 className="text-base font-semibold tracking-tight">{seccion.titulo}</h3>
            <div className="mt-4 space-y-4">
              {seccion.bloques.map((b, i) => (
                <RenderBloque key={i} bloque={b} />
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}

function RenderBloque({ bloque }: { bloque: Bloque }) {
  if (bloque.tipo === 'parrafo') {
    return (
      <p className="text-[13px] leading-relaxed text-[var(--texto-suave)]">
        {bloque.texto}
      </p>
    )
  }

  if (bloque.tipo === 'pasos') {
    return (
      <ol className="space-y-2">
        {bloque.items.map((t, i) => (
          <li key={i} className="flex gap-3">
            <span className="cifra mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--superficie-alt)] text-[11px] font-semibold text-[var(--texto-suave)]">
              {i + 1}
            </span>
            <span className="text-[13px] leading-relaxed">{t}</span>
          </li>
        ))}
      </ol>
    )
  }

  if (bloque.tipo === 'lista') {
    return (
      <ul className="space-y-1.5">
        {bloque.items.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-[var(--texto-suave)]">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--borde-fuerte)]" />
            {t}
          </li>
        ))}
      </ul>
    )
  }

  if (bloque.tipo === 'aviso') {
    return (
      <p className="rounded-md border-l-2 border-[var(--acento)] bg-[var(--alerta-fondo)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--texto)]">
        {bloque.texto}
      </p>
    )
  }

  return (
    <div className="scroll-x overflow-hidden rounded-md border">
      <table className="w-full min-w-[420px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b bg-[var(--superficie-alt)]">
            {bloque.encabezados.map((h) => (
              <th key={h} className="px-3 py-2 text-[11px] font-semibold text-[var(--texto-suave)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bloque.filas.map(([a, b], i) => (
            <tr key={i} className="border-b last:border-0 align-top">
              <td className="px-3 py-2 font-medium">{a}</td>
              <td className="px-3 py-2 text-[var(--texto-suave)]">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
