'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DIAS,
  ETIQUETA_TIPO,
  duracionMinutos,
  fechaCorta,
  hhmm,
  horas,
  sumarDias,
} from '@/lib/dominio'
import type { EstadoSemana, TipoTurno } from '@/lib/dominio'
import { copiarAforoAnterior, publicar } from './acciones'
import AforoLista from './aforo-lista'
import { tomarAviso } from './aviso-traspaso'
import EditorCelda from './editor-celda'
import PanelAlertas from './panel-alertas'
import PanelAdjuntos from './panel-adjuntos'
import PanelAusencias, { type Ausencia } from './panel-ausencias'
import NavegacionSemana from './navegacion-semana'
import Importador from './importador'

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

type Cargo = {
  id: string
  codigo: string
  nombre: string
  color: string | null
  orden: number
}

type FilaResumen = {
  colaborador_id: string
  horas_planeadas: number
  horas_extra_planeadas: number
  dias_descanso: number
  aperturas: number
  cierres: number
  turnos_partidos: number
}

type Frecuente = {
  hora_inicio: string
  hora_fin: string
  tipo_turno: TipoTurno
  minutos: number
  usos: number
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

/**
 * El aforo de una semana. Una sola pantalla para las dos formas de usarla:
 * en pantalla angosta se ve la lista por persona, en pantalla ancha la grilla
 * de siete columnas. Las dos están en el DOM y el CSS muestra una — sin
 * detección por JavaScript, que con SSR da o parpadeo o desajuste de
 * hidratación, y sin pedirle al usuario que elija una vista.
 */
export default function Aforo({
  tienda,
  semana,
  semanaAnterior,
  cargos,
  colaboradores,
  turnos,
  resumen,
  validaciones,
  adjuntos,
  ausencias,
  frecuentes,
  lecturaDisponible,
}: {
  tienda: { id: string; codigo: string; nombre: string }
  semana: {
    id: string
    fecha_inicio: string
    estado: EstadoSemana
    notas: string | null
  }
  semanaAnterior: string
  cargos: Cargo[]
  colaboradores: Colaborador[]
  turnos: Turno[]
  resumen: FilaResumen[]
  validaciones: Validacion[]
  adjuntos: Adjunto[]
  ausencias: Ausencia[]
  frecuentes: Frecuente[]
  /** Si el servidor puede leer fotos y PDF. Si no, el botón lo dice y no falla */
  lecturaDisponible: boolean
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [aviso, setAviso] = useState<{
    tipo: 'ok' | 'error'
    texto: string
  } | null>(null)
  const [celda, setCelda] = useState<{
    colaborador: Colaborador
    fecha: string
  } | null>(null)
  const [importando, setImportando] = useState(false)
  const [menu, setMenu] = useState(false)

  // Si venimos de copiar el aforo desde la pantalla vacía, el resumen de la
  // copia quedó guardado allá: se muestra acá y se descarta.
  useEffect(() => {
    const texto = tomarAviso()
    // Leer un traspaso de un solo uso al montar es justamente para lo que sirve
    // un efecto; la regla no distingue ese caso de un estado derivado mal hecho.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (texto) setAviso({ tipo: 'ok', texto })
  }, [])

  const fechas = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => sumarDias(semana.fecha_inicio, i)),
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

  const alertasPorColaborador = useMemo(() => {
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
  // Mismo predicado que usa publicar_semana en la base. Si cambia uno, el otro
  // tambien: es lo que hace que el boton diga la verdad antes de tocarlo.
  const bloqueantes = abiertas.filter((v) => v.severidad === 'bloqueante')
  const cerrada = semana.estado === 'cerrada'
  const vacia = turnos.length === 0

  const totalHoras = resumen.reduce((s, r) => s + Number(r.horas_planeadas), 0)
  const totalExtra = resumen.reduce(
    (s, r) => s + Number(r.horas_extra_planeadas),
    0,
  )

  const cargosConGente = cargos
    .map((c) => ({
      ...c,
      gente: colaboradores.filter((x) => x.cargo_id === c.id),
    }))
    .filter((c) => c.gente.length > 0)

  function accion(
    fn: () => Promise<
      { ok: true; resumen?: string } | { ok: false; error: string }
    >,
    exito: string,
  ) {
    setAviso(null)
    setMenu(false)
    iniciar(async () => {
      const r = await fn()
      if (r.ok) {
        setAviso({ tipo: 'ok', texto: r.resumen ?? exito })
        router.refresh()
      } else {
        setAviso({ tipo: 'error', texto: r.error })
      }
    })
  }

  const puedePublicar = semana.estado === 'borrador'
  const trabado = bloqueantes.length > 0

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6">
      <NavegacionSemana
        tiendaId={tienda.id}
        semana={semana.fecha_inicio}
        tienda={tienda}
        estado={semana.estado}
      />

      {/* Resumen de la semana. "Colaboradores" se esconde en pantalla angosta:
          es el dato menos accionable de los cuatro. */}
      <div className="mt-5 flex flex-wrap items-stretch gap-2 sm:gap-3">
        <div
          data-guia="metricas"
          className="flex flex-wrap items-stretch gap-2 sm:gap-3"
        >
          <Metrica
            etiqueta="Horas planeadas"
            valor={horas(totalHoras * 60)}
            sufijo="h"
          />
          <Metrica
            etiqueta="Extra planeada"
            valor={horas(totalExtra * 60)}
            sufijo="h"
            tono={totalExtra > 0 ? 'alerta' : 'neutro'}
          />
          <Metrica
            etiqueta="Colaboradores"
            valor={String(colaboradores.length)}
            oculta="hidden sm:block"
          />
          <Metrica
            ancla="metrica-alertas"
            etiqueta="Alertas abiertas"
            valor={String(abiertas.length)}
            tono={trabado ? 'error' : abiertas.length > 0 ? 'alerta' : 'ok'}
          />
        </div>

        <div className="ml-auto flex w-full items-end gap-2 sm:w-auto">
          {puedePublicar ? (
            <button
              data-guia="publicar"
              onClick={() =>
                accion(
                  () => publicar(tienda.id, semana.fecha_inicio, semana.id),
                  'Aforo publicado.',
                )
              }
              disabled={pendiente || trabado || vacia}
              // Sin `title`: reemplazaría el nombre accesible del botón por el
              // motivo, y un lector de pantalla anunciaría "primero hay que
              // resolver…" en vez de "publicar". El motivo va como texto visible
              // debajo, donde lo leen todos.
              className="flex-1 rounded-md bg-[var(--texto)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Publicar el aforo
            </button>
          ) : (
            <Link
              href={`/cronograma/${tienda.id}/${semana.fecha_inicio}/imprimir`}
              className="flex-1 rounded-md bg-[var(--texto)] px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-black sm:flex-none"
            >
              Imprimir
            </Link>
          )}

          <MenuMas
            abierto={menu}
            onAbrir={() => setMenu((x) => !x)}
            onCerrar={() => setMenu(false)}
          >
            {!cerrada && (
              <BotonMenu
                onClick={() =>
                  accion(
                    () =>
                      copiarAforoAnterior({
                        tiendaId: tienda.id,
                        semana: semana.fecha_inicio,
                        semanaId: semana.id,
                      }),
                    'Aforo copiado.',
                  )
                }
              >
                Copiar la semana del {fechaCorta(semanaAnterior)}
              </BotonMenu>
            )}

            {!cerrada && (
              <BotonMenu
                onClick={() => {
                  setMenu(false)
                  setImportando(true)
                }}
                disabled={!lecturaDisponible}
                nota={
                  lecturaDisponible
                    ? undefined
                    : 'La lectura automática todavía no está configurada'
                }
              >
                Leer un archivo
              </BotonMenu>
            )}

            {puedePublicar && (
              <EnlaceMenu
                href={`/cronograma/${tienda.id}/${semana.fecha_inicio}/imprimir`}
              >
                Imprimir
              </EnlaceMenu>
            )}
          </MenuMas>
        </div>
      </div>

      {/* Por qué no se puede publicar todavía, dicho al lado del botón y no
          debajo de veintisiete filas de tabla. */}
      {puedePublicar && (trabado || vacia) && (
        <p className="mt-2 text-xs text-[var(--texto-suave)]">
          {vacia
            ? 'Para publicar, primero cargá los turnos de la semana.'
            : `Para publicar hay que resolver ${bloqueantes.length} alerta(s). Están más abajo: se corrigen o se justifican.`}
        </p>
      )}

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

      {/* Pantalla angosta: la lista por persona */}
      <div data-guia="aforo-lista" className="mt-5 lg:hidden">
        <AforoLista
          tienda={tienda}
          semana={semana}
          cargos={cargos}
          colaboradores={colaboradores}
          turnos={turnos}
          resumen={resumen}
          frecuentes={frecuentes}
          ausencias={ausencias}
          validaciones={abiertas}
        />
      </div>

      {/* Pantalla ancha: la grilla de la semana */}
      <div data-guia="aforo-grilla" className="mt-5 hidden lg:block">
        <p className="mb-2 text-xs text-[var(--texto-suave)]">
          {cerrada
            ? 'Esta semana está cerrada: no admite cambios.'
            : 'Tocá cualquier celda para armar, cambiar o quitar el turno de ese día.'}
        </p>

        <div className="overflow-hidden rounded-[var(--radio)] border bg-[var(--superficie)] shadow-[var(--sombra)]">
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
                    alertas={alertasPorColaborador}
                    ausencias={ausenciaPorCelda}
                    cerrada={cerrada}
                    onEditar={(colaborador, fecha) =>
                      setCelda({ colaborador, fecha })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* La pregunta aparece mirando la lista —"¿y Juliana?"—, así que la salida
          tiene que estar acá y no en un menú de otra pantalla. */}
      <p data-guia="enlace-personal" className="mt-2 text-xs text-[var(--texto-suave)]">
        ¿Falta alguien, o alguien ya no trabaja acá?{' '}
        <Link
          href={`/personal/${tienda.id}`}
          className="underline underline-offset-2 hover:text-[var(--texto)]"
        >
          Administrar las personas de {tienda.codigo}
        </Link>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <PanelAlertas
            ancla="panel-alertas"
            validaciones={validaciones}
            colaboradores={colaboradores}
            tiendaId={tienda.id}
            semana={semana.fecha_inicio}
          />
          <PanelAusencias
            ancla="panel-novedades"
            ausencias={ausencias}
            colaboradores={colaboradores}
            tiendaId={tienda.id}
            semana={semana.fecha_inicio}
            cerrada={cerrada}
          />
        </div>
        <PanelAdjuntos
          ancla="panel-adjuntos"
          adjuntos={adjuntos}
          tiendaId={tienda.id}
          semanaId={semana.id}
          semana={semana.fecha_inicio}
          cerrada={cerrada}
        />
      </div>

      {importando && (
        <Importador
          tiendaId={tienda.id}
          semana={semana.fecha_inicio}
          semanaId={semana.id}
          colaboradores={colaboradores}
          onCerrar={() => setImportando(false)}
        />
      )}

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

/** Lo secundario detrás de un solo botón, para que la acción principal se vea */
function MenuMas({
  abierto,
  onAbrir,
  onCerrar,
  children,
}: {
  abierto: boolean
  onAbrir: () => void
  onCerrar: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <button
        data-guia="menu-mas"
        onClick={onAbrir}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="rounded-md border bg-[var(--superficie)] px-3 py-2.5 text-sm text-[var(--texto)] transition hover:bg-[var(--superficie-alt)]"
      >
        Más<span className="sr-only"> opciones</span>
      </button>

      {abierto && (
        <>
          {/* Cierra al tocar afuera, incluido el pulgar en el celular */}
          <button
            aria-label="Cerrar el menú"
            onClick={onCerrar}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 z-30 mt-1 w-60 overflow-hidden rounded-[var(--radio)] border bg-[var(--superficie)] py-1 shadow-[var(--sombra)]"
          >
            {children}
          </div>
        </>
      )}
    </div>
  )
}

function BotonMenu({
  onClick,
  disabled,
  nota,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  /** Por qué no está disponible, en vez de un botón muerto sin explicación */
  nota?: string
  children: React.ReactNode
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="block w-full px-3 py-2.5 text-left text-sm transition hover:bg-[var(--superficie-alt)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
    >
      {children}
      {nota && (
        <span className="mt-0.5 block text-[11px] text-[var(--texto-tenue)]">
          {nota}
        </span>
      )}
    </button>
  )
}

function EnlaceMenu({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      className="block w-full px-3 py-2.5 text-left text-sm transition hover:bg-[var(--superficie-alt)]"
    >
      {children}
    </Link>
  )
}

function FragmentoCargo({
  cargo,
  fechas,
  porCelda,
  porColaborador,
  alertas,
  ausencias,
  cerrada,
  onEditar,
}: {
  cargo: Cargo & { gente: Colaborador[] }
  fechas: string[]
  porCelda: Map<string, Turno[]>
  porColaborador: Map<string, FilaResumen>
  alertas: Map<string, Validacion[]>
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
        const misAlertas = alertas.get(c.id) ?? []
        const bloqueante = misAlertas.some((h) => h.severidad === 'bloqueante')

        return (
          <tr
            key={c.id}
            className="border-b last:border-0 hover:bg-[var(--superficie-alt)]/40"
          >
            <td className="sticky left-0 z-10 bg-[var(--superficie)] px-4 py-1.5">
              <div className="flex items-center gap-2">
                {/* El nombre primero: "07351" no le dice nada a nadie */}
                <span className="text-[13px] font-medium">
                  {c.nombre_completo}
                </span>
                {c.codigo_empleado && (
                  <span className="cifra text-[10px] text-[var(--texto-tenue)]">
                    {c.codigo_empleado}
                  </span>
                )}
                {misAlertas.length > 0 && (
                  <span
                    title={misAlertas.map((h) => h.mensaje).join('\n')}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      bloqueante
                        ? 'bg-[var(--error-fondo)] text-[var(--error)]'
                        : 'bg-[var(--alerta-fondo)] text-[var(--alerta)]'
                    }`}
                  >
                    {misAlertas.length}
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
        aria-label={
          vacia && !cerrada ? 'Cargar el turno de este día' : undefined
        }
        className={`w-full rounded-md px-1.5 py-1 text-center transition ${
          vacia
            ? 'border border-dashed border-transparent text-[var(--texto-tenue)] hover:border-[var(--borde-fuerte)] hover:bg-[var(--superficie-alt)]'
            : 'text-white hover:brightness-105'
        } ${cerrada ? 'cursor-default' : 'cursor-pointer'}`}
        style={
          vacia ? undefined : { background: color ?? 'var(--texto-suave)' }
        }
      >
        {vacia ? (
          // Un "+" tenue dice que la celda se puede tocar; un punto no dice nada
          <span className="text-xs leading-tight">{cerrada ? '·' : '+'}</span>
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
                    s +
                    (b.duracion_minutos ??
                      duracionMinutos(b.hora_inicio, b.hora_fin)),
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
  oculta,
  ancla,
}: {
  etiqueta: string
  valor: string
  sufijo?: string
  tono?: 'neutro' | 'ok' | 'alerta' | 'error'
  oculta?: string
  /** Nombre del anclaje del recorrido guiado, si esta métrica tiene un paso */
  ancla?: string
}) {
  const color = {
    neutro: 'text-[var(--texto)]',
    ok: 'text-[var(--ok)]',
    alerta: 'text-[var(--alerta)]',
    error: 'text-[var(--error)]',
  }[tono]

  return (
    <div
      data-guia={ancla}
      className={`rounded-[var(--radio)] border bg-[var(--superficie)] px-3 py-2 sm:px-4 sm:py-2.5 ${oculta ?? ''}`}
    >
      <div className="text-[11px] text-[var(--texto-suave)]">{etiqueta}</div>
      <div className={`cifra mt-0.5 text-lg font-semibold ${color}`}>
        {valor}
        {sufijo && <span className="ml-0.5 text-xs font-normal">{sufijo}</span>}
      </div>
    </div>
  )
}
