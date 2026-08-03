'use client'

import Link from 'next/link'
import { Fragment, useMemo } from 'react'
import { DIAS, hhmm, horas, rangoSemana, sumarDias } from '@/lib/dominio'
import type { EstadoSemana, TipoTurno } from '@/lib/dominio'
import './impresion.css'

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

type Ausencia = {
  id: string
  colaborador_id: string
  tipo: string
  fecha_inicio: string
  fecha_fin: string
}

const ABREVIA: Record<string, string> = {
  incapacidad: 'Incapacidad',
  permiso_remunerado: 'Permiso',
  permiso_no_remunerado: 'Permiso',
  ausencia_injustificada: 'Ausencia',
  vacaciones: 'Vacaciones',
  licencia: 'Licencia',
}

export default function HojaImpresion({
  tienda,
  semana,
  cargos,
  colaboradores,
  turnos,
  resumen,
  ausencias,
}: {
  tienda: { id: string; codigo: string; nombre: string; ciudad: string | null }
  semana: { id: string; fecha_inicio: string; estado: EstadoSemana; publicada_at: string | null }
  cargos: { id: string; nombre: string; color: string | null; orden: number }[]
  colaboradores: { id: string; nombre_completo: string; codigo_empleado: string | null; cargo_id: string }[]
  turnos: Turno[]
  resumen: { colaborador_id: string; horas_planeadas: number; horas_extra_planeadas: number }[]
  ausencias: Ausencia[]
}) {
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

  const ausenciaPorCelda = useMemo(() => {
    const m = new Map<string, Ausencia>()
    for (const a of ausencias) {
      for (let f = a.fecha_inicio; f <= a.fecha_fin; f = sumarDias(f, 1)) {
        m.set(`${a.colaborador_id}|${f}`, a)
      }
    }
    return m
  }, [ausencias])

  const porColaborador = useMemo(() => {
    const m = new Map<string, { horas_planeadas: number; horas_extra_planeadas: number }>()
    for (const r of resumen) m.set(r.colaborador_id, r)
    return m
  }, [resumen])

  const cargosConGente = cargos
    .map((c) => ({ ...c, gente: colaboradores.filter((x) => x.cargo_id === c.id) }))
    .filter((c) => c.gente.length > 0)

  const totalHoras = resumen.reduce((s, r) => s + Number(r.horas_planeadas), 0)
  const totalExtra = resumen.reduce((s, r) => s + Number(r.horas_extra_planeadas), 0)
  const conTurnos = resumen.filter((r) => Number(r.horas_planeadas) > 0).length

  return (
    <div className="hoja">
      {/* Barra que no se imprime */}
      <div className="barra">
        <Link href={`/cronograma/${tienda.id}/${semana.fecha_inicio}`} className="volver">
          ← Volver al aforo
        </Link>
        <div className="acciones">
          <span className="ayuda">
            En el diálogo de impresión elegí «Guardar como PDF» y orientación horizontal.
          </span>
          <button onClick={() => window.print()} className="boton">
            Imprimir o guardar PDF
          </button>
        </div>
      </div>

      <article className="documento">
        <header className="encabezado">
          <div>
            <h1>
              {tienda.codigo} · {tienda.nombre}
            </h1>
            <p className="sub">
              Aforo de la semana del {rangoSemana(semana.fecha_inicio)}
              {tienda.ciudad ? ` · ${tienda.ciudad}` : ''}
            </p>
          </div>
          <div className="sello">
            <span className={`estado estado-${semana.estado}`}>
              {semana.estado === 'publicada'
                ? 'Aforo oficial'
                : semana.estado === 'cerrada'
                  ? 'Semana cerrada'
                  : 'Borrador'}
            </span>
            {semana.publicada_at && (
              <span className="fecha-sello">
                Publicado{' '}
                {new Date(semana.publicada_at).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </header>

        <table className="grilla">
          <thead>
            <tr>
              <th className="col-nombre">Colaborador</th>
              {fechas.map((f, i) => (
                <th key={f}>
                  {DIAS[i]}
                  <span className="dia-num">{f.slice(8)}</span>
                </th>
              ))}
              <th className="col-horas">Horas</th>
            </tr>
          </thead>

          <tbody>
            {cargosConGente.map((cargo) => (
              <Fragment key={cargo.id}>
                <tr className="fila-cargo">
                  <td colSpan={9}>
                    <span className="punto" style={{ background: cargo.color ?? '#999' }} />
                    {cargo.nombre}
                  </td>
                </tr>

                {cargo.gente.map((c) => {
                  const r = porColaborador.get(c.id)
                  const hs = Number(r?.horas_planeadas ?? 0)
                  const extra = Number(r?.horas_extra_planeadas ?? 0)

                  return (
                    <tr key={c.id}>
                      <td className="col-nombre">
                        {c.nombre_completo}
                      </td>

                      {fechas.map((f) => {
                        const bloques = porCelda.get(`${c.id}|${f}`) ?? []
                        const aus = ausenciaPorCelda.get(`${c.id}|${f}`)

                        if (bloques.length === 0 && aus) {
                          return (
                            <td key={f} className="celda ausencia">
                              {ABREVIA[aus.tipo] ?? 'Ausencia'}
                            </td>
                          )
                        }
                        if (bloques.length === 0) {
                          return (
                            <td key={f} className="celda vacia">
                              Descansa
                            </td>
                          )
                        }
                        return (
                          <td
                            key={f}
                            className="celda turno"
                            style={{ background: cargo.color ?? '#666' }}
                          >
                            {bloques.map((b) => (
                              <span key={b.id} className="rango">
                                {hhmm(b.hora_inicio)}–{hhmm(b.hora_fin)}
                              </span>
                            ))}
                          </td>
                        )
                      })}

                      <td className={`col-horas ${extra > 0 ? 'con-extra' : ''}`}>
                        {horas(hs * 60)}
                        {extra > 0 && <span className="extra">+{horas(extra * 60)}</span>}
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>

        <footer className="pie">
          <div className="totales">
            <span>
              <strong>{conTurnos}</strong> colaboradores
            </span>
            <span>
              <strong>{horas(totalHoras * 60)} h</strong> planeadas
            </span>
            {totalExtra > 0 && (
              <span className="alerta">
                <strong>{horas(totalExtra * 60)} h</strong> extra planeadas
              </span>
            )}
          </div>
          <span className="firma">Herramienta Mónica · Kailash</span>
        </footer>
      </article>
    </div>
  )
}
