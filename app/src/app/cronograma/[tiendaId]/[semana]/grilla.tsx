'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DIAS,
  ETIQUETA_TIPO,
  duracionMinutos,
  hhmm,
  horas,
  sumarDias,
} from '@/lib/dominio'
import type { EstadoSemana, TipoTurno } from '@/lib/dominio'
import { publicar, revalidar } from './acciones'
import EditorCelda from './editor-celda'
import PanelHallazgos from './panel-hallazgos'
import PanelAdjuntos from './panel-adjuntos'
import PanelAusencias, { type Ausencia } from './panel-ausencias'
import NavegacionSemana from './navegacion-semana'

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
}

type Cargo = { id: string; codigo: string; nombre: string; color: string | null; orden: number }

type FilaResumen = {
  colaborador_id: string
  horas_planeadas: number
  horas_extra_planeadas: number
  dias_descanso: number
  aperturas: number
  cierres: number
  turnos_partidos: number
}

export type Validacion = {
  id: string
  codigo_regla: string
  severidad: 'bloqueante' | 'advertencia'
  colaborador_id: string | null
  mensaje: string
  estado: 'abierta' | 'resuelta' | 'aceptada'
  justificacion: string | null
}

export type Adjunto = {
  id: string
  storage_path: string
  archivo_nombre: string | null
  origen: 'foto' | 'pdf_sipo' | 'otro'
  estado: 'sin_procesar' | 'transcrito' | 'descartado'
  subido_at: string
  mime_type: string | null
}

export default function Grilla({
  tienda,
  semana,
  cargos,
  colaboradores,
  turnos,
  resumen,
  validaciones,
  adjuntos,
  ausencias,
}: {
  tienda: { id: string; codigo: string; nombre: string }
  semana: { id: string; fecha_inicio: string; estado: EstadoSemana; notas: string | null }
  cargos: Cargo[]
  colaboradores: Colaborador[]
  turnos: Turno[]
  resumen: FilaResumen[]
  validaciones: Validacion[]
  adjuntos: Adjunto[]
  ausencias: Ausencia[]
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [celda, setCelda] = useState<{ colaborador: Colaborador; fecha: string } | null>(null)

  const fechas = useMemo(
    () => Array.from({ length: 7 }, (_, i) => sumarDias(semana.fecha_inicio, i)),
    [semana.fecha_inicio],
  )

  // turnos indexados por colaborador+fecha, para no recorrer el arreglo por celda
  const porCelda = useMemo(() => {
    const m = new Map<string, Turno[]>()
    for (const t of turnos) {
      const k = `${t.colaborador_id}|${t.fecha}`
      const arr = m.get(k)
      if (arr) arr.push(t)
      else m.set(k, [t])
    }
    return m
  }, [turnos])

  const porColaborador = useMemo(() => {
    const m = new Map<string, FilaResumen>()
    for (const r of resumen) m.set(r.colaborador_id, r)
    return m
  }, [resumen])

  // Dias cubiertos por una ausencia: explican por que la celda quedo vacia
  const ausenciaPorCelda = useMemo(() => {
    const m = new Map<string, Ausencia>()
    for (const a of ausencias) {
      for (let f = a.fecha_inicio; f <= a.fecha_fin; f = sumarDias(f, 1)) {
        m.set(`${a.colaborador_id}|${f}`, a)
      }
    }
    return m
  }, [ausencias])

  const hallazgosPorColaborador = useMemo(() => {
    const m = new Map<string, Validacion[]>()
    for (const v of validaciones) {
      if (!v.colaborador_id || v.estado !== 'abierta') continue
      const arr = m.get(v.colaborador_id)
      if (arr) arr.push(v)
      else m.set(v.colaborador_id, [v])
    }
    return m
  }, [validaciones])

  const abiertas = validaciones.filter((v) => v.estado === 'abierta')
  const bloqueantes = abiertas.filter((v) => v.severidad === 'bloqueante')
  const cerrada = semana.estado === 'cerrada'

  const totalHoras = resumen.reduce((s, r) => s + Number(r.horas_planeadas), 0)
  const totalExtra = resumen.reduce((s, r) => s + Number(r.horas_extra_planeadas), 0)

  const cargosConGente = cargos
    .map((c) => ({
      ...c,
      gente: colaboradores.filter((x) => x.cargo_id === c.id),
    }))
    .filter((c) => c.gente.length > 0)

  function accion(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, exito: string) {
    setAviso(null)
    iniciar(async () => {
      const r = await fn()
      if (r.ok) {
        setAviso({ tipo: 'ok', texto: exito })
        router.refresh()
      } else {
        setAviso({ tipo: 'error', texto: r.error })
      }
    })
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6">
      <NavegacionSemana
        tiendaId={tienda.id}
        semana={semana.fecha_inicio}
        tienda={tienda}
        estado={semana.estado}
      />

      {/* Resumen de la semana */}
      <div className="mt-5 flex flex-wrap items-stretch gap-3">
        <Metrica etiqueta="Horas planeadas" valor={horas(totalHoras * 60)} sufijo="h" />
        <Metrica
          etiqueta="Extra planeada"
          valor={horas(totalExtra * 60)}
          sufijo="h"
          tono={totalExtra > 0 ? 'alerta' : 'neutro'}
        />
        <Metrica etiqueta="Colaboradores" valor={String(colaboradores.length)} />
        <Metrica
          etiqueta="Hallazgos abiertos"
          valor={String(abiertas.length)}
          tono={bloqueantes.length > 0 ? 'error' : abiertas.length > 0 ? 'alerta' : 'ok'}
        />

        <div className="ml-auto flex items-end gap-2">
          <Link
            href={`/cronograma/${tienda.id}/${semana.fecha_inicio}/imprimir`}
            className="rounded-md border bg-[var(--superficie)] px-3 py-2 text-sm text-[var(--texto)] transition hover:bg-[var(--superficie-alt)]"
          >
            PDF
          </Link>

          <button
            onClick={() => accion(
              () => revalidar(tienda.id, semana.fecha_inicio, semana.id),
              'Reglas revisadas.',
            )}
            disabled={pendiente || cerrada}
            className="rounded-md border bg-[var(--superficie)] px-3 py-2 text-sm text-[var(--texto)] transition hover:bg-[var(--superficie-alt)] disabled:opacity-50"
          >
            Revisar reglas
          </button>

          {semana.estado === 'borrador' && (
            <button
              onClick={() => accion(
                () => publicar(tienda.id, semana.fecha_inicio, semana.id),
                'Semana publicada.',
              )}
              disabled={pendiente}
              className="rounded-md bg-[var(--texto)] px-3 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
            >
              Publicar semana
            </button>
          )}
        </div>
      </div>

      {aviso && (
        <p
          role="status"
          className={`mt-3 rounded-md px-3 py-2 text-xs ${
            aviso.tipo === 'ok'
              ? 'bg-[var(--ok-fondo)] text-[var(--ok)]'
              : 'bg-[var(--error-fondo)] text-[var(--error)]'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {/* Grilla */}
      <div className="mt-5 overflow-hidden rounded-[var(--radio)] border bg-[var(--superficie)] shadow-[var(--sombra)]">
        <div className="scroll-x">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-[var(--superficie-alt)]">
                <th className="sticky left-0 z-10 bg-[var(--superficie-alt)] px-4 py-2.5 text-left text-xs font-semibold text-[var(--texto-suave)]">
                  Colaborador
                </th>
                {fechas.map((f, i) => (
                  <th
                    key={f}
                    className="min-w-[136px] px-2 py-2.5 text-center text-xs font-semibold text-[var(--texto-suave)]"
                  >
                    {DIAS[i]}{' '}
                    <span className="font-normal text-[var(--texto-tenue)]">
                      {f.slice(8)}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--texto-suave)]">
                  Horas
                </th>
              </tr>
            </thead>

            <tbody>
              {cargosConGente.map((cargo) => (
                <FragmentoCargo
                  key={cargo.id}
                  cargo={cargo}
                  fechas={fechas}
                  porCelda={porCelda}
                  porColaborador={porColaborador}
                  hallazgos={hallazgosPorColaborador}
                  ausencias={ausenciaPorCelda}
                  cerrada={cerrada}
                  onEditar={(colaborador, fecha) => setCelda({ colaborador, fecha })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-2 text-xs text-[var(--texto-tenue)]">
        {cerrada
          ? 'La semana está cerrada: no admite cambios.'
          : 'Tocá cualquier celda para armar, cambiar o quitar el turno.'}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <PanelHallazgos
            validaciones={validaciones}
            colaboradores={colaboradores}
            tiendaId={tienda.id}
            semana={semana.fecha_inicio}
          />
          <PanelAusencias
            ausencias={ausencias}
            colaboradores={colaboradores}
            tiendaId={tienda.id}
            semana={semana.fecha_inicio}
            cerrada={cerrada}
          />
        </div>
        <PanelAdjuntos
          adjuntos={adjuntos}
          tiendaId={tienda.id}
          semanaId={semana.id}
          semana={semana.fecha_inicio}
          cerrada={cerrada}
        />
      </div>

      {celda && (
        <EditorCelda
          tiendaId={tienda.id}
          semana={semana.fecha_inicio}
          semanaId={semana.id}
          estadoSemana={semana.estado}
          colaborador={celda.colaborador}
          fecha={celda.fecha}
          bloques={porCelda.get(`${celda.colaborador.id}|${celda.fecha}`) ?? []}
          onCerrar={() => setCelda(null)}
        />
      )}
    </div>
  )
}

function FragmentoCargo({
  cargo,
  fechas,
  porCelda,
  porColaborador,
  hallazgos,
  ausencias,
  cerrada,
  onEditar,
}: {
  cargo: Cargo & { gente: Colaborador[] }
  fechas: string[]
  porCelda: Map<string, Turno[]>
  porColaborador: Map<string, FilaResumen>
  hallazgos: Map<string, Validacion[]>
  ausencias: Map<string, Ausencia>
  cerrada: boolean
  onEditar: (c: Colaborador, fecha: string) => void
}) {
  return (
    <>
      <tr>
        <td
          colSpan={fechas.length + 2}
          className="border-y bg-[var(--superficie-alt)]/60 px-4 py-1.5"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: cargo.color ?? 'var(--borde-fuerte)' }}
            />
            {cargo.nombre}
          </span>
        </td>
      </tr>

      {cargo.gente.map((c) => {
        const r = porColaborador.get(c.id)
        const hs = Number(r?.horas_planeadas ?? 0)
        const extra = Number(r?.horas_extra_planeadas ?? 0)
        const misHallazgos = hallazgos.get(c.id) ?? []
        const bloqueante = misHallazgos.some((h) => h.severidad === 'bloqueante')

        return (
          <tr key={c.id} className="border-b last:border-0 hover:bg-[var(--superficie-alt)]/40">
            <td className="sticky left-0 z-10 bg-[var(--superficie)] px-4 py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium">
                  {c.codigo_empleado ?? c.nombre_completo}
                </span>
                {misHallazgos.length > 0 && (
                  <span
                    title={misHallazgos.map((h) => h.mensaje).join('\n')}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      bloqueante
                        ? 'bg-[var(--error-fondo)] text-[var(--error)]'
                        : 'bg-[var(--alerta-fondo)] text-[var(--alerta)]'
                    }`}
                  >
                    {misHallazgos.length}
                  </span>
                )}
              </div>
            </td>

            {fechas.map((f) => (
              <Celda
                key={f}
                bloques={porCelda.get(`${c.id}|${f}`) ?? []}
                ausencia={ausencias.get(`${c.id}|${f}`)}
                color={cargo.color}
                cerrada={cerrada}
                onClick={() => !cerrada && onEditar(c, f)}
              />
            ))}

            <td className="px-3 py-1.5 text-right">
              <span
                className={`cifra text-[13px] font-semibold ${
                  extra > 0 ? 'text-[var(--error)]' : 'text-[var(--texto)]'
                }`}
              >
                {horas(hs * 60)}
              </span>
              {extra > 0 && (
                <span className="cifra ml-1 text-[11px] text-[var(--error)]">
                  +{horas(extra * 60)}
                </span>
              )}
            </td>
          </tr>
        )
      })}
    </>
  )
}

const ABREVIA_AUSENCIA: Record<string, string> = {
  incapacidad: 'Incapacidad',
  permiso_remunerado: 'Permiso',
  permiso_no_remunerado: 'Permiso',
  ausencia_injustificada: 'Ausencia',
  vacaciones: 'Vacaciones',
  licencia: 'Licencia',
}

function Celda({
  bloques,
  ausencia,
  color,
  cerrada,
  onClick,
}: {
  bloques: Turno[]
  ausencia?: Ausencia
  color: string | null
  cerrada: boolean
  onClick: () => void
}) {
  const vacia = bloques.length === 0

  // Un dia vacio por ausencia se distingue de un descanso normal
  if (vacia && ausencia) {
    return (
      <td className="px-1 py-1 align-middle">
        <button
          onClick={onClick}
          disabled={cerrada}
          title={`${ABREVIA_AUSENCIA[ausencia.tipo] ?? ausencia.tipo}${
            ausencia.descripcion ? ` · ${ausencia.descripcion}` : ''
          }`}
          className={`w-full rounded-md border border-dashed border-[var(--alerta)]/40 bg-[var(--alerta-fondo)] px-1.5 py-1 text-center transition ${
            cerrada ? 'cursor-default' : 'cursor-pointer hover:brightness-95'
          }`}
        >
          <span className="block text-[10px] font-medium leading-tight text-[var(--alerta)]">
            {ABREVIA_AUSENCIA[ausencia.tipo] ?? 'Ausencia'}
          </span>
        </button>
      </td>
    )
  }

  return (
    <td className="px-1 py-1 align-middle">
      <button
        onClick={onClick}
        disabled={cerrada}
        className={`w-full rounded-md px-1.5 py-1 text-center transition ${
          vacia
            ? 'text-[var(--texto-tenue)] hover:bg-[var(--superficie-alt)]'
            : 'text-white hover:brightness-105'
        } ${cerrada ? 'cursor-default' : 'cursor-pointer'}`}
        style={vacia ? undefined : { background: color ?? 'var(--texto-suave)' }}
      >
        {vacia ? (
          <span className="text-xs">·</span>
        ) : (
          <span className="block leading-tight">
            {bloques.map((b) => (
              <span key={b.id} className="cifra block text-[11px] font-medium">
                {hhmm(b.hora_inicio)} – {hhmm(b.hora_fin)}
              </span>
            ))}
            <span className="block text-[10px] opacity-80">
              {bloques.length > 1
                ? 'Partido'
                : ETIQUETA_TIPO[bloques[0].tipo_turno]}
              {' · '}
              {horas(
                bloques.reduce(
                  (s, b) =>
                    s + (b.duracion_minutos ?? duracionMinutos(b.hora_inicio, b.hora_fin)),
                  0,
                ),
              )}
              h
            </span>
          </span>
        )}
      </button>
    </td>
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
