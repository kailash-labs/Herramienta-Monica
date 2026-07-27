'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { nombreMes } from '@/lib/dominio'
import type { EstadoLinea } from '@/lib/dominio'
import { conciliarTodas, descartarAlerta, marcarAlertaEnviada } from './acciones'

type Tienda = { id: string; codigo: string; nombre: string }
type Conciliacion = {
  id: string
  tienda_id: string
  estado: 'pendiente' | 'cuadra' | 'no_cuadra' | 'revisada'
  generada_at: string
}
type Detalle = {
  id: string
  conciliacion_id: string
  colaborador_id: string
  horas_extra_planeadas: number
  horas_extra_reales: number
  horas_recargo_reales: number
  diferencia_horas: number
  valor_extras: number
  estado: EstadoLinea
}
type Colaborador = {
  id: string
  nombre_completo: string
  codigo_empleado: string | null
  tienda_id: string
}
type Alerta = {
  id: string
  colaborador_id: string | null
  estado: 'borrador' | 'enviada' | 'descartada'
  asunto: string
  cuerpo: string
  origen_id: string | null
  tienda_id: string
}

const ETIQUETA_LINEA: Record<EstadoLinea, { texto: string; clase: string }> = {
  cuadra: { texto: 'Cuadra', clase: 'bg-[var(--ok-fondo)] text-[var(--ok)]' },
  exceso: { texto: 'Se pagó de más', clase: 'bg-[var(--error-fondo)] text-[var(--error)]' },
  faltante: { texto: 'Falta pagar', clase: 'bg-[var(--alerta-fondo)] text-[var(--alerta)]' },
  sin_planeacion: {
    texto: 'Sin planear',
    clase: 'bg-[var(--error-fondo)] text-[var(--error)]',
  },
}

export default function TablaConsolidado({
  anio,
  mes,
  tiendas,
  conciliaciones,
  detalle,
  colaboradores,
  alertas,
}: {
  anio: number
  mes: number
  tiendas: Tienda[]
  conciliaciones: Conciliacion[]
  detalle: Detalle[]
  colaboradores: Colaborador[]
  alertas: Alerta[]
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [soloProblemas, setSoloProblemas] = useState(true)
  const [alertaAbierta, setAlertaAbierta] = useState<Alerta | null>(null)

  const colabPorId = useMemo(() => {
    const m = new Map<string, Colaborador>()
    for (const c of colaboradores) m.set(c.id, c)
    return m
  }, [colaboradores])

  const concPorId = useMemo(() => {
    const m = new Map<string, Conciliacion>()
    for (const c of conciliaciones) m.set(c.id, c)
    return m
  }, [conciliaciones])

  const alertaPorDetalle = useMemo(() => {
    const m = new Map<string, Alerta>()
    for (const a of alertas) if (a.origen_id) m.set(a.origen_id, a)
    return m
  }, [alertas])

  // Filas ordenadas: primero lo que no cuadra, que es lo que hay que mirar
  const filas = useMemo(() => {
    const orden: Record<EstadoLinea, number> = {
      exceso: 0,
      sin_planeacion: 1,
      faltante: 2,
      cuadra: 3,
    }
    return detalle
      .filter((d) => (soloProblemas ? d.estado !== 'cuadra' : true))
      .map((d) => {
        const conc = concPorId.get(d.conciliacion_id)
        const colab = colabPorId.get(d.colaborador_id)
        const tienda = tiendas.find((t) => t.id === conc?.tienda_id)
        return { d, colab, tienda, alerta: alertaPorDetalle.get(d.id) }
      })
      .sort((a, b) => {
        const o = orden[a.d.estado] - orden[b.d.estado]
        if (o !== 0) return o
        return Math.abs(Number(b.d.diferencia_horas)) - Math.abs(Number(a.d.diferencia_horas))
      })
  }, [detalle, soloProblemas, concPorId, colabPorId, tiendas, alertaPorDetalle])

  const noCuadran = detalle.filter((d) => d.estado !== 'cuadra')
  const totalDiferencia = noCuadran.reduce((s, d) => s + Number(d.diferencia_horas), 0)
  const borradores = alertas.filter((a) => a.estado === 'borrador')

  const mesAnterior = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 }
  const mesSiguiente = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 }

  function correr() {
    setError(null)
    iniciar(async () => {
      const r = await conciliarTodas(tiendas.map((t) => t.id), anio, mes)
      if (!r.ok) setError(r.error)
      else router.refresh()
    })
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-stretch gap-3">
        <Metrica
          etiqueta="Diferencias"
          valor={String(noCuadran.length)}
          tono={noCuadran.length > 0 ? 'error' : 'ok'}
        />
        <Metrica
          etiqueta="Horas en disputa"
          valor={totalDiferencia > 0 ? `+${totalDiferencia.toFixed(1)}` : totalDiferencia.toFixed(1)}
          sufijo="h"
          tono={Math.abs(totalDiferencia) > 0.01 ? 'alerta' : 'ok'}
        />
        <Metrica etiqueta="Tiendas" valor={String(tiendas.length)} />
        <Metrica
          etiqueta="Borradores sin enviar"
          valor={String(borradores.length)}
          tono={borradores.length > 0 ? 'alerta' : 'neutro'}
        />

        <div className="ml-auto flex items-end gap-2">
          <Link
            href={`/consolidado?anio=${mesAnterior.anio}&mes=${mesAnterior.mes}`}
            className="rounded-md border bg-[var(--superficie)] px-2.5 py-2 text-sm text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
          >
            ← {nombreMes(mesAnterior.mes)}
          </Link>
          <Link
            href={`/consolidado?anio=${mesSiguiente.anio}&mes=${mesSiguiente.mes}`}
            className="rounded-md border bg-[var(--superficie)] px-2.5 py-2 text-sm text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
          >
            {nombreMes(mesSiguiente.mes)} →
          </Link>
          <button
            onClick={correr}
            disabled={pendiente}
            className="rounded-md bg-[var(--texto)] px-3 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
          >
            {pendiente ? 'Cruzando…' : 'Cruzar el mes'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-[var(--error-fondo)] px-3 py-2 text-xs text-[var(--error)]">
          {error}
        </p>
      )}

      {detalle.length === 0 ? (
        <div className="mt-5 rounded-[var(--radio)] border border-dashed bg-[var(--superficie)] px-6 py-16 text-center">
          <p className="text-sm font-medium">
            Todavía no se cruzó {nombreMes(mes)} de {anio}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--texto-suave)]">
            Cargá el reporte de nómina del mes en la sección Nómina y después
            tocá &laquo;Cruzar el mes&raquo;. Acá van a aparecer solo los casos que
            no cuadran.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-[var(--texto-suave)]">
              <input
                type="checkbox"
                checked={soloProblemas}
                onChange={(e) => setSoloProblemas(e.target.checked)}
                className="accent-[var(--texto)]"
              />
              Mostrar solo lo que no cuadra
            </label>
            <span className="text-xs text-[var(--texto-tenue)]">
              {filas.length} de {detalle.length} filas
            </span>
          </div>

          <div className="mt-2.5 overflow-hidden rounded-[var(--radio)] border bg-[var(--superficie)] shadow-[var(--sombra)]">
            <div className="scroll-x">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-[var(--superficie-alt)] text-xs text-[var(--texto-suave)]">
                    <th className="px-4 py-2.5 text-left font-semibold">Tienda</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Colaborador</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Planeada</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Pagada</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Diferencia</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Recargos</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Aviso</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(({ d, colab, tienda, alerta }) => {
                    const et = ETIQUETA_LINEA[d.estado]
                    const dif = Number(d.diferencia_horas)
                    return (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-[var(--superficie-alt)]/40">
                        <td className="px-4 py-2 text-xs text-[var(--texto-suave)]">
                          {tienda?.codigo ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-[13px] font-medium">
                          {colab?.codigo_empleado ?? colab?.nombre_completo ?? '—'}
                        </td>
                        <td className="cifra px-3 py-2 text-right">
                          {Number(d.horas_extra_planeadas).toFixed(1)}
                        </td>
                        <td className="cifra px-3 py-2 text-right">
                          {Number(d.horas_extra_reales).toFixed(1)}
                        </td>
                        <td
                          className={`cifra px-3 py-2 text-right font-semibold ${
                            Math.abs(dif) < 0.01
                              ? 'text-[var(--texto-tenue)]'
                              : dif > 0
                                ? 'text-[var(--error)]'
                                : 'text-[var(--alerta)]'
                          }`}
                        >
                          {dif > 0 ? '+' : ''}
                          {dif.toFixed(1)}
                        </td>
                        <td className="cifra px-3 py-2 text-right text-[var(--texto-suave)]">
                          {Number(d.horas_recargo_reales).toFixed(1)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] ${et.clase}`}>
                            {et.texto}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {alerta ? (
                            alerta.estado === 'borrador' ? (
                              <button
                                onClick={() => setAlertaAbierta(alerta)}
                                className="text-[11px] text-[var(--info)] transition hover:underline"
                              >
                                Ver borrador
                              </button>
                            ) : (
                              <span className="text-[11px] text-[var(--texto-tenue)]">
                                {alerta.estado === 'enviada' ? 'Enviado' : 'Descartado'}
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-[var(--texto-tenue)]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {alertaAbierta && (
        <VistaAlerta
          alerta={alertaAbierta}
          onCerrar={() => setAlertaAbierta(null)}
          onEnviar={() =>
            iniciar(async () => {
              await marcarAlertaEnviada(alertaAbierta.id)
              setAlertaAbierta(null)
              router.refresh()
            })
          }
          onDescartar={() =>
            iniciar(async () => {
              await descartarAlerta(alertaAbierta.id)
              setAlertaAbierta(null)
              router.refresh()
            })
          }
          pendiente={pendiente}
        />
      )}
    </>
  )
}

function VistaAlerta({
  alerta,
  onCerrar,
  onEnviar,
  onDescartar,
  pendiente,
}: {
  alerta: Alerta
  onCerrar: () => void
  onEnviar: () => void
  onDescartar: () => void
  pendiente: boolean
}) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    await navigator.clipboard.writeText(`${alerta.asunto}\n\n${alerta.cuerpo}`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[var(--radio)] border bg-[var(--superficie)] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-sm font-semibold">Borrador del llamado de atención</h2>
          <button
            onClick={onCerrar}
            className="rounded-md px-2 py-1 text-sm text-[var(--texto-tenue)] transition hover:bg-[var(--superficie-alt)]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <p className="mt-4 text-xs text-[var(--texto-suave)]">Asunto</p>
        <p className="mt-1 text-[13px] font-medium">{alerta.asunto}</p>

        <p className="mt-4 text-xs text-[var(--texto-suave)]">Mensaje</p>
        <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--superficie-alt)] p-3 text-[12px] leading-relaxed">
          {alerta.cuerpo}
        </pre>

        <p className="mt-3 text-[11px] text-[var(--texto-tenue)]">
          El sistema no lo envía solo. Copialo, mandalo por el canal que uses y
          después marcalo como enviado.
        </p>

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={copiar}
            className="flex-1 rounded-md border px-3 py-2 text-sm transition hover:bg-[var(--superficie-alt)]"
          >
            {copiado ? 'Copiado' : 'Copiar texto'}
          </button>
          <button
            onClick={onEnviar}
            disabled={pendiente}
            className="rounded-md bg-[var(--texto)] px-3 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
          >
            Marcar como enviado
          </button>
          <button
            onClick={onDescartar}
            disabled={pendiente}
            className="rounded-md border px-3 py-2 text-sm text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)] disabled:opacity-50"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  )
}

function Metrica({
  etiqueta,
  valor,
  sufijo,
  tono = 'neutro',
}: {
  etiqueta: string
  valor: string
  sufijo?: string
  tono?: 'neutro' | 'ok' | 'alerta' | 'error'
}) {
  const color = {
    neutro: 'text-[var(--texto)]',
    ok: 'text-[var(--ok)]',
    alerta: 'text-[var(--alerta)]',
    error: 'text-[var(--error)]',
  }[tono]

  return (
    <div className="rounded-[var(--radio)] border bg-[var(--superficie)] px-4 py-2.5">
      <div className="text-[11px] text-[var(--texto-suave)]">{etiqueta}</div>
      <div className={`cifra mt-0.5 text-lg font-semibold ${color}`}>
        {valor}
        {sufijo && <span className="ml-0.5 text-xs font-normal">{sufijo}</span>}
      </div>
    </div>
  )
}
