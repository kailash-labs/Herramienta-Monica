'use client'

import { useState } from 'react'

/**
 * Dias perdidos por causa de incapacidad.
 *
 * Barras horizontales porque los nombres de causa son largos. Un solo tono para
 * todas: la magnitud ya la lleva el largo de la barra, y pintar cada categoria
 * de un color distinto —o mas oscuro cuanto mayor— seria ruido, no informacion.
 */
export default function BarrasCausas({
  datos,
}: {
  datos: { causa: string; dias: number; casos: number }[]
}) {
  const [activa, setActiva] = useState<string | null>(null)

  if (datos.length === 0) {
    return (
      <Marco titulo="Causas de incapacidad" subtitulo="Días perdidos en el año">
        <p className="px-4 py-10 text-center text-sm text-[var(--texto-suave)]">
          No hay incapacidades registradas.
        </p>
      </Marco>
    )
  }

  const max = Math.max(...datos.map((d) => d.dias), 1)
  const ALTO_FILA = 30
  const GROSOR = 18 // por debajo del tope de 24px

  // Geometria medida, no tanteada: la causa mas larga ("Maternidad o paternidad")
  // ocupa ~115px a 10px de tipografia, asi que el canal de etiquetas es 145 y la
  // barra mas larga termina en 355, dejando lugar al valor sin salirse del lienzo.
  const CANAL = 145
  const LARGO_MAX = 210

  return (
    <Marco titulo="Causas de incapacidad" subtitulo="Días perdidos en el año">
      <div className="px-4 pb-4 pt-2">
        <div className="scroll-x">
          <svg
            width="100%"
            height={datos.length * ALTO_FILA + 8}
            viewBox={`0 0 400 ${datos.length * ALTO_FILA + 8}`}
            preserveAspectRatio="xMinYMin meet"
            role="img"
            aria-label={`Días perdidos por causa: ${datos
              .map((d) => `${d.causa}, ${d.dias} días`)
              .join('; ')}`}
          >
            {datos.map((d, i) => {
              const y = i * ALTO_FILA + 4
              const ancho = Math.max((d.dias / max) * LARGO_MAX, 2)
              const resaltada = activa === d.causa

              return (
                <g
                  key={d.causa}
                  onMouseEnter={() => setActiva(d.causa)}
                  onMouseLeave={() => setActiva(null)}
                >
                  {/* Area de hover mas grande que la barra */}
                  <rect
                    x="0"
                    y={y - 2}
                    width="400"
                    height={ALTO_FILA}
                    fill="transparent"
                  />

                  <text
                    x="0"
                    y={y + GROSOR / 2 + 4}
                    className="fill-[var(--texto-suave)]"
                    style={{ fontSize: 10 }}
                  >
                    {d.causa}
                  </text>

                  <rect
                    x={CANAL}
                    y={y}
                    width={ancho}
                    height={GROSOR}
                    rx="4"
                    fill="#2563a8"
                    opacity={resaltada || !activa ? 1 : 0.45}
                  />
                  {/* El extremo pegado al eje va cuadrado, no redondeado */}
                  <rect x={CANAL} y={y} width="4" height={GROSOR} fill="#2563a8"
                        opacity={resaltada || !activa ? 1 : 0.45} />

                  <text
                    x={CANAL + ancho + 6}
                    y={y + GROSOR / 2 + 4}
                    className="fill-[var(--texto)]"
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {d.dias}
                  </text>

                  <title>
                    {d.causa}: {d.dias} día{d.dias === 1 ? '' : 's'} en {d.casos} caso
                    {d.casos === 1 ? '' : 's'}
                  </title>
                </g>
              )
            })}
          </svg>
        </div>

        {activa && (
          <p className="mt-1 text-[11px] text-[var(--texto-suave)]">
            {(() => {
              const d = datos.find((x) => x.causa === activa)!
              return `${d.causa}: ${d.dias} día${d.dias === 1 ? '' : 's'} perdidos en ${d.casos} caso${d.casos === 1 ? '' : 's'}`
            })()}
          </p>
        )}
      </div>
    </Marco>
  )
}

export function Marco({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string
  subtitulo?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[var(--radio)] border bg-[var(--superficie)] shadow-[var(--sombra)]">
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        {subtitulo && (
          <p className="mt-0.5 text-xs text-[var(--texto-suave)]">{subtitulo}</p>
        )}
      </header>
      {children}
    </section>
  )
}
