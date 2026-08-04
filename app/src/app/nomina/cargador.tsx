'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { borrarReporte, cargarReporte, type FilaCruda } from './acciones'

type Concepto = {
  id: string
  codigo: string
  nombre: string
  cuenta_como_extra: boolean
  cuenta_como_recargo: boolean
  incluir_en_conciliacion: boolean
}

/** Detecta el separador mirando la primera linea: Excel en es-CO suele exportar con ; */
function separador(linea: string): string {
  const punto = (linea.match(/;/g) ?? []).length
  const coma = (linea.match(/,/g) ?? []).length
  const tab = (linea.match(/\t/g) ?? []).length
  if (tab >= punto && tab >= coma) return '\t'
  return punto >= coma ? ';' : ','
}

function partir(linea: string, sep: string): string[] {
  const salida: string[] = []
  let actual = ''
  let entreComillas = false

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]
    if (c === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"'
        i++
      } else entreComillas = !entreComillas
    } else if (c === sep && !entreComillas) {
      salida.push(actual)
      actual = ''
    } else actual += c
  }
  salida.push(actual)
  return salida.map((s) => s.trim().replace(/^"|"$/g, ''))
}

/**
 * Numeros del reporte a number. El caso peligroso es '450.000': en formato
 * colombiano son 450 mil, no 450. Se distingue por la forma: grupos de
 * exactamente tres digitos son separador de miles; cualquier otra cosa es
 * decimal.
 */
export function aNumero(texto: string): number {
  const limpio = texto.replace(/[^\d,.-]/g, '').trim()
  if (!limpio) return 0

  const negativo = limpio.startsWith('-')
  const cuerpo = negativo ? limpio.slice(1) : limpio

  const tieneComa = cuerpo.includes(',')
  const tienePunto = cuerpo.includes('.')

  let normal: string
  if (tieneComa && tienePunto) {
    // El separador decimal es el ultimo que aparece
    normal =
      cuerpo.lastIndexOf(',') > cuerpo.lastIndexOf('.')
        ? cuerpo.replace(/\./g, '').replace(',', '.')
        : cuerpo.replace(/,/g, '')
  } else if (tienePunto) {
    normal = /^\d{1,3}(\.\d{3})+$/.test(cuerpo)
      ? cuerpo.replace(/\./g, '') // 450.000 -> 450000
      : cuerpo //  180.5 -> 180.5
  } else if (tieneComa) {
    normal = /^\d{1,3}(,\d{3})+$/.test(cuerpo)
      ? cuerpo.replace(/,/g, '') // 450,000 -> 450000
      : cuerpo.replace(',', '.') //      9,0 -> 9.0
  } else {
    normal = cuerpo
  }

  const n = Number(normal)
  if (!Number.isFinite(n)) return 0
  return negativo ? -n : n
}

const ALIAS = {
  empleado: ['codigo_empleado', 'codigo empleado', 'cedula', 'documento', 'empleado', 'codigo'],
  nombre: ['nombre', 'nombre_completo', 'colaborador'],
  concepto: ['codigo_concepto', 'concepto', 'codigo concepto', 'cod_concepto'],
  cantidad: ['cantidad', 'horas', 'cant'],
  valor: ['valor', 'total', 'monto'],
}

function indiceDe(encabezados: string[], alias: string[]): number {
  const norm = encabezados.map((h) =>
    h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(),
  )
  for (const a of alias) {
    const i = norm.indexOf(a)
    if (i >= 0) return i
  }
  return -1
}

export default function CargadorNomina({
  tiendas,
  conceptos,
  reportes,
  sinMatch,
}: {
  tiendas: { id: string; codigo: string; nombre: string }[]
  conceptos: Concepto[]
  reportes: {
    id: string
    periodo: string
    archivo_nombre: string | null
    estado: string
    filas_totales: number
    filas_con_match: number
  }[]
  sinMatch: {
    id: string
    codigo_empleado_origen: string | null
    codigo_concepto_origen: string | null
    cantidad: number
    estado_match: string
  }[]
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [tiendaId, setTiendaId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [resumen, setResumen] = useState<string | null>(null)
  // Qué reporte está esperando confirmación de borrado: es en cascada y no
  // tiene deshacer, así que es el único de la app que se pregunta dos veces.
  const [porBorrar, setPorBorrar] = useState<string | null>(null)

  async function procesar(archivo: File) {
    setError(null)
    setResumen(null)

    const texto = await archivo.text()
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim())

    if (lineas.length < 2) {
      setError('El archivo está vacío o solo tiene encabezados.')
      return
    }

    const sep = separador(lineas[0])
    const encabezados = partir(lineas[0], sep)

    const iEmp = indiceDe(encabezados, ALIAS.empleado)
    const iCon = indiceDe(encabezados, ALIAS.concepto)
    const iCant = indiceDe(encabezados, ALIAS.cantidad)
    const iVal = indiceDe(encabezados, ALIAS.valor)
    const iNom = indiceDe(encabezados, ALIAS.nombre)

    if (iEmp < 0 || iCon < 0) {
      setError(
        `No encuentro las columnas de empleado y concepto. Encabezados leídos: ${encabezados.join(', ')}`,
      )
      return
    }

    const filas: FilaCruda[] = []
    for (let i = 1; i < lineas.length; i++) {
      const c = partir(lineas[i], sep)
      const codigoEmpleado = c[iEmp] ?? ''
      const codigoConcepto = c[iCon] ?? ''
      if (!codigoEmpleado && !codigoConcepto) continue

      filas.push({
        codigoEmpleado,
        nombre: iNom >= 0 ? c[iNom] : undefined,
        codigoConcepto,
        cantidad: iCant >= 0 ? aNumero(c[iCant] ?? '') : 0,
        valor: iVal >= 0 ? aNumero(c[iVal] ?? '') : 0,
        fila: i + 1,
      })
    }

    iniciar(async () => {
      const r = await cargarReporte({
        anio,
        mes,
        tiendaId: tiendaId || null,
        archivoNombre: archivo.name,
        filas,
      })

      if (!r.ok) {
        setError(r.error)
        return
      }

      const { total, cruzadas, sinColaborador, sinConcepto } = r.resumen
      setResumen(
        `${total} filas leídas · ${cruzadas} comparadas` +
          (sinColaborador ? ` · ${sinColaborador} sin colaborador` : '') +
          (sinConcepto ? ` · ${sinConcepto} sin concepto` : ''),
      )
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    })
  }

  const enConciliacion = conceptos.filter((c) => c.incluir_en_conciliacion)

  return (
    <>
      <section
        data-guia="nomina-cargar"
        className="mt-5 rounded-[var(--radio)] border bg-[var(--superficie)] p-5 shadow-[var(--sombra)]"
      >
        <h2 className="text-sm font-semibold">Cargar el reporte del mes</h2>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-[11px] text-[var(--texto-suave)]">
            Año
            <input
              type="number"
              value={anio}
              min={2020}
              max={2100}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="cifra mt-1 block w-24 rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
            />
          </label>

          <label className="text-[11px] text-[var(--texto-suave)]">
            Mes
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="mt-1 block rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[11px] text-[var(--texto-suave)]">
            Tienda
            <select
              value={tiendaId}
              onChange={(e) => setTiendaId(e.target.value)}
              className="mt-1 block rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--acento)]"
            >
              <option value="">Todas (el archivo trae varias)</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.codigo} · {t.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="ml-auto">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,text/csv"
              className="hidden"
              id="subir-nomina"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) procesar(f)
              }}
            />
            <label
              htmlFor="subir-nomina"
              className="inline-block cursor-pointer rounded-md bg-[var(--texto)] px-3 py-2 text-sm font-medium text-white transition hover:bg-black"
            >
              {pendiente ? 'Procesando…' : 'Elegir archivo CSV'}
            </label>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-[var(--texto-tenue)]">
          CSV con columnas de código de empleado, código de concepto, cantidad y
          valor. Reconoce separador coma, punto y coma o tabulación, y números en
          formato colombiano. Si el reporte llega en Excel, guardalo como CSV.
        </p>

        {resumen && (
          <p className="mt-3 rounded-md bg-[var(--ok-fondo)] px-3 py-2 text-xs text-[var(--ok)]">
            {resumen}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-md bg-[var(--error-fondo)] px-3 py-2 text-xs text-[var(--error)]">
            {error}
          </p>
        )}
      </section>

      {sinMatch.length > 0 && (
        <section className="mt-6 rounded-[var(--radio)] border border-[var(--alerta)]/30 bg-[var(--superficie)] shadow-[var(--sombra)]">
          <header className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--alerta)]">
              {sinMatch.length} movimiento{sinMatch.length > 1 ? 's' : ''} sin comparar
            </h2>
            <p className="mt-0.5 text-xs text-[var(--texto-suave)]">
              Quedaron guardados pero fuera de la comparación. Suele ser un
              código de empleado nuevo o un concepto que falta dar de alta.
            </p>
          </header>
          <div className="scroll-x">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b bg-[var(--superficie-alt)] text-xs text-[var(--texto-suave)]">
                  <th className="px-4 py-2 text-left font-semibold">Empleado</th>
                  <th className="px-4 py-2 text-left font-semibold">Concepto</th>
                  <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                  <th className="px-4 py-2 text-left font-semibold">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {sinMatch.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-4 py-1.5 text-[13px]">{m.codigo_empleado_origen ?? '—'}</td>
                    <td className="px-4 py-1.5 text-[13px]">{m.codigo_concepto_origen ?? '—'}</td>
                    <td className="cifra px-3 py-1.5 text-right">{Number(m.cantidad).toFixed(1)}</td>
                    <td className="px-4 py-1.5 text-xs text-[var(--texto-suave)]">
                      {m.estado_match === 'sin_colaborador'
                        ? 'No existe ese código de empleado'
                        : 'Concepto no dado de alta'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section
          data-guia="nomina-reportes"
          className="rounded-[var(--radio)] border bg-[var(--superficie)] shadow-[var(--sombra)]"
        >
          <header className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Reportes cargados</h2>
          </header>
          {reportes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--texto-suave)]">
              Todavía no cargaste ningún reporte.
            </p>
          ) : (
            <ul className="divide-y">
              {reportes.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">
                      {r.archivo_nombre ?? 'Reporte'}
                    </p>
                    <p className="text-[11px] text-[var(--texto-tenue)]">
                      {r.periodo} · {r.filas_con_match}/{r.filas_totales} cruzadas
                    </p>
                  </div>
                  {porBorrar === r.id ? (
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-[var(--error)]">
                        Se borran las {r.filas_totales} filas de {r.periodo} y la
                        comparación de ese período.
                      </p>
                      <div className="mt-1 flex justify-end gap-1.5">
                        <button
                          onClick={() =>
                            iniciar(async () => {
                              await borrarReporte(r.id)
                              setPorBorrar(null)
                              router.refresh()
                            })
                          }
                          disabled={pendiente}
                          className="rounded bg-[var(--error)] px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                        >
                          Borrar
                        </button>
                        <button
                          onClick={() => setPorBorrar(null)}
                          className="rounded border px-2 py-1 text-[11px] text-[var(--texto-suave)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPorBorrar(r.id)}
                      disabled={pendiente}
                      className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-[var(--texto-tenue)] transition hover:bg-[var(--superficie-alt)]"
                    >
                      Borrar el reporte
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          data-guia="nomina-conceptos"
          className="rounded-[var(--radio)] border bg-[var(--superficie)] shadow-[var(--sombra)]"
        >
          <header className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Conceptos que entran a la comparación</h2>
            <p className="mt-0.5 text-xs text-[var(--texto-suave)]">
              Todo lo demás del reporte se descarta solo.
            </p>
          </header>
          <ul className="divide-y">
            {enConciliacion.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2">
                <code className="cifra rounded bg-[var(--superficie-alt)] px-1.5 py-0.5 text-[11px]">
                  {c.codigo}
                </code>
                <span className="flex-1 text-[13px]">{c.nombre}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    c.cuenta_como_extra
                      ? 'bg-[var(--error-fondo)] text-[var(--error)]'
                      : 'bg-[var(--info-fondo)] text-[var(--info)]'
                  }`}
                >
                  {c.cuenta_como_extra ? 'Extra' : 'Recargo'}
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t px-4 py-2.5 text-[11px] text-[var(--texto-tenue)]">
            Esta lista sigue los códigos estándar de nómina en Colombia. Con un
            reporte real de Frisby la ajustamos a los códigos que use la empresa,
            y desde ahí el cruce es exacto.
          </p>
        </section>
      </div>
    </>
  )
}
