'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DIAS, horas } from '@/lib/dominio'
import {
  aplicarImportacion,
  leerArchivo,
  type FilaPropuesta,
  type Propuesta,
} from './acciones-importar'

const ACEPTA = '.jpg,.jpeg,.png,.webp,.pdf,.xlsx'
const MAX_BYTES = 10 * 1024 * 1024

export default function Importador({
  tiendaId,
  semana,
  semanaId,
  colaboradores,
  onCerrar,
}: {
  tiendaId: string
  semana: string
  semanaId: string
  colaboradores: { id: string; nombre_completo: string; codigo_empleado: string | null }[]
  onCerrar: () => void
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [leyendo, setLeyendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null)
  const [descartados, setDescartados] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  async function procesar(archivo: File) {
    setError(null)
    setPropuesta(null)

    if (archivo.size > MAX_BYTES) {
      setError('El archivo pesa más de 10 MB. Sacá la foto con menos resolución o recortala.')
      return
    }

    setLeyendo(true)
    try {
      const buffer = await archivo.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ''),
      )

      const r = await leerArchivo({
        tiendaId,
        semana,
        nombreArchivo: archivo.name,
        mime: archivo.type,
        base64,
      })

      if (!r.ok) setError(r.error)
      else setPropuesta(r.datos)
    } catch {
      setError('No se pudo procesar el archivo.')
    } finally {
      setLeyendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function cambiarColaborador(clave: string, colaboradorId: string) {
    setPropuesta((p) =>
      p
        ? {
            ...p,
            turnos: p.turnos.map((t) =>
              t.clave === clave ? { ...t, colaboradorId: colaboradorId || null } : t,
            ),
          }
        : p,
    )
  }

  function alternar(clave: string) {
    setDescartados((prev) => {
      const s = new Set(prev)
      if (s.has(clave)) s.delete(clave)
      else s.add(clave)
      return s
    })
  }

  const seleccionados =
    propuesta?.turnos.filter(
      (t) => !descartados.has(t.clave) && t.colaboradorId && !t.problema,
    ) ?? []

  function aplicar() {
    setError(null)
    iniciar(async () => {
      const r = await aplicarImportacion({
        tiendaId,
        semana,
        semanaId,
        turnos: seleccionados,
      })
      if (!r.ok) setError(r.error)
      else {
        onCerrar()
        router.refresh()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-[var(--radio)] border bg-[var(--superficie)] shadow-xl"
      >
        <header className="flex items-start gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Leer un aforo desde un archivo</h2>
            <p className="mt-0.5 text-xs text-[var(--texto-suave)]">
              Foto, PDF o Excel. Se lee automáticamente y después lo revisás antes de
              que entre.
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="ml-auto rounded-md px-2 py-1 text-sm text-[var(--texto-tenue)] transition hover:bg-[var(--superficie-alt)]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!propuesta && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={ACEPTA}
                className="hidden"
                id="importar-aforo"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) procesar(f)
                }}
              />
              <label
                htmlFor="importar-aforo"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-12 text-center transition ${
                  leyendo
                    ? 'cursor-wait text-[var(--texto-tenue)]'
                    : 'hover:border-[var(--acento)] hover:bg-[var(--superficie-alt)]'
                }`}
              >
                <span className="text-sm font-medium">
                  {leyendo ? 'Leyendo el archivo…' : 'Elegir archivo'}
                </span>
                <span className="mt-1 text-xs text-[var(--texto-suave)]">
                  {leyendo
                    ? 'Puede tardar hasta un minuto en una grilla completa.'
                    : 'JPG, PNG, WEBP, PDF o XLSX · hasta 10 MB'}
                </span>
              </label>
            </>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md bg-[var(--error-fondo)] px-3 py-2 text-xs text-[var(--error)]"
            >
              {error}
            </p>
          )}

          {propuesta && (
            <Revision
              propuesta={propuesta}
              colaboradores={colaboradores}
              descartados={descartados}
              onCambiarColaborador={cambiarColaborador}
              onAlternar={alternar}
            />
          )}
        </div>

        {propuesta && (
          <footer className="flex flex-wrap items-center gap-3 border-t px-5 py-3">
            <span className="text-xs text-[var(--texto-suave)]">
              Se van a aplicar <strong className="text-[var(--texto)]">{seleccionados.length}</strong>{' '}
              de {propuesta.turnos.length} turnos leídos
            </span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => {
                  setPropuesta(null)
                  setDescartados(new Set())
                }}
                className="rounded-md border px-3 py-2 text-sm text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
              >
                Probar otro archivo
              </button>
              <button
                onClick={aplicar}
                disabled={pendiente || seleccionados.length === 0}
                className="rounded-md bg-[var(--texto)] px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
              >
                {pendiente ? 'Aplicando…' : `Aplicar ${seleccionados.length} turnos`}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

function Revision({
  propuesta,
  colaboradores,
  descartados,
  onCambiarColaborador,
  onAlternar,
}: {
  propuesta: Propuesta
  colaboradores: { id: string; nombre_completo: string; codigo_empleado: string | null }[]
  descartados: Set<string>
  onCambiarColaborador: (clave: string, id: string) => void
  onAlternar: (clave: string) => void
}) {
  const { resumen } = propuesta

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Chip etiqueta="Leídos" valor={resumen.total} />
        <Chip etiqueta="Sin dudas" valor={resumen.listos} tono="ok" />
        {resumen.dudosos > 0 && (
          <Chip etiqueta="Para revisar" valor={resumen.dudosos} tono="alerta" />
        )}
        {resumen.sinColaborador > 0 && (
          <Chip etiqueta="Sin colaborador" valor={resumen.sinColaborador} tono="error" />
        )}
      </div>

      {propuesta.advertencias.length > 0 && (
        <div className="mt-3 rounded-md bg-[var(--alerta-fondo)] px-3 py-2.5">
          <p className="text-[11px] font-semibold text-[var(--alerta)]">
            Lo que no se pudo leer con certeza
          </p>
          <ul className="mt-1 space-y-0.5">
            {propuesta.advertencias.map((a, i) => (
              <li key={i} className="text-[11px] text-[var(--alerta)]">
                · {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {resumen.sinColaborador > 0 && (
        <p className="mt-3 rounded-md bg-[var(--info-fondo)] px-3 py-2 text-[11px] text-[var(--info)]">
          Hay nombres que no coinciden con ningún colaborador de la tienda. Asignalos a
          mano abajo, o dejalos sin asignar y no se van a aplicar.
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[var(--superficie-alt)] text-[11px] text-[var(--texto-suave)]">
              <th className="w-8 px-2 py-2"></th>
              <th className="px-3 py-2 text-left font-semibold">Leído</th>
              <th className="px-3 py-2 text-left font-semibold">Colaborador</th>
              <th className="px-3 py-2 text-left font-semibold">Día</th>
              <th className="px-3 py-2 text-left font-semibold">Horario</th>
              <th className="px-3 py-2 text-right font-semibold">Horas</th>
            </tr>
          </thead>
          <tbody>
            {propuesta.turnos.map((t) => (
              <Fila
                key={t.clave}
                t={t}
                colaboradores={colaboradores}
                descartado={descartados.has(t.clave)}
                onCambiarColaborador={onCambiarColaborador}
                onAlternar={onAlternar}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Fila({
  t,
  colaboradores,
  descartado,
  onCambiarColaborador,
  onAlternar,
}: {
  t: FilaPropuesta
  colaboradores: { id: string; nombre_completo: string; codigo_empleado: string | null }[]
  descartado: boolean
  onCambiarColaborador: (clave: string, id: string) => void
  onAlternar: (clave: string) => void
}) {
  const aplicable = Boolean(t.colaboradorId) && !t.problema
  const atencion = t.problema || t.confianza !== 'alta' || !t.colaboradorId

  return (
    <tr
      className={`border-b last:border-0 ${descartado ? 'opacity-40' : ''} ${
        atencion ? 'bg-[var(--alerta-fondo)]/40' : ''
      }`}
    >
      <td className="px-2 py-1.5 text-center">
        <input
          type="checkbox"
          checked={!descartado && aplicable}
          disabled={!aplicable}
          onChange={() => onAlternar(t.clave)}
          className="accent-[var(--texto)]"
          aria-label={`Incluir turno de ${t.colaboradorLeido}`}
        />
      </td>

      <td className="px-3 py-1.5">
        <span className="text-[13px]">{t.colaboradorLeido}</span>
        {t.cargoLeido && (
          <span className="ml-1.5 text-[10px] text-[var(--texto-tenue)]">{t.cargoLeido}</span>
        )}
        {t.confianza !== 'alta' && (
          <span
            className="ml-1.5 rounded px-1 py-0.5 text-[9px] font-semibold uppercase text-[var(--alerta)]"
            title="El modelo no leyó este turno con total certeza"
          >
            {t.confianza === 'baja' ? 'dudoso' : 'revisar'}
          </span>
        )}
        {t.problema && (
          <span className="mt-0.5 block text-[10px] text-[var(--error)]">{t.problema}</span>
        )}
      </td>

      <td className="px-3 py-1.5">
        <select
          value={t.colaboradorId ?? ''}
          onChange={(e) => onCambiarColaborador(t.clave, e.target.value)}
          className={`w-full rounded border bg-white px-1.5 py-1 text-xs outline-none focus:border-[var(--acento)] ${
            t.colaboradorId ? '' : 'border-[var(--error)]/40'
          }`}
        >
          <option value="">— sin asignar —</option>
          {colaboradores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre_completo}{c.codigo_empleado && ` · ${c.codigo_empleado}`}
            </option>
          ))}
        </select>
      </td>

      <td className="px-3 py-1.5 text-xs">{DIAS[t.dia - 1]}</td>

      <td className="cifra px-3 py-1.5 text-xs">
        {t.bloques.map((b, i) => (
          <span key={i} className="block">
            {b.inicio} – {b.fin}
          </span>
        ))}
      </td>

      <td className="cifra px-3 py-1.5 text-right text-xs">
        {t.minutos > 0 ? `${horas(t.minutos)} h` : '—'}
      </td>
    </tr>
  )
}

function Chip({
  etiqueta,
  valor,
  tono = 'neutro',
}: {
  etiqueta: string
  valor: number
  tono?: 'neutro' | 'ok' | 'alerta' | 'error'
}) {
  const clase = {
    neutro: 'bg-[var(--superficie-alt)] text-[var(--texto-suave)]',
    ok: 'bg-[var(--ok-fondo)] text-[var(--ok)]',
    alerta: 'bg-[var(--alerta-fondo)] text-[var(--alerta)]',
    error: 'bg-[var(--error-fondo)] text-[var(--error)]',
  }[tono]

  return (
    <span className={`rounded-md px-2.5 py-1 text-xs ${clase}`}>
      <strong className="cifra">{valor}</strong> {etiqueta}
    </span>
  )
}
