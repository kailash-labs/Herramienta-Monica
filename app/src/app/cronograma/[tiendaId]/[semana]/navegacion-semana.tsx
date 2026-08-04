'use client'

import Link from 'next/link'
import { rangoSemana, sumarDias } from '@/lib/dominio'
import type { EstadoSemana } from '@/lib/dominio'

const ETIQUETA_ESTADO: Record<EstadoSemana, { texto: string; clase: string }> = {
  borrador: {
    texto: 'Borrador',
    clase: 'bg-[var(--superficie-alt)] text-[var(--texto-suave)]',
  },
  publicada: {
    texto: 'Publicada',
    clase: 'bg-[var(--ok-fondo)] text-[var(--ok)]',
  },
  cerrada: {
    texto: 'Cerrada',
    clase: 'bg-[var(--info-fondo)] text-[var(--info)]',
  },
}

export default function NavegacionSemana({
  tiendaId,
  semana,
  tienda,
  estado,
}: {
  tiendaId: string
  semana: string
  tienda: { codigo: string; nombre: string }
  estado?: EstadoSemana
}) {
  const anterior = sumarDias(semana, -7)
  const siguiente = sumarDias(semana, 7)
  const et = estado ? ETIQUETA_ESTADO[estado] : null

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div data-guia="semana-titulo">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-semibold tracking-tight">
            {tienda.codigo} · {tienda.nombre}
          </h1>
          {et && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${et.clase}`}
            >
              {et.texto}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-[var(--texto-suave)]">
          Semana del {rangoSemana(semana)}
        </p>
      </div>

      <div data-guia="semana-nav" className="ml-auto flex items-center gap-1">
        <Link
          href={`/cronograma/${tiendaId}/${anterior}`}
          className="rounded-md border bg-[var(--superficie)] px-2.5 py-1.5 text-sm text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
          aria-label="Semana anterior"
        >
          ←
        </Link>
        <Link
          href={`/cronograma/${tiendaId}/${siguiente}`}
          className="rounded-md border bg-[var(--superficie)] px-2.5 py-1.5 text-sm text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
          aria-label="Semana siguiente"
        >
          →
        </Link>
      </div>
    </div>
  )
}
