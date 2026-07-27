'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CAUSAS_AUSENCIA,
  TIPOS_AUSENCIA,
  fechaCorta,
  sumarDias,
} from '@/lib/dominio'
import type { CausaAusencia, TipoAusencia } from '@/lib/dominio'
import { borrarAusencia, registrarAusencia } from './acciones-ausencias'

export type Ausencia = {
  id: string
  colaborador_id: string
  tipo: TipoAusencia
  causa: CausaAusencia | null
  fecha_inicio: string
  fecha_fin: string
  dias: number | null
  descripcion: string | null
}

type Colaborador = {
  id: string
  nombre_completo: string
  codigo_empleado: string | null
}

function etiquetaTipo(t: TipoAusencia) {
  return TIPOS_AUSENCIA.find((x) => x.valor === t)?.etiqueta ?? t
}
function etiquetaCausa(c: CausaAusencia | null) {
  return c ? (CAUSAS_AUSENCIA.find((x) => x.valor === c)?.etiqueta ?? c) : null
}

export default function PanelAusencias({
  ausencias,
  colaboradores,
  tiendaId,
  semana,
  cerrada,
}: {
  ausencias: Ausencia[]
  colaboradores: Colaborador[]
  tiendaId: string
  semana: string
  cerrada: boolean
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)

  return (
    <section className="rounded-[var(--radio)] border bg-[var(--superficie)] shadow-[var(--sombra)]">
      <header className="flex items-start gap-3 border-b px-4 py-3">
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Ausencias de la semana</h2>
          <p className="mt-0.5 text-xs text-[var(--texto-suave)]">
            Registrar acá libera los turnos y guarda la causa. Es lo que alimenta
            el acumulado de ausentismo.
          </p>
        </div>
        {!cerrada && (
          <button
            onClick={() => setAbierto(true)}
            className="shrink-0 rounded-md border px-2.5 py-1.5 text-xs text-[var(--texto)] transition hover:bg-[var(--superficie-alt)]"
          >
            Registrar
          </button>
        )}
      </header>

      {ausencias.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[var(--texto-suave)]">
          Ninguna ausencia registrada en esta semana.
        </p>
      ) : (
        <ul className="divide-y">
          {ausencias.map((a) => {
            const c = colaboradores.find((x) => x.id === a.colaborador_id)
            const causa = etiquetaCausa(a.causa)
            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">
                    {c?.codigo_empleado ?? c?.nombre_completo ?? 'Colaborador'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--texto-suave)]">
                    {etiquetaTipo(a.tipo)}
                    {causa && ` · ${causa}`}
                    {' · '}
                    {a.fecha_inicio === a.fecha_fin
                      ? fechaCorta(a.fecha_inicio)
                      : `${fechaCorta(a.fecha_inicio)} al ${fechaCorta(a.fecha_fin)}`}
                    {a.dias ? ` · ${a.dias} día${a.dias > 1 ? 's' : ''}` : ''}
                  </p>
                  {a.descripcion && (
                    <p className="mt-0.5 text-[11px] italic text-[var(--texto-tenue)]">
                      {a.descripcion}
                    </p>
                  )}
                </div>
                {!cerrada && (
                  <BotonQuitar
                    tiendaId={tiendaId}
                    semana={semana}
                    ausenciaId={a.id}
                    onListo={() => router.refresh()}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}

      {abierto && (
        <ModalAusencia
          colaboradores={colaboradores}
          tiendaId={tiendaId}
          semana={semana}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </section>
  )
}

function BotonQuitar({
  tiendaId,
  semana,
  ausenciaId,
  onListo,
}: {
  tiendaId: string
  semana: string
  ausenciaId: string
  onListo: () => void
}) {
  const [pendiente, iniciar] = useTransition()
  return (
    <button
      onClick={() =>
        iniciar(async () => {
          await borrarAusencia(tiendaId, semana, ausenciaId)
          onListo()
        })
      }
      disabled={pendiente}
      className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-[var(--texto-tenue)] transition hover:bg-[var(--superficie-alt)]"
      title="Quitar el registro. Los turnos liberados no vuelven solos."
    >
      Quitar
    </button>
  )
}

function ModalAusencia({
  colaboradores,
  tiendaId,
  semana,
  onCerrar,
}: {
  colaboradores: Colaborador[]
  tiendaId: string
  semana: string
  onCerrar: () => void
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [colaboradorId, setColaboradorId] = useState(colaboradores[0]?.id ?? '')
  const [tipo, setTipo] = useState<TipoAusencia>('incapacidad')
  const [causa, setCausa] = useState<CausaAusencia>('viral')
  const [desde, setDesde] = useState(semana)
  const [hasta, setHasta] = useState(semana)
  const [descripcion, setDescripcion] = useState('')
  const [liberar, setLiberar] = useState(true)

  const finSemana = sumarDias(semana, 6)
  const exigeCausa = tipo === 'incapacidad'

  function guardar() {
    setError(null)
    iniciar(async () => {
      const r = await registrarAusencia({
        tiendaId,
        semana,
        colaboradorId,
        tipo,
        causa: exigeCausa || causa ? causa : null,
        fechaInicio: desde,
        fechaFin: hasta,
        descripcion,
        liberarTurnos: liberar,
      })

      if (!r.ok) {
        setError(r.error)
        return
      }
      onCerrar()
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[var(--radio)] border bg-[var(--superficie)] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-sm font-semibold">Registrar ausencia</h2>
          <button
            onClick={onCerrar}
            className="rounded-md px-2 py-1 text-sm text-[var(--texto-tenue)] transition hover:bg-[var(--superficie-alt)]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <label className="mt-4 block text-[11px] text-[var(--texto-suave)]">
          Colaborador
          <select
            value={colaboradorId}
            onChange={(e) => setColaboradorId(e.target.value)}
            className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
          >
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo_empleado ?? c.nombre_completo}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-[11px] text-[var(--texto-suave)]">
            Tipo
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAusencia)}
              className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
            >
              {TIPOS_AUSENCIA.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[11px] text-[var(--texto-suave)]">
            Causa {exigeCausa && <span className="text-[var(--error)]">·</span>}
            <select
              value={causa}
              onChange={(e) => setCausa(e.target.value as CausaAusencia)}
              className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
            >
              {CAUSAS_AUSENCIA.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.etiqueta}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-[11px] text-[var(--texto-suave)]">
            Desde
            <input
              type="date"
              value={desde}
              min={semana}
              max={finSemana}
              onChange={(e) => {
                setDesde(e.target.value)
                if (e.target.value > hasta) setHasta(e.target.value)
              }}
              className="cifra mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
            />
          </label>

          <label className="block text-[11px] text-[var(--texto-suave)]">
            Hasta
            <input
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => setHasta(e.target.value)}
              className="cifra mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
            />
          </label>
        </div>

        <label className="mt-3 block text-[11px] text-[var(--texto-suave)]">
          Detalle (opcional)
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Gastroenteritis, cita control…"
            className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
          />
        </label>

        <label className="mt-4 flex items-start gap-2 rounded-md bg-[var(--superficie-alt)] px-3 py-2.5">
          <input
            type="checkbox"
            checked={liberar}
            onChange={(e) => setLiberar(e.target.checked)}
            className="mt-0.5 accent-[var(--texto)]"
          />
          <span className="text-[11px] text-[var(--texto-suave)]">
            Quitar los turnos de esos días y recalcular las horas. Cada cambio
            queda en la bitácora vinculado a esta ausencia.
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-md bg-[var(--error-fondo)] px-3 py-2 text-xs text-[var(--error)]"
          >
            {error}
          </p>
        )}

        <button
          onClick={guardar}
          disabled={pendiente || !colaboradorId}
          className="mt-5 w-full rounded-md bg-[var(--texto)] px-3 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
        >
          {pendiente ? 'Guardando…' : 'Registrar'}
        </button>
      </div>
    </div>
  )
}
