'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { justificarAlerta } from './acciones'
import type { Validacion } from './grilla'

export default function PanelAlertas({
  validaciones,
  colaboradores,
  tiendaId,
  semana,
  ancla,
}: {
  /** Nombre del anclaje del recorrido guiado */
  ancla?: string
  validaciones: Validacion[]
  colaboradores: { id: string; codigo_empleado: string | null; nombre_completo: string }[]
  tiendaId: string
  semana: string
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [justificando, setJustificando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)

  const abiertas = validaciones.filter((v) => v.estado === 'abierta')
  const aceptadas = validaciones.filter((v) => v.estado === 'aceptada')

  function nombre(id: string | null) {
    if (!id) return null
    return colaboradores.find((x) => x.id === id)?.nombre_completo ?? null
  }

  function aceptar(id: string) {
    setError(null)
    iniciar(async () => {
      const r = await justificarAlerta(tiendaId, semana, id, texto)
      if (r.ok) {
        setJustificando(null)
        setTexto('')
        router.refresh()
      } else setError(r.error)
    })
  }

  return (
    <section
      data-guia={ancla}
      className="rounded-[var(--radio)] border bg-[var(--superficie)] shadow-[var(--sombra)]"
    >
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Alertas de la semana</h2>
        <p className="mt-0.5 text-xs text-[var(--texto-suave)]">
          Las que bloquean impiden publicar. Si el caso está bien igual, se
          justifica y queda registrado quién lo aprobó.
        </p>
      </header>

      <div className="divide-y">
        {abiertas.length === 0 && (
          <p className="px-4 py-6 text-sm text-[var(--texto-suave)]">
            No hay alertas abiertas: la semana cumple las reglas.
          </p>
        )}

        {abiertas.map((v) => {
          const quien = nombre(v.colaborador_id)
          return (
            <article key={v.id} className="px-4 py-3">
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    v.severidad === 'bloqueante'
                      ? 'bg-[var(--error-fondo)] text-[var(--error)]'
                      : 'bg-[var(--alerta-fondo)] text-[var(--alerta)]'
                  }`}
                >
                  {v.severidad === 'bloqueante' ? 'Bloquea' : 'Aviso'}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug">{v.mensaje}</p>
                  {quien && (
                    <p className="mt-0.5 text-[11px] text-[var(--texto-tenue)]">
                      {quien}
                    </p>
                  )}

                  {justificando === v.id ? (
                    <div className="mt-2.5">
                      <textarea
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        rows={2}
                        placeholder="Por qué este caso es aceptable…"
                        className="w-full rounded-md border bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[var(--acento)]"
                      />
                      <div className="mt-1.5 flex gap-1.5">
                        <button
                          onClick={() => aceptar(v.id)}
                          disabled={pendiente}
                          className="rounded-md bg-[var(--texto)] px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Guardar justificación
                        </button>
                        <button
                          onClick={() => {
                            setJustificando(null)
                            setTexto('')
                          }}
                          className="rounded-md border px-2.5 py-1 text-xs text-[var(--texto-suave)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setJustificando(v.id)}
                      className="mt-1.5 text-[11px] text-[var(--info)] transition hover:underline"
                    >
                      Justificar y aceptar
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {error && (
        <p className="border-t bg-[var(--error-fondo)] px-4 py-2 text-xs text-[var(--error)]">
          {error}
        </p>
      )}

      {aceptadas.length > 0 && (
        <details className="border-t px-4 py-3">
          <summary className="cursor-pointer text-xs text-[var(--texto-suave)]">
            {aceptadas.length} alerta{aceptadas.length > 1 ? 's' : ''} justificada
            {aceptadas.length > 1 ? 's' : ''}
          </summary>
          <ul className="mt-2 space-y-2">
            {aceptadas.map((v) => (
              <li key={v.id} className="text-[11px] text-[var(--texto-suave)]">
                <span className="block">{v.mensaje}</span>
                {v.justificacion && (
                  <span className="mt-0.5 block italic text-[var(--texto-tenue)]">
                    {v.justificacion}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
