'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CAUSAS_AUSENCIA, TIPOS_AUSENCIA, nombreMes } from '@/lib/dominio'
import type { CausaAusencia, TipoAusencia } from '@/lib/dominio'
import BarrasCausas from './barras-causas'
import LineaMensual from './linea-mensual'

type Ausencia = {
  id: string
  tienda_id: string
  colaborador_id: string
  tipo: TipoAusencia
  causa: CausaAusencia | null
  fecha_inicio: string
  fecha_fin: string
  dias: number | null
}

function etiquetaCausa(c: CausaAusencia | null) {
  return c ? (CAUSAS_AUSENCIA.find((x) => x.valor === c)?.etiqueta ?? c) : 'Sin causa'
}
function etiquetaTipo(t: TipoAusencia) {
  return TIPOS_AUSENCIA.find((x) => x.valor === t)?.etiqueta ?? t
}

export default function Tablero({
  anio,
  tiendaFiltro,
  tiendas,
  ausencias,
}: {
  anio: number
  tiendaFiltro: string
  tiendas: { id: string; codigo: string; nombre: string }[]
  ausencias: Ausencia[]
}) {
  const [verTabla, setVerTabla] = useState(false)

  const totales = useMemo(() => {
    const dias = ausencias.reduce((s, a) => s + (a.dias ?? 0), 0)
    const gente = new Set(ausencias.map((a) => a.colaborador_id)).size
    const incap = ausencias.filter((a) => a.tipo === 'incapacidad')
    return {
      dias,
      casos: ausencias.length,
      gente,
      diasIncapacidad: incap.reduce((s, a) => s + (a.dias ?? 0), 0),
      promedio: ausencias.length ? dias / ausencias.length : 0,
    }
  }, [ausencias])

  // Solo incapacidades: la causa es lo que interesa para seguridad en el trabajo
  const porCausa = useMemo(() => {
    const m = new Map<string, { dias: number; casos: number }>()
    for (const a of ausencias) {
      if (a.tipo !== 'incapacidad') continue
      const k = etiquetaCausa(a.causa)
      const v = m.get(k) ?? { dias: 0, casos: 0 }
      v.dias += a.dias ?? 0
      v.casos += 1
      m.set(k, v)
    }
    return [...m.entries()]
      .map(([causa, v]) => ({ causa, ...v }))
      .sort((a, b) => b.dias - a.dias)
  }, [ausencias])

  const porMes = useMemo(() => {
    const arr = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      etiqueta: nombreMes(i + 1).slice(0, 3),
      dias: 0,
      casos: 0,
    }))
    for (const a of ausencias) {
      const m = Number(a.fecha_inicio.slice(5, 7)) - 1
      if (m >= 0 && m < 12) {
        arr[m].dias += a.dias ?? 0
        arr[m].casos += 1
      }
    }
    return arr
  }, [ausencias])

  const porTipo = useMemo(() => {
    const m = new Map<TipoAusencia, { dias: number; casos: number }>()
    for (const a of ausencias) {
      const v = m.get(a.tipo) ?? { dias: 0, casos: 0 }
      v.dias += a.dias ?? 0
      v.casos += 1
      m.set(a.tipo, v)
    }
    return [...m.entries()]
      .map(([tipo, v]) => ({ tipo, ...v }))
      .sort((a, b) => b.dias - a.dias)
  }, [ausencias])

  const query = (a: number, t: string) =>
    `/ausentismo?anio=${a}${t ? `&tienda=${t}` : ''}`

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <header>
        <h1 className="text-base font-semibold tracking-tight">Ausentismo</h1>
        <p className="mt-0.5 text-sm text-[var(--texto-suave)]">
          Lo que se acumula semana a semana. Con el tiempo, la base para decidir
          sobre seguridad en el trabajo.
        </p>
      </header>

      {/* Filtros, en una sola fila arriba de los gráficos */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Link
            href={query(anio - 1, tiendaFiltro)}
            className="rounded-md border bg-[var(--superficie)] px-2.5 py-1.5 text-sm text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
          >
            ← {anio - 1}
          </Link>
          <span className="cifra rounded-md bg-[var(--superficie-alt)] px-3 py-1.5 text-sm font-semibold">
            {anio}
          </span>
          <Link
            href={query(anio + 1, tiendaFiltro)}
            className="rounded-md border bg-[var(--superficie)] px-2.5 py-1.5 text-sm text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
          >
            {anio + 1} →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Link
            href={query(anio, '')}
            className={`rounded-md border px-2.5 py-1.5 text-sm transition ${
              !tiendaFiltro
                ? 'border-[var(--texto)] bg-[var(--texto)] text-white'
                : 'bg-[var(--superficie)] text-[var(--texto-suave)] hover:bg-[var(--superficie-alt)]'
            }`}
          >
            Todas
          </Link>
          {tiendas.map((t) => (
            <Link
              key={t.id}
              href={query(anio, t.id)}
              className={`rounded-md border px-2.5 py-1.5 text-sm transition ${
                tiendaFiltro === t.id
                  ? 'border-[var(--texto)] bg-[var(--texto)] text-white'
                  : 'bg-[var(--superficie)] text-[var(--texto-suave)] hover:bg-[var(--superficie-alt)]'
              }`}
            >
              {t.codigo}
            </Link>
          ))}
        </div>

        <button
          onClick={() => setVerTabla((v) => !v)}
          className="ml-auto rounded-md border bg-[var(--superficie)] px-2.5 py-1.5 text-sm text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
        >
          {verTabla ? 'Ver gráficos' : 'Ver tabla'}
        </button>
      </div>

      {ausencias.length === 0 ? (
        <div className="mt-5 rounded-[var(--radio)] border border-dashed bg-[var(--superficie)] px-6 py-16 text-center">
          <p className="text-sm font-medium">Sin ausencias registradas en {anio}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--texto-suave)]">
            Cada incapacidad que se registre en el cronograma va a aparecer acá.
            El valor de este tablero se construye con el tiempo.
          </p>
        </div>
      ) : (
        <>
          {/* Cifra principal y contexto */}
          <div className="mt-5 flex flex-wrap items-stretch gap-3">
            <div className="rounded-[var(--radio)] border bg-[var(--superficie)] px-5 py-4">
              <div className="text-[11px] text-[var(--texto-suave)]">
                Días perdidos en {anio}
              </div>
              <div className="mt-1 text-5xl font-semibold leading-none tracking-tight">
                {totales.dias}
              </div>
            </div>
            <Tile etiqueta="Casos" valor={String(totales.casos)} />
            <Tile etiqueta="Colaboradores afectados" valor={String(totales.gente)} />
            <Tile
              etiqueta="Promedio por caso"
              valor={totales.promedio.toFixed(1)}
              sufijo="días"
            />
            <Tile
              etiqueta="Días por incapacidad"
              valor={String(totales.diasIncapacidad)}
            />
          </div>

          {verTabla ? (
            <TablaDetalle porCausa={porCausa} porTipo={porTipo} porMes={porMes} />
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <BarrasCausas datos={porCausa} />
              <LineaMensual datos={porMes} anio={anio} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Tile({
  etiqueta,
  valor,
  sufijo,
}: {
  etiqueta: string
  valor: string
  sufijo?: string
}) {
  return (
    <div className="rounded-[var(--radio)] border bg-[var(--superficie)] px-4 py-4">
      <div className="text-[11px] text-[var(--texto-suave)]">{etiqueta}</div>
      <div className="mt-1 text-2xl font-semibold leading-none">
        {valor}
        {sufijo && (
          <span className="ml-1 text-xs font-normal text-[var(--texto-suave)]">
            {sufijo}
          </span>
        )}
      </div>
    </div>
  )
}

function TablaDetalle({
  porCausa,
  porTipo,
  porMes,
}: {
  porCausa: { causa: string; dias: number; casos: number }[]
  porTipo: { tipo: TipoAusencia; dias: number; casos: number }[]
  porMes: { etiqueta: string; dias: number; casos: number }[]
}) {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <Tabla
        titulo="Por causa de incapacidad"
        columna="Causa"
        filas={porCausa.map((c) => ({ nombre: c.causa, dias: c.dias, casos: c.casos }))}
      />
      <Tabla
        titulo="Por tipo de ausencia"
        columna="Tipo"
        filas={porTipo.map((t) => ({
          nombre: TIPOS_AUSENCIA.find((x) => x.valor === t.tipo)?.etiqueta ?? t.tipo,
          dias: t.dias,
          casos: t.casos,
        }))}
      />
      <Tabla
        titulo="Por mes"
        columna="Mes"
        filas={porMes
          .filter((m) => m.casos > 0)
          .map((m) => ({ nombre: m.etiqueta, dias: m.dias, casos: m.casos }))}
      />
    </div>
  )
}

function Tabla({
  titulo,
  columna,
  filas,
}: {
  titulo: string
  columna: string
  filas: { nombre: string; dias: number; casos: number }[]
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radio)] border bg-[var(--superficie)]">
      <header className="border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{titulo}</h2>
      </header>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-[var(--superficie-alt)] text-[11px] text-[var(--texto-suave)]">
            <th className="px-4 py-1.5 text-left font-semibold">{columna}</th>
            <th className="px-3 py-1.5 text-right font-semibold">Días</th>
            <th className="px-4 py-1.5 text-right font-semibold">Casos</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-4 text-xs text-[var(--texto-suave)]">
                Sin datos.
              </td>
            </tr>
          ) : (
            filas.map((f) => (
              <tr key={f.nombre} className="border-b last:border-0">
                <td className="px-4 py-1.5 text-[13px]">{f.nombre}</td>
                <td className="cifra px-3 py-1.5 text-right">{f.dias}</td>
                <td className="cifra px-4 py-1.5 text-right text-[var(--texto-suave)]">
                  {f.casos}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
