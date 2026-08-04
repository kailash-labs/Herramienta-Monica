'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Paso } from './pasos'

/**
 * Recorrido guiado: oscurece la pantalla, recorta el elemento del que se está
 * hablando y pone el texto al lado.
 *
 * Señala los elementos **reales** de la página, no un dibujo de la página. Eso
 * obliga a dos cosas:
 *
 * 1. Un paso cuyo elemento no está en pantalla se salta en silencio. Las
 *    pantallas cambian según el rol y según el estado de la semana, y un
 *    recorrido que se rompe cuando falta un botón es peor que no tenerlo.
 * 2. La lista y la grilla del aforo comparten nombre de anclaje porque son la
 *    misma cosa a distinto ancho: se elige la que de verdad se está viendo.
 */

const MARGEN = 8 // aire entre el recorte y el elemento
const ANCHO_GLOBO = 340

type Recuadro = { top: number; left: number; width: number; height: number }

/** Está en el DOM y ocupa lugar: la vista angosta y la ancha conviven ocultas */
function seVe(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

function buscar(clave: string): HTMLElement | null {
  const todos = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-guia="${clave}"]`),
  )
  return todos.find(seVe) ?? null
}

export default function Recorrido({
  pasos,
  onCerrar,
}: {
  pasos: Paso[]
  onCerrar: () => void
}) {
  // Solo los pasos que existen de verdad en esta pantalla. Se resuelve una vez,
  // al abrir el recorrido: el componente se monta cuando el usuario lo pide, con
  // la página ya dibujada, así que el DOM ya está donde va.
  const [disponibles] = useState<Paso[]>(() =>
    pasos.filter((p) => p.centrado || buscar(p.clave)),
  )
  const [i, setI] = useState(0)
  const [recuadro, setRecuadro] = useState<Recuadro | null>(null)
  // El alto del globo se mide, no se estima: los pasos que traen el porqué son
  // bastante más altos, y con un número fijo el globo termina tapando justo el
  // elemento que está señalando.
  const globoRef = useRef<HTMLDivElement>(null)
  const [altoGlobo, setAltoGlobo] = useState(240)

  const paso = disponibles[i]

  const medir = useCallback(() => {
    if (!paso || paso.centrado) return setRecuadro(null)
    const el = buscar(paso.clave)
    if (!el) return setRecuadro(null)
    const r = el.getBoundingClientRect()
    // Solo se escribe si de verdad se movió. Esto se llama en cada cuadro
    // mientras el scroll se acomoda: escribir siempre re-renderizaría 60 veces
    // por segundo y reiniciaría la transición en cada cuadro, con lo que el
    // recorte nunca terminaría de alcanzar al elemento.
    setRecuadro((previo) =>
      previo &&
      Math.abs(previo.top - r.top) < 0.5 &&
      Math.abs(previo.left - r.left) < 0.5 &&
      Math.abs(previo.width - r.width) < 0.5 &&
      Math.abs(previo.height - r.height) < 0.5
        ? previo
        : { top: r.top, left: r.left, width: r.width, height: r.height },
    )
  }, [paso])

  // Traer el elemento a la vista y medirlo. Medir el layout y guardar la medida
  // es el caso para el que existe useLayoutEffect, pero la regla no lo distingue
  // de un estado derivado mal hecho.
  useLayoutEffect(() => {
    // Scroll instantáneo a propósito, no suave. Dos razones: el usuario quiere
    // ver de qué se le está hablando, no mirar una animación; y el scroll suave
    // no avisa cuándo terminó, así que habría que perseguirlo midiendo cuadro a
    // cuadro. Además hay contextos donde 'smooth' directamente no scrollea.
    if (paso && !paso.centrado) {
      buscar(paso.clave)?.scrollIntoView({
        block: 'center',
        behavior: 'instant' as ScrollBehavior,
      })
    }
    // medir() cubre también el caso del paso centrado, que no señala nada.
    // Medir el layout y guardar la medida es el caso para el que existe
    // useLayoutEffect, pero la regla no lo distingue de un estado derivado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    medir()
  }, [paso, medir])

  useLayoutEffect(() => {
    const alto = globoRef.current?.offsetHeight
    if (alto && alto !== altoGlobo) setAltoGlobo(alto)
  }, [paso, altoGlobo])

  useEffect(() => {
    window.addEventListener('scroll', medir, true)
    window.addEventListener('resize', medir)
    return () => {
      window.removeEventListener('scroll', medir, true)
      window.removeEventListener('resize', medir)
    }
  }, [medir])

  const ultimo = i >= disponibles.length - 1
  const avanzar = useCallback(() => {
    if (ultimo) onCerrar()
    else setI((x) => x + 1)
  }, [ultimo, onCerrar])

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowRight' || e.key === 'Enter') avanzar()
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [avanzar, onCerrar])

  if (!paso) return null

  const globo = ubicarGlobo(recuadro, altoGlobo)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recorrido guiado"
      className="fixed inset-0 z-[100]"
    >
      {/* Atrapa los clics para que no lleguen a la página que está explicando */}
      <button
        aria-label="Cerrar el recorrido"
        onClick={onCerrar}
        className="absolute inset-0 h-full w-full cursor-default bg-black/55"
      />

      {/* El recorte: un rectángulo transparente con una sombra enorme alrededor */}
      {recuadro && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg ring-2 ring-[var(--acento)] transition-[top,left,width,height] duration-150"
          style={{
            top: recuadro.top - MARGEN,
            left: recuadro.left - MARGEN,
            width: recuadro.width + MARGEN * 2,
            height: recuadro.height + MARGEN * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          }}
        />
      )}

      <div
        ref={globoRef}
        className="absolute w-[min(340px,calc(100vw-24px))] rounded-[var(--radio)] border bg-[var(--superficie)] p-4 shadow-xl"
        style={globo}
      >
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--acento-oscuro)]">
          {paso.zona}
        </p>
        <h2 className="mt-1 text-sm font-semibold">{paso.titulo}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--texto-suave)]">
          {paso.texto}
        </p>

        {paso.porque && (
          <p className="mt-2 border-l-2 border-[var(--borde-fuerte)] pl-2.5 text-[12px] leading-relaxed text-[var(--texto-tenue)]">
            {paso.porque}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <span className="cifra text-[11px] text-[var(--texto-tenue)]">
            {i + 1} de {disponibles.length}
          </span>

          <div className="ml-auto flex gap-1.5">
            {i > 0 && (
              <button
                onClick={() => setI((x) => x - 1)}
                className="rounded-md border px-2.5 py-1.5 text-xs text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
              >
                Atrás
              </button>
            )}
            <button
              onClick={avanzar}
              autoFocus
              className="rounded-md bg-[var(--texto)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-black"
            >
              {ultimo ? 'Listo' : 'Siguiente'}
            </button>
          </div>
        </div>

        <button
          onClick={onCerrar}
          className="mt-2 text-[11px] text-[var(--texto-tenue)] underline underline-offset-2 transition hover:text-[var(--texto-suave)]"
        >
          Cerrar el recorrido
        </button>
      </div>
    </div>
  )
}

/**
 * Debajo del elemento si entra, arriba si no, y centrado en la pantalla cuando
 * el paso no señala nada. Siempre pegado al viewport: un globo cortado por el
 * borde no se puede leer.
 */
function ubicarGlobo(r: Recuadro | null, alto: number): React.CSSProperties {
  if (typeof window === 'undefined' || !r) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }

  const abajo = r.top + r.height + MARGEN + 12
  const cabeAbajo = abajo + alto < window.innerHeight

  const propuesto = cabeAbajo ? abajo : r.top - MARGEN - alto - 12
  // Encajado en la pantalla por los dos lados: si el elemento es más alto que
  // el viewport, ni arriba ni abajo entran y el globo quedaría fuera de vista.
  const top = Math.min(
    Math.max(12, propuesto),
    Math.max(12, window.innerHeight - alto - 12),
  )
  const left = Math.min(
    Math.max(12, r.left + r.width / 2 - ANCHO_GLOBO / 2),
    Math.max(12, window.innerWidth - ANCHO_GLOBO - 12),
  )

  return { top, left }
}
