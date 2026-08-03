'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { borrarTurno, guardarTurno } from './acciones'
import {
  DIAS,
  ETIQUETA_TIPO,
  MOTIVOS,
  duracionMinutos,
  fechaCorta,
  hhmm,
  horas,
} from '@/lib/dominio'
import type { EstadoSemana, MotivoCambio, TipoTurno } from '@/lib/dominio'

type Bloque = { inicio: string; fin: string }

const TIPOS: TipoTurno[] = ['completo', 'parcial', 'fijo_oficios']

export default function EditorCelda({
  tiendaId,
  semana,
  semanaId,
  estadoSemana,
  colaborador,
  fecha,
  bloques: bloquesIniciales,
  onCerrar,
}: {
  tiendaId: string
  semana: string
  semanaId: string
  estadoSemana: EstadoSemana
  colaborador: { id: string; nombre_completo: string; codigo_empleado: string | null }
  fecha: string
  bloques: { hora_inicio: string; hora_fin: string; tipo_turno: TipoTurno }[]
  onCerrar: () => void
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const teniaTurno = bloquesIniciales.length > 0

  const [bloques, setBloques] = useState<Bloque[]>(
    teniaTurno
      ? bloquesIniciales.map((b) => ({
          inicio: hhmm(b.hora_inicio),
          fin: hhmm(b.hora_fin),
        }))
      : [{ inicio: '08:00', fin: '15:00' }],
  )

  const [tipo, setTipo] = useState<TipoTurno>(
    teniaTurno && bloquesIniciales[0].tipo_turno !== 'partido'
      ? bloquesIniciales[0].tipo_turno
      : 'completo',
  )

  // Una semana publicada exige declarar por que cambia; en borrador es planeacion
  const exigeMotivo = estadoSemana === 'publicada'
  const [motivo, setMotivo] = useState<MotivoCambio>(
    exigeMotivo ? 'cambio_operativo' : 'planeacion_inicial',
  )

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const totalMin = bloques.reduce(
    (s, b) => s + (b.inicio && b.fin ? duracionMinutos(b.inicio, b.fin) : 0),
    0,
  )

  const dow = (new Date(`${fecha}T00:00:00`).getDay() + 6) % 7

  function guardar() {
    setError(null)
    iniciar(async () => {
      const r = await guardarTurno({
        tiendaId,
        semana,
        semanaId,
        colaboradorId: colaborador.id,
        fecha,
        tipo: bloques.length > 1 ? 'partido' : tipo,
        bloques,
        motivo,
      })
      if (r.ok) {
        onCerrar()
        router.refresh()
      } else setError(r.error)
    })
  }

  function quitar() {
    setError(null)
    iniciar(async () => {
      const r = await borrarTurno({
        tiendaId,
        semana,
        semanaId,
        colaboradorId: colaborador.id,
        fecha,
        motivo,
      })
      if (r.ok) {
        onCerrar()
        router.refresh()
      } else setError(r.error)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[var(--radio)] border bg-[var(--superficie)] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">
              {colaborador.nombre_completo}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--texto-suave)]">
              {DIAS[dow]} {fechaCorta(fecha)}
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-md px-2 py-1 text-sm text-[var(--texto-tenue)] transition hover:bg-[var(--superficie-alt)]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Bloques */}
        <div className="mt-5 space-y-2.5">
          {bloques.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 text-[11px] text-[var(--texto-suave)]">
                {bloques.length > 1 ? `Bloque ${i + 1}` : 'Horario'}
              </span>
              <input
                type="time"
                value={b.inicio}
                onChange={(e) =>
                  setBloques((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)),
                  )
                }
                className="cifra rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
              />
              <span className="text-[var(--texto-tenue)]">–</span>
              <input
                type="time"
                value={b.fin}
                onChange={(e) =>
                  setBloques((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, fin: e.target.value } : x)),
                  )
                }
                className="cifra rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
              />
              {bloques.length > 1 && (
                <button
                  onClick={() => setBloques((prev) => prev.filter((_, j) => j !== i))}
                  className="rounded-md px-1.5 py-1 text-xs text-[var(--texto-tenue)] transition hover:bg-[var(--superficie-alt)]"
                  aria-label={`Quitar bloque ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {bloques.length === 1 && (
            <button
              onClick={() =>
                setBloques((prev) => [...prev, { inicio: '17:00', fin: '21:00' }])
              }
              className="text-xs text-[var(--info)] transition hover:underline"
            >
              + Partir el turno en dos bloques
            </button>
          )}
        </div>

        {/* Tipo */}
        {bloques.length === 1 && (
          <div className="mt-4">
            <span className="text-[11px] text-[var(--texto-suave)]">Tipo de turno</span>
            <div className="mt-1.5 flex gap-1.5">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    tipo === t
                      ? 'border-[var(--texto)] bg-[var(--texto)] text-white'
                      : 'text-[var(--texto-suave)] hover:bg-[var(--superficie-alt)]'
                  }`}
                >
                  {ETIQUETA_TIPO[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Motivo: obligatorio una vez publicada la semana */}
        {exigeMotivo && (
          <div className="mt-4">
            <label className="text-[11px] text-[var(--texto-suave)]">
              Motivo del cambio
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as MotivoCambio)}
                className="mt-1.5 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
              >
                {MOTIVOS.filter((m) => m.valor !== 'planeacion_inicial').map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1.5 text-[11px] text-[var(--texto-tenue)]">
              La semana ya está publicada: el cambio queda en la bitácora con este
              motivo.
            </p>
          </div>
        )}

        <div className="mt-4 rounded-md bg-[var(--superficie-alt)] px-3 py-2">
          <span className="text-[11px] text-[var(--texto-suave)]">Total del día</span>
          <span className="cifra ml-2 text-sm font-semibold">{horas(totalMin)} h</span>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-md bg-[var(--error-fondo)] px-3 py-2 text-xs text-[var(--error)]"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={guardar}
            disabled={pendiente}
            className="flex-1 rounded-md bg-[var(--texto)] px-3 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
          >
            {pendiente ? 'Guardando…' : 'Guardar'}
          </button>

          {teniaTurno && (
            <button
              onClick={quitar}
              disabled={pendiente}
              className="rounded-md border border-[var(--error)]/30 px-3 py-2 text-sm text-[var(--error)] transition hover:bg-[var(--error-fondo)] disabled:opacity-50"
            >
              Quitar turno
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
