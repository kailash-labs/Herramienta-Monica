'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DIAS,
  MOTIVOS,
  duracionMinutos,
  fechaCorta,
  hhmm,
  horas,
  sumarDias,
} from '@/lib/dominio'
import type { EstadoSemana, MotivoCambio, TipoTurno } from '@/lib/dominio'
import { borrarTurno, guardarTurno } from './acciones'

type Turno = {
  id: string
  colaborador_id: string
  fecha: string
  orden_bloque: number
  hora_inicio: string
  hora_fin: string
  tipo_turno: TipoTurno
  duracion_minutos: number | null
}

type Colaborador = {
  id: string
  nombre_completo: string
  codigo_empleado: string | null
  cargo_id: string
  horas_contrato: number
  tipo_jornada: string
}

type Frecuente = {
  hora_inicio: string
  hora_fin: string
  tipo_turno: TipoTurno
  minutos: number
  usos: number
}

type Resumen = {
  colaborador_id: string
  horas_planeadas: number
  horas_extra_planeadas: number
  dias_descanso: number
}

/**
 * El aforo en pantalla angosta: una lista de personas, cada una con su semana
 * en vertical.
 *
 * La grilla de siete columnas no se puede usar con el pulgar. Acá se invierte el
 * eje — se elige una persona y se ve su semana hacia abajo, que además es como
 * piensa el administrador ("Juan trabaja lunes a sábado de 8 a 3"). Los horarios
 * más usados de la tienda quedan a un toque.
 *
 * No es una ruta aparte ni una pantalla alternativa: la misma página muestra
 * esta lista o la grilla según el ancho, por CSS. Nadie elige nada.
 */
export default function AforoLista({
  tienda,
  semana,
  cargos,
  colaboradores,
  turnos,
  resumen,
  frecuentes,
  ausencias,
  validaciones,
}: {
  tienda: { id: string; codigo: string; nombre: string }
  semana: { id: string; fecha_inicio: string; estado: EstadoSemana }
  cargos: { id: string; nombre: string; color: string | null }[]
  colaboradores: Colaborador[]
  turnos: Turno[]
  resumen: Resumen[]
  frecuentes: Frecuente[]
  ausencias: { colaborador_id: string; tipo: string; fecha_inicio: string; fecha_fin: string }[]
  validaciones: { colaborador_id: string | null; severidad: string; mensaje: string }[]
}) {
  const [abierto, setAbierto] = useState<string | null>(null)
  const cerrada = semana.estado === 'cerrada'

  const fechas = useMemo(
    () => Array.from({ length: 7 }, (_, i) => sumarDias(semana.fecha_inicio, i)),
    [semana.fecha_inicio],
  )

  const porCelda = useMemo(() => {
    const m = new Map<string, Turno[]>()
    for (const t of turnos) {
      const k = `${t.colaborador_id}|${t.fecha}`
      const a = m.get(k)
      if (a) a.push(t)
      else m.set(k, [t])
    }
    return m
  }, [turnos])

  const porColaborador = useMemo(() => {
    const m = new Map<string, Resumen>()
    for (const r of resumen) m.set(r.colaborador_id, r)
    return m
  }, [resumen])

  const ausenciaPorCelda = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of ausencias) {
      for (let f = a.fecha_inicio; f <= a.fecha_fin; f = sumarDias(f, 1)) {
        m.set(`${a.colaborador_id}|${f}`, a.tipo)
      }
    }
    return m
  }, [ausencias])

  const alertasPor = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of validaciones) {
      if (!v.colaborador_id) continue
      m.set(v.colaborador_id, (m.get(v.colaborador_id) ?? 0) + 1)
    }
    return m
  }, [validaciones])

  const grupos = cargos
    .map((c) => ({ ...c, gente: colaboradores.filter((x) => x.cargo_id === c.id) }))
    .filter((c) => c.gente.length > 0)

  return (
    <div>
      <p className="mb-3 px-1 text-xs text-[var(--texto-suave)]">
        {cerrada
          ? 'Esta semana está cerrada: no admite cambios.'
          : 'Tocá una persona para ver y cargar su semana.'}
      </p>

      <div className="space-y-4">
        {grupos.map((cargo) => (
          <section key={cargo.id}>
            <h2 className="mb-1.5 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: cargo.color ?? 'var(--borde-fuerte)' }}
              />
              {cargo.nombre}
            </h2>

            <ul className="space-y-1.5">
              {cargo.gente.map((c) => {
                const r = porColaborador.get(c.id)
                const hs = Number(r?.horas_planeadas ?? 0)
                const extra = Number(r?.horas_extra_planeadas ?? 0)
                const alertas = alertasPor.get(c.id) ?? 0
                const estaAbierto = abierto === c.id

                return (
                  <li
                    key={c.id}
                    className="overflow-hidden rounded-[var(--radio)] border bg-[var(--superficie)]"
                  >
                    <button
                      onClick={() => setAbierto(estaAbierto ? null : c.id)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left"
                      aria-expanded={estaAbierto}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {c.nombre_completo}
                        </span>
                        <span className="text-[11px] text-[var(--texto-tenue)]">
                          {c.codigo_empleado && `${c.codigo_empleado} · `}
                          contrato {horas(Number(c.horas_contrato) * 60)} h
                          {c.tipo_jornada === 'medio_tiempo' && ' · medio tiempo'}
                        </span>
                      </span>

                      {alertas > 0 && (
                        <span className="shrink-0 rounded bg-[var(--error-fondo)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--error)]">
                          {alertas}
                        </span>
                      )}

                      <span
                        className={`cifra shrink-0 text-sm font-semibold ${
                          extra > 0 ? 'text-[var(--error)]' : 'text-[var(--texto)]'
                        }`}
                      >
                        {horas(hs * 60)} h
                        {extra > 0 && (
                          <span className="ml-1 text-[10px]">+{horas(extra * 60)}</span>
                        )}
                      </span>

                      <span className="shrink-0 text-[var(--texto-tenue)]">
                        {estaAbierto ? '▴' : '▾'}
                      </span>
                    </button>

                    {estaAbierto && (
                      <SemanaDe
                        colaborador={c}
                        fechas={fechas}
                        porCelda={porCelda}
                        ausenciaPorCelda={ausenciaPorCelda}
                        frecuentes={frecuentes}
                        tiendaId={tienda.id}
                        semana={semana.fecha_inicio}
                        semanaId={semana.id}
                        estadoSemana={semana.estado}
                        cerrada={cerrada}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

const ABREVIA: Record<string, string> = {
  incapacidad: 'Incapacidad',
  permiso_remunerado: 'Permiso',
  permiso_no_remunerado: 'Permiso',
  ausencia_injustificada: 'Ausencia',
  vacaciones: 'Vacaciones',
  licencia: 'Licencia',
}

function SemanaDe({
  colaborador,
  fechas,
  porCelda,
  ausenciaPorCelda,
  frecuentes,
  tiendaId,
  semana,
  semanaId,
  estadoSemana,
  cerrada,
}: {
  colaborador: Colaborador
  fechas: string[]
  porCelda: Map<string, Turno[]>
  ausenciaPorCelda: Map<string, string>
  frecuentes: Frecuente[]
  tiendaId: string
  semana: string
  semanaId: string
  estadoSemana: EstadoSemana
  cerrada: boolean
}) {
  const [editando, setEditando] = useState<string | null>(null)

  return (
    <div className="border-t bg-[var(--superficie-alt)]/40 px-2 py-2">
      <ul className="space-y-1">
        {fechas.map((f, i) => {
          const bloques = porCelda.get(`${colaborador.id}|${f}`) ?? []
          const aus = ausenciaPorCelda.get(`${colaborador.id}|${f}`)
          const total = bloques.reduce(
            (s, b) => s + (b.duracion_minutos ?? duracionMinutos(b.hora_inicio, b.hora_fin)),
            0,
          )

          return (
            <li key={f}>
              <button
                onClick={() => !cerrada && setEditando(editando === f ? null : f)}
                disabled={cerrada}
                className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition ${
                  editando === f ? 'bg-[var(--superficie)] ring-1 ring-[var(--acento)]' : ''
                } ${cerrada ? '' : 'active:bg-[var(--superficie)]'}`}
              >
                <span className="w-16 shrink-0 text-xs font-medium text-[var(--texto-suave)]">
                  {DIAS[i].slice(0, 3)} {f.slice(8)}
                </span>

                <span className="min-w-0 flex-1">
                  {bloques.length > 0 ? (
                    bloques.map((b) => (
                      <span key={b.id} className="cifra block text-[13px]">
                        {hhmm(b.hora_inicio)} – {hhmm(b.hora_fin)}
                      </span>
                    ))
                  ) : aus ? (
                    <span className="text-[12px] font-medium text-[var(--alerta)]">
                      {ABREVIA[aus] ?? 'Ausencia'}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[var(--texto-tenue)]">Descansa</span>
                  )}
                </span>

                {total > 0 && (
                  <span className="cifra shrink-0 text-xs text-[var(--texto-suave)]">
                    {horas(total)} h
                  </span>
                )}
              </button>

              {editando === f && (
                <EditorDia
                  colaborador={colaborador}
                  fecha={f}
                  bloques={bloques}
                  frecuentes={frecuentes}
                  tiendaId={tiendaId}
                  semana={semana}
                  semanaId={semanaId}
                  estadoSemana={estadoSemana}
                  onListo={() => setEditando(null)}
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EditorDia({
  colaborador,
  fecha,
  bloques,
  frecuentes,
  tiendaId,
  semana,
  semanaId,
  estadoSemana,
  onListo,
}: {
  colaborador: Colaborador
  fecha: string
  bloques: Turno[]
  frecuentes: Frecuente[]
  tiendaId: string
  semana: string
  semanaId: string
  estadoSemana: EstadoSemana
  onListo: () => void
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const exigeMotivo = estadoSemana === 'publicada'
  const [motivo, setMotivo] = useState<MotivoCambio>(
    exigeMotivo ? 'cambio_operativo' : 'planeacion_inicial',
  )

  const [manual, setManual] = useState(bloques.length > 0)
  const [propios, setPropios] = useState<{ inicio: string; fin: string }[]>(
    bloques.length > 0
      ? bloques.map((b) => ({ inicio: hhmm(b.hora_inicio), fin: hhmm(b.hora_fin) }))
      : [{ inicio: '08:00', fin: '15:00' }],
  )

  function aplicar(lista: { inicio: string; fin: string }[], tipo: TipoTurno) {
    setError(null)
    iniciar(async () => {
      const r = await guardarTurno({
        tiendaId,
        semana,
        semanaId,
        colaboradorId: colaborador.id,
        fecha,
        tipo: lista.length > 1 ? 'partido' : tipo,
        bloques: lista,
        motivo,
      })
      if (!r.ok) setError(r.error)
      else {
        onListo()
        router.refresh()
      }
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
      if (!r.ok) setError(r.error)
      else {
        onListo()
        router.refresh()
      }
    })
  }

  const totalPropios = propios.reduce(
    (s, b) => s + (b.inicio && b.fin ? duracionMinutos(b.inicio, b.fin) : 0),
    0,
  )

  return (
    <div className="mt-1 rounded-md border bg-[var(--superficie)] p-3">
      <p className="text-[11px] text-[var(--texto-suave)]">
        {colaborador.nombre_completo} · {fechaCorta(fecha)}
      </p>

      {!manual && (
        <>
          <p className="mt-2.5 text-[11px] font-medium text-[var(--texto-suave)]">
            Horarios más usados en esta tienda
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {frecuentes.map((f) => (
              <button
                key={`${f.hora_inicio}-${f.hora_fin}`}
                onClick={() =>
                  aplicar([{ inicio: hhmm(f.hora_inicio), fin: hhmm(f.hora_fin) }], f.tipo_turno)
                }
                disabled={pendiente}
                className="cifra rounded-md border px-2 py-2.5 text-[13px] transition active:bg-[var(--superficie-alt)] disabled:opacity-50"
              >
                {hhmm(f.hora_inicio)} – {hhmm(f.hora_fin)}
                <span className="ml-1 text-[10px] text-[var(--texto-tenue)]">
                  {horas(f.minutos)} h
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setManual(true)}
            className="mt-2 w-full rounded-md border border-dashed px-2 py-2 text-xs text-[var(--texto-suave)]"
          >
            Otro horario
          </button>
        </>
      )}

      {manual && (
        <div className="mt-2.5 space-y-2">
          {propios.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="time"
                value={b.inicio}
                onChange={(e) =>
                  setPropios((p) =>
                    p.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)),
                  )
                }
                className="cifra flex-1 rounded-md border bg-white px-2 py-2.5 text-sm"
              />
              <span className="text-[var(--texto-tenue)]">–</span>
              <input
                type="time"
                value={b.fin}
                onChange={(e) =>
                  setPropios((p) => p.map((x, j) => (j === i ? { ...x, fin: e.target.value } : x)))
                }
                className="cifra flex-1 rounded-md border bg-white px-2 py-2.5 text-sm"
              />
              {propios.length > 1 && (
                <button
                  onClick={() => setPropios((p) => p.filter((_, j) => j !== i))}
                  className="px-1.5 text-xs text-[var(--texto-tenue)]"
                  aria-label={`Quitar bloque ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {propios.length === 1 && (
            <button
              onClick={() => setPropios((p) => [...p, { inicio: '17:00', fin: '21:00' }])}
              className="text-[11px] text-[var(--info)]"
            >
              + Partir en dos bloques
            </button>
          )}

          <div className="flex items-center justify-between rounded-md bg-[var(--superficie-alt)] px-2.5 py-1.5">
            <span className="text-[11px] text-[var(--texto-suave)]">Total del día</span>
            <span className="cifra text-sm font-semibold">{horas(totalPropios)} h</span>
          </div>
        </div>
      )}

      {exigeMotivo && (
        <label className="mt-2.5 block text-[11px] text-[var(--texto-suave)]">
          Motivo del cambio
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoCambio)}
            className="mt-1 w-full rounded-md border bg-white px-2 py-2 text-sm"
          >
            {MOTIVOS.filter((m) => m.valor !== 'planeacion_inicial').map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-md bg-[var(--error-fondo)] px-2.5 py-2 text-[11px] text-[var(--error)]"
        >
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {manual && (
          <button
            onClick={() => aplicar(propios, 'completo')}
            disabled={pendiente}
            className="flex-1 rounded-md bg-[var(--texto)] px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pendiente ? 'Guardando…' : 'Guardar'}
          </button>
        )}

        {bloques.length > 0 && (
          <button
            onClick={quitar}
            disabled={pendiente}
            className="rounded-md border border-[var(--error)]/30 px-3 py-2.5 text-sm text-[var(--error)] disabled:opacity-50"
          >
            Descansa
          </button>
        )}

        <button
          onClick={onListo}
          className="rounded-md border px-3 py-2.5 text-sm text-[var(--texto-suave)]"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
