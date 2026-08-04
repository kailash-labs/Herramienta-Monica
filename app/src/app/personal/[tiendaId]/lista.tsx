'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fechaCorta } from '@/lib/dominio'
import type { Database } from '@/lib/supabase/database.types'
import {
  eliminarPersona,
  guardarPersona,
  reincorporarPersona,
  retirarPersona,
} from './acciones'

type TipoJornada = Database['public']['Enums']['tipo_jornada']

export type Persona = {
  id: string
  nombre_completo: string
  codigo_empleado: string | null
  documento: string | null
  cargo_id: string
  tipo_jornada: TipoJornada
  horas_contrato: number
  fecha_ingreso: string | null
  fecha_retiro: string | null
  activo: boolean
}

type Cargo = {
  id: string
  codigo: string
  nombre: string
  color: string | null
  orden: number
}

const JORNADAS: { valor: TipoJornada; etiqueta: string; horas: number }[] = [
  { valor: 'completa', etiqueta: 'Tiempo completo', horas: 42 },
  { valor: 'medio_tiempo', etiqueta: 'Medio tiempo', horas: 21 },
  { valor: 'aprendiz', etiqueta: 'Aprendiz', horas: 36 },
  { valor: 'temporal', etiqueta: 'Temporal', horas: 42 },
]

function etiquetaJornada(j: TipoJornada) {
  return JORNADAS.find((x) => x.valor === j)?.etiqueta ?? j
}

/**
 * La gente de una tienda: quién está, quién entra y quién se fue.
 *
 * La decisión que ordena toda la pantalla: **quien trabajó no se borra, se
 * retira**. Sus turnos y su nómina son historia que el consolidado necesita para
 * seguir cuadrando dentro de un año. Borrar de verdad solo aparece donde no hay
 * nada que perder: alguien cargado por error, sin un turno cargado.
 */
export default function ListaPersonal({
  tienda,
  cargos,
  gente,
  conHistorial,
  semanaActual,
  esCoordinador,
}: {
  tienda: { id: string; codigo: string; nombre: string; ciudad: string | null }
  cargos: Cargo[]
  gente: Persona[]
  /** Ids con turnos, novedades o nómina: para esos, borrar no es una opción */
  conHistorial: string[]
  /** Para volver al aforo de la semana en curso */
  semanaActual: string
  esCoordinador: boolean
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(
    null,
  )
  const [editando, setEditando] = useState<Persona | 'nueva' | null>(null)
  const [retirando, setRetirando] = useState<Persona | null>(null)
  const [borrando, setBorrando] = useState<Persona | null>(null)
  const [verRetirados, setVerRetirados] = useState(false)

  const historial = useMemo(() => new Set(conHistorial), [conHistorial])

  // Un error mientras hay un diálogo abierto tiene que leerse **adentro** del
  // diálogo: si se pinta en la página, el propio modal lo tapa y la pantalla
  // parece no haber hecho nada. El éxito sí va afuera, porque el diálogo cierra.
  const errorEnDialogo = aviso?.tipo === 'error' ? aviso.texto : null

  const activos = gente.filter((p) => p.activo)
  const retirados = gente.filter((p) => !p.activo)

  const porCargo = cargos
    .map((c) => ({ ...c, gente: activos.filter((p) => p.cargo_id === c.id) }))
    .filter((c) => c.gente.length > 0)

  function accion(fn: () => Promise<{ ok: true; resumen?: string } | { ok: false; error: string }>) {
    setAviso(null)
    iniciar(async () => {
      const r = await fn()
      if (r.ok) {
        setAviso({ tipo: 'ok', texto: r.resumen ?? 'Listo.' })
        setRetirando(null)
        setBorrando(null)
        setEditando(null)
        router.refresh()
      } else {
        setAviso({ tipo: 'error', texto: r.error })
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-base font-semibold tracking-tight">
            Personas de {tienda.codigo}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--texto-suave)]">
            {tienda.nombre}
            {' · '}
            {activos.length} {activos.length === 1 ? 'persona' : 'personas'} en el
            aforo
          </p>
        </div>

        <button
          data-guia="agregar-persona"
          onClick={() => setEditando('nueva')}
          className="rounded-md bg-[var(--texto)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black"
        >
          Agregar persona
        </button>
      </div>

      <p className="mt-3 text-xs text-[var(--texto-suave)]">
        Quien está en esta lista aparece en el aforo de todas las semanas.{' '}
        <Link
          href={`/cronograma/${tienda.id}/${semanaActual}`}
          className="underline underline-offset-2 hover:text-[var(--texto)]"
        >
          Volver al aforo
        </Link>
      </p>

      {aviso && !(errorEnDialogo && (editando || retirando || borrando)) && (
        <p
          role="status"
          className={`mt-4 rounded-md px-3 py-2 text-xs ${
            aviso.tipo === 'ok'
              ? 'bg-[var(--ok-fondo)] text-[var(--ok)]'
              : 'bg-[var(--error-fondo)] text-[var(--error)]'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <div data-guia="lista-personas" className="mt-5 space-y-5">
        {/* Las tarjetas no llevan `overflow-hidden`: el menú de cada fila se abre
            hacia afuera y quedaría cortado. Las esquinas se redondean en el
            encabezado, que es lo único que pinta fondo propio. */}
        {porCargo.map((c) => (
          <section
            key={c.id}
            className="rounded-[var(--radio)] border bg-[var(--superficie)] shadow-[var(--sombra)]"
          >
            <header className="flex items-center gap-2 rounded-t-[var(--radio)] border-b bg-[var(--superficie-alt)]/60 px-4 py-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: c.color ?? 'var(--borde-fuerte)' }}
              />
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--texto-suave)]">
                {c.nombre}
              </h2>
            </header>

            <ul className="divide-y">
              {c.gente.map((p) => (
                <Fila
                  key={p.id}
                  persona={p}
                  puedeBorrar={esCoordinador && !historial.has(p.id)}
                  onEditar={() => setEditando(p)}
                  onRetirar={() => setRetirando(p)}
                  onBorrar={() => setBorrando(p)}
                />
              ))}
            </ul>
          </section>
        ))}

        {activos.length === 0 && (
          <p className="rounded-[var(--radio)] border border-dashed px-4 py-10 text-center text-sm text-[var(--texto-suave)]">
            Todavía no hay nadie cargado en esta tienda. Agregá la primera persona
            y va a aparecer en el aforo.
          </p>
        )}
      </div>

      {/* Quien ya no está queda detrás de un toque: es consulta, no trabajo */}
      {retirados.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setVerRetirados((x) => !x)}
            aria-expanded={verRetirados}
            className="text-xs text-[var(--texto-suave)] underline underline-offset-2 transition hover:text-[var(--texto)]"
          >
            {verRetirados ? 'Ocultar' : 'Ver'} a quienes ya no están (
            {retirados.length})
          </button>

          {verRetirados && (
            <ul className="mt-3 divide-y overflow-hidden rounded-[var(--radio)] border bg-[var(--superficie)]">
              {retirados.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
                >
                  <span className="text-[13px] font-medium text-[var(--texto-suave)]">
                    {p.nombre_completo}
                  </span>
                  <span className="text-[11px] text-[var(--texto-tenue)]">
                    {p.fecha_retiro
                      ? `Retirada el ${fechaCorta(p.fecha_retiro)}`
                      : 'Inactiva'}
                  </span>
                  <button
                    onClick={() =>
                      accion(() => reincorporarPersona(tienda.id, p.id))
                    }
                    disabled={pendiente}
                    className="ml-auto rounded border px-2 py-1 text-[11px] text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)] disabled:opacity-40"
                  >
                    Volver a activar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editando && (
        <FormularioPersona
          tiendaId={tienda.id}
          cargos={cargos}
          persona={editando === 'nueva' ? null : editando}
          pendiente={pendiente}
          error={errorEnDialogo}
          onGuardar={(datos) => accion(() => guardarPersona(datos))}
          onCerrar={() => setEditando(null)}
        />
      )}

      {retirando && (
        <DialogoRetiro
          persona={retirando}
          pendiente={pendiente}
          error={errorEnDialogo}
          onConfirmar={(fecha) =>
            accion(() => retirarPersona(tienda.id, retirando.id, fecha))
          }
          onCerrar={() => setRetirando(null)}
        />
      )}

      {borrando && (
        <DialogoBorrar
          persona={borrando}
          pendiente={pendiente}
          error={errorEnDialogo}
          onConfirmar={() => accion(() => eliminarPersona(tienda.id, borrando.id))}
          onCerrar={() => setBorrando(null)}
        />
      )}
    </div>
  )
}

function Fila({
  persona,
  puedeBorrar,
  onEditar,
  onRetirar,
  onBorrar,
}: {
  persona: Persona
  puedeBorrar: boolean
  onEditar: () => void
  onRetirar: () => void
  onBorrar: () => void
}) {
  const [menu, setMenu] = useState(false)

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-[13px] font-medium">
          {persona.nombre_completo}
          {persona.codigo_empleado && (
            <span className="cifra text-[10px] font-normal text-[var(--texto-tenue)]">
              {persona.codigo_empleado}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--texto-suave)]">
          {etiquetaJornada(persona.tipo_jornada)}
          {' · '}
          <span className="cifra">{Number(persona.horas_contrato)}</span> h por
          semana
          {persona.fecha_ingreso &&
            ` · desde el ${fechaCorta(persona.fecha_ingreso)}`}
        </p>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={() => setMenu((x) => !x)}
          aria-expanded={menu}
          aria-haspopup="menu"
          aria-label={`Opciones de ${persona.nombre_completo}`}
          className="rounded-md border px-2.5 py-1.5 text-xs text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
        >
          ···
        </button>

        {menu && (
          <>
            <button
              aria-label="Cerrar el menú"
              onClick={() => setMenu(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <div
              role="menu"
              className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-[var(--radio)] border bg-[var(--superficie)] py-1 text-left shadow-[var(--sombra)]"
            >
              <Opcion
                onClick={() => {
                  setMenu(false)
                  onEditar()
                }}
              >
                Corregir los datos
              </Opcion>
              <Opcion
                onClick={() => {
                  setMenu(false)
                  onRetirar()
                }}
                nota="Sale del aforo y se conserva lo que trabajó"
              >
                Ya no trabaja acá
              </Opcion>
              {puedeBorrar && (
                <Opcion
                  onClick={() => {
                    setMenu(false)
                    onBorrar()
                  }}
                  nota="Todavía no tiene nada cargado"
                  tono="error"
                >
                  La cargué por error
                </Opcion>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  )
}

function Opcion({
  onClick,
  nota,
  tono,
  children,
}: {
  onClick: () => void
  nota?: string
  tono?: 'error'
  children: React.ReactNode
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-[var(--superficie-alt)] ${
        tono === 'error' ? 'text-[var(--error)]' : ''
      }`}
    >
      {children}
      {nota && (
        <span className="mt-0.5 block text-[11px] font-normal text-[var(--texto-tenue)]">
          {nota}
        </span>
      )}
    </button>
  )
}

/** El error de la última acción, para que se lea sin cerrar el diálogo */
function AvisoError({ texto }: { texto: string | null }) {
  if (!texto) return null
  return (
    <p
      role="alert"
      className="mt-4 rounded-md bg-[var(--error-fondo)] px-3 py-2 text-xs leading-relaxed text-[var(--error)]"
    >
      {texto}
    </p>
  )
}

function FormularioPersona({
  tiendaId,
  cargos,
  persona,
  pendiente,
  error,
  onGuardar,
  onCerrar,
}: {
  tiendaId: string
  cargos: Cargo[]
  /** null = alta */
  persona: Persona | null
  pendiente: boolean
  error: string | null
  onGuardar: (datos: {
    tiendaId: string
    id: string | null
    nombre: string
    cargoId: string
    tipoJornada: TipoJornada
    horasContrato: number | null
    codigo: string
    documento: string
    fechaIngreso: string
  }) => void
  onCerrar: () => void
}) {
  const [nombre, setNombre] = useState(persona?.nombre_completo ?? '')
  const [cargoId, setCargoId] = useState(persona?.cargo_id ?? cargos[0]?.id ?? '')
  const [jornada, setJornada] = useState<TipoJornada>(
    persona?.tipo_jornada ?? 'completa',
  )
  const [codigo, setCodigo] = useState(persona?.codigo_empleado ?? '')
  const [documento, setDocumento] = useState(persona?.documento ?? '')
  const [ingreso, setIngreso] = useState(persona?.fecha_ingreso ?? '')
  // Las horas se derivan de la jornada mientras nadie las toque. Escribir "42"
  // en cada alta es reescribir un dato que la jornada ya dice.
  const [horas, setHoras] = useState<string>(
    persona ? String(Number(persona.horas_contrato)) : '',
  )

  const horasPorJornada =
    JORNADAS.find((j) => j.valor === jornada)?.horas ?? 42
  const horasEfectivas = horas === '' ? horasPorJornada : Number(horas)
  const horasRaras =
    horas !== '' && (!Number.isFinite(horasEfectivas) || horasEfectivas <= 0 || horasEfectivas > 60)

  return (
    <Modal
      titulo={persona ? 'Corregir los datos' : 'Agregar una persona'}
      onCerrar={onCerrar}
    >
      <label className="block text-[11px] text-[var(--texto-suave)]">
        Nombre y apellido
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
          placeholder="Marta Gómez"
          className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
        />
      </label>

      <label className="mt-3 block text-[11px] text-[var(--texto-suave)]">
        Cargo
        <select
          value={cargoId}
          onChange={(e) => setCargoId(e.target.value)}
          className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
        >
          {cargos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block text-[11px] text-[var(--texto-suave)]">
          Jornada
          <select
            value={jornada}
            onChange={(e) => setJornada(e.target.value as TipoJornada)}
            className="mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
          >
            {JORNADAS.map((j) => (
              <option key={j.valor} value={j.valor}>
                {j.etiqueta}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[11px] text-[var(--texto-suave)]">
          Horas por semana
          <input
            type="number"
            inputMode="decimal"
            min={1}
            max={60}
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            placeholder={String(horasPorJornada)}
            className={`cifra mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)] ${
              horasRaras ? 'border-[var(--error)]/50' : ''
            }`}
          />
        </label>
      </div>

      {/* Por qué importa el número: es contra esto que se calcula la hora extra */}
      <p className="mt-1.5 text-[11px] text-[var(--texto-tenue)]">
        La hora extra se cuenta contra estas horas, no contra 42 fijas. Si lo
        dejás vacío, {etiquetaJornada(jornada).toLowerCase()} son{' '}
        {horasPorJornada} h.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block text-[11px] text-[var(--texto-suave)]">
          Código de empleado
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="07351"
            className="cifra mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
          />
        </label>

        <label className="block text-[11px] text-[var(--texto-suave)]">
          Entró el
          <input
            type="date"
            value={ingreso}
            onChange={(e) => setIngreso(e.target.value)}
            className="cifra mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
          />
        </label>
      </div>

      <p className="mt-1.5 text-[11px] text-[var(--texto-tenue)]">
        El código es con el que viene en el reporte de nómina: sin él, sus horas
        extra no se pueden comparar contra lo que se pagó.
      </p>

      <label className="mt-3 block text-[11px] text-[var(--texto-suave)]">
        Documento (opcional)
        <input
          type="text"
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          className="cifra mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
        />
      </label>

      <AvisoError texto={error} />

      <button
        onClick={() =>
          onGuardar({
            tiendaId,
            id: persona?.id ?? null,
            nombre,
            cargoId,
            tipoJornada: jornada,
            horasContrato: horas === '' ? null : Number(horas),
            codigo,
            documento,
            fechaIngreso: ingreso,
          })
        }
        disabled={pendiente || !nombre.trim() || !cargoId || horasRaras}
        className="mt-5 w-full rounded-md bg-[var(--texto)] px-3 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pendiente ? 'Guardando…' : persona ? 'Guardar los cambios' : 'Agregar al aforo'}
      </button>
    </Modal>
  )
}

function DialogoRetiro({
  persona,
  pendiente,
  error,
  onConfirmar,
  onCerrar,
}: {
  persona: Persona
  pendiente: boolean
  error: string | null
  onConfirmar: (fecha: string) => void
  onCerrar: () => void
}) {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))

  return (
    <Modal titulo={`${persona.nombre_completo} ya no trabaja acá`} onCerrar={onCerrar}>
      <p className="text-[13px] leading-relaxed text-[var(--texto-suave)]">
        Deja de aparecer en el aforo desde el día siguiente. Todo lo que trabajó
        —turnos, novedades y nómina— se conserva: es lo que hace que el
        consolidado de los meses anteriores siga cuadrando.
      </p>

      <label className="mt-4 block text-[11px] text-[var(--texto-suave)]">
        Último día que trabajó
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="cifra mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
        />
      </label>

      <p className="mt-2 rounded-md bg-[var(--alerta-fondo)] px-3 py-2 text-[11px] leading-relaxed text-[var(--alerta)]">
        Los turnos que tenga cargados después de esa fecha se liberan. Si esa
        semana ya estaba publicada, van a quedar días sin cubrir: revisalos.
      </p>

      <AvisoError texto={error} />

      <button
        onClick={() => onConfirmar(fecha)}
        disabled={pendiente || !fecha}
        className="mt-5 w-full rounded-md bg-[var(--texto)] px-3 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pendiente ? 'Guardando…' : 'Marcar el retiro'}
      </button>
    </Modal>
  )
}

function DialogoBorrar({
  persona,
  pendiente,
  error,
  onConfirmar,
  onCerrar,
}: {
  persona: Persona
  pendiente: boolean
  error: string | null
  onConfirmar: () => void
  onCerrar: () => void
}) {
  return (
    <Modal titulo="Borrar de la herramienta" onCerrar={onCerrar}>
      <p className="text-[13px] leading-relaxed text-[var(--texto-suave)]">
        Se borra a <strong className="text-[var(--texto)]">{persona.nombre_completo}</strong>{' '}
        por completo. Esto es para alguien cargado por error: no tiene ni un
        turno, ni una novedad, ni un movimiento de nómina, así que no hay nada
        que se pierda.
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--texto-suave)]">
        Si en realidad trabajó y se fue, cerrá esto y usá «Ya no trabaja acá».
      </p>

      <AvisoError texto={error} />

      <button
        onClick={onConfirmar}
        disabled={pendiente}
        className="mt-5 w-full rounded-md bg-[var(--error)] px-3 py-2 text-sm font-medium text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pendiente ? 'Borrando…' : `Borrar a ${persona.nombre_completo}`}
      </button>
    </Modal>
  )
}

function Modal({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string
  onCerrar: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[var(--radio)] border bg-[var(--superficie)] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-sm font-semibold">{titulo}</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-md px-2 py-1 text-sm text-[var(--texto-tenue)] transition hover:bg-[var(--superficie-alt)]"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
