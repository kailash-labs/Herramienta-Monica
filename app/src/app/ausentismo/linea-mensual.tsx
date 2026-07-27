'use client'

import { useState } from 'react'
import { Marco } from './barras-causas'

const ANCHO = 400
const ALTO = 170
const M = { arriba: 12, derecha: 12, abajo: 24, izquierda: 26 }

/**
 * Dias perdidos por mes. Una sola serie: no lleva leyenda, el titulo ya dice
 * que se esta mirando.
 */
export default function LineaMensual({
  datos,
  anio,
}: {
  datos: { mes: number; etiqueta: string; dias: number; casos: number }[]
  anio: number
}) {
  const [activo, setActivo] = useState<number | null>(null)

  const max = Math.max(...datos.map((d) => d.dias), 4)
  const anchoPlot = ANCHO - M.izquierda - M.derecha
  const altoPlot = ALTO - M.arriba - M.abajo

  const x = (i: number) => M.izquierda + (i / 11) * anchoPlot
  const y = (v: number) => M.arriba + altoPlot - (v / max) * altoPlot

  const linea = datos.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.dias)}`).join(' ')

  // Tres marcas de referencia alcanzan; mas grilla es ruido
  const marcas = [0, Math.round(max / 2), max]

  return (
    <Marco titulo="Días perdidos por mes" subtitulo={`Año ${anio}`}>
      <div className="px-4 pb-4 pt-2">
        <svg
          width="100%"
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Días perdidos por mes en ${anio}: ${datos
            .map((d) => `${d.etiqueta} ${d.dias}`)
            .join(', ')}`}
        >
          {/* Grilla: hairline sólida, recesiva */}
          {marcas.map((m) => (
            <g key={m}>
              <line
                x1={M.izquierda}
                y1={y(m)}
                x2={ANCHO - M.derecha}
                y2={y(m)}
                stroke="var(--borde)"
                strokeWidth="1"
              />
              <text
                x={M.izquierda - 6}
                y={y(m) + 3}
                textAnchor="end"
                className="fill-[var(--texto-tenue)]"
                style={{ fontSize: 9 }}
              >
                {m}
              </text>
            </g>
          ))}

          {/* Relleno al 10%: un lavado, no un bloque */}
          <path
            d={`${linea} L ${x(11)} ${y(0)} L ${x(0)} ${y(0)} Z`}
            fill="#2563a8"
            opacity="0.1"
          />

          <path
            d={linea}
            fill="none"
            stroke="#2563a8"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {datos.map((d, i) => (
            <g
              key={d.mes}
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
            >
              {/* Franja de hover ancha: el punto solo seria muy chico */}
              <rect
                x={x(i) - anchoPlot / 24}
                y={M.arriba}
                width={anchoPlot / 12}
                height={altoPlot}
                fill="transparent"
              />

              {d.dias > 0 && (
                <circle
                  cx={x(i)}
                  cy={y(d.dias)}
                  r={activo === i ? 5 : 4}
                  fill="#2563a8"
                  stroke="var(--superficie)"
                  strokeWidth="2"
                />
              )}

              <text
                x={x(i)}
                y={ALTO - 8}
                textAnchor="middle"
                className={
                  activo === i ? 'fill-[var(--texto)]' : 'fill-[var(--texto-tenue)]'
                }
                style={{ fontSize: 9 }}
              >
                {d.etiqueta}
              </text>

              <title>
                {d.etiqueta}: {d.dias} día{d.dias === 1 ? '' : 's'} en {d.casos} caso
                {d.casos === 1 ? '' : 's'}
              </title>
            </g>
          ))}

          {/* Etiqueta directa solo en el pico: no un numero en cada punto */}
          {(() => {
            const iMax = datos.reduce((mi, d, i) => (d.dias > datos[mi].dias ? i : mi), 0)
            if (datos[iMax].dias === 0 || activo !== null) return null
            return (
              <text
                x={x(iMax)}
                y={y(datos[iMax].dias) - 9}
                textAnchor="middle"
                className="fill-[var(--texto)]"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {datos[iMax].dias}
              </text>
            )
          })()}
        </svg>

        <p className="mt-1 min-h-4 text-[11px] text-[var(--texto-suave)]">
          {activo !== null
            ? `${datos[activo].etiqueta}: ${datos[activo].dias} día${datos[activo].dias === 1 ? '' : 's'} en ${datos[activo].casos} caso${datos[activo].casos === 1 ? '' : 's'}`
            : ''}
        </p>
      </div>
    </Marco>
  )
}
