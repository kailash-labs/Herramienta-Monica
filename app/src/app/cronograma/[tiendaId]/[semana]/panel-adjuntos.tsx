'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { registrarAdjunto, cambiarEstadoAdjunto, borrarAdjunto } from './acciones-adjuntos'
import type { Adjunto } from './grilla'

const ETIQUETA_ORIGEN = {
  foto: 'Foto',
  pdf_sipo: 'PDF de Sipo',
  otro: 'Archivo',
} as const

const ETIQUETA_ESTADO = {
  sin_procesar: { texto: 'Sin pasar al aforo', clase: 'bg-[var(--alerta-fondo)] text-[var(--alerta)]' },
  transcrito: { texto: 'Ya está en el aforo', clase: 'bg-[var(--ok-fondo)] text-[var(--ok)]' },
  descartado: { texto: 'Descartado', clase: 'bg-[var(--superficie-alt)] text-[var(--texto-tenue)]' },
} as const

export default function PanelAdjuntos({
  adjuntos,
  tiendaId,
  semanaId,
  semana,
  cerrada,
  ancla,
}: {
  /** Nombre del anclaje del recorrido guiado */
  ancla?: string
  adjuntos: Adjunto[]
  tiendaId: string
  semanaId: string
  semana: string
  cerrada: boolean
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function subir(archivo: File) {
    setError(null)
    setSubiendo(true)

    try {
      const supabase = createClient()

      // La ruta arranca con el uuid de la tienda: las policies de Storage
      // validan ese primer segmento.
      const limpio = archivo.name.replace(/[^\w.\-]/g, '_')
      const ruta = `${tiendaId}/${semana}/${Date.now()}_${limpio}`

      const { error: errSubida } = await supabase.storage
        .from('aforos')
        .upload(ruta, archivo, { upsert: false })

      if (errSubida) {
        setError(`No se pudo subir: ${errSubida.message}`)
        return
      }

      const origen = archivo.type === 'application/pdf' ? 'pdf_sipo' : 'foto'
      const r = await registrarAdjunto({
        tiendaId,
        semana,
        semanaId,
        storagePath: ruta,
        archivoNombre: archivo.name,
        mimeType: archivo.type,
        tamanoBytes: archivo.size,
        origen,
      })

      if (!r.ok) {
        // La fila no entro: limpiamos el archivo para no dejar huérfanos
        await supabase.storage.from('aforos').remove([ruta])
        setError(r.error)
        return
      }

      router.refresh()
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function ver(adj: Adjunto) {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('aforos')
      .createSignedUrl(adj.storage_path, 60)

    if (error || !data) {
      setError('No se pudo abrir el archivo.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <section
      data-guia={ancla}
      className="rounded-[var(--radio)] border bg-[var(--superficie)] shadow-[var(--sombra)]"
    >
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Aforo recibido</h2>
        <p className="mt-0.5 text-xs text-[var(--texto-suave)]">
          Si el admin manda el horario por foto o PDF, va acá. Queda como
          respaldo; el motor valida sobre la plantilla.
        </p>
      </header>

      {!cerrada && (
        <div className="px-4 py-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/webp,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) subir(f)
            }}
            className="hidden"
            id="subir-aforo"
          />
          <label
            htmlFor="subir-aforo"
            className={`flex cursor-pointer items-center justify-center rounded-md border border-dashed px-3 py-4 text-xs transition ${
              subiendo
                ? 'text-[var(--texto-tenue)]'
                : 'text-[var(--texto-suave)] hover:border-[var(--acento)] hover:bg-[var(--superficie-alt)]'
            }`}
          >
            {subiendo ? 'Subiendo…' : 'Subir foto o PDF del aforo'}
          </label>
          <p className="mt-1.5 text-[11px] text-[var(--texto-tenue)]">
            JPG, PNG, HEIC, WEBP o PDF · hasta 10 MB
          </p>
        </div>
      )}

      {error && (
        <p className="mx-4 mb-3 rounded-md bg-[var(--error-fondo)] px-3 py-2 text-xs text-[var(--error)]">
          {error}
        </p>
      )}

      {adjuntos.length > 0 && (
        <ul className="divide-y border-t">
          {adjuntos.map((a) => {
            const et = ETIQUETA_ESTADO[a.estado]
            return (
              <li key={a.id} className="px-4 py-2.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => ver(a)}
                      className="block truncate text-left text-[13px] text-[var(--info)] transition hover:underline"
                    >
                      {a.archivo_nombre ?? 'Archivo'}
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-[var(--texto-tenue)]">
                        {ETIQUETA_ORIGEN[a.origen]} ·{' '}
                        {new Date(a.subido_at).toLocaleDateString('es-CO', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${et.clase}`}>
                        {et.texto}
                      </span>
                    </div>
                  </div>

                  {!cerrada && (
                    <div className="flex shrink-0 gap-1">
                      {a.estado === 'sin_procesar' && (
                        <button
                          onClick={() =>
                            iniciar(async () => {
                              await cambiarEstadoAdjunto(tiendaId, semana, a.id, 'transcrito')
                              router.refresh()
                            })
                          }
                          disabled={pendiente}
                          className="rounded border px-1.5 py-0.5 text-[10px] text-[var(--texto-suave)] transition hover:bg-[var(--superficie-alt)]"
                          title="Marcar que ya pasaste este horario al aforo"
                        >
                          Ya lo pasé
                        </button>
                      )}
                      <button
                        onClick={() =>
                          iniciar(async () => {
                            await borrarAdjunto(tiendaId, semana, a.id, a.storage_path)
                            router.refresh()
                          })
                        }
                        disabled={pendiente}
                        className="rounded border px-1.5 py-0.5 text-[10px] text-[var(--texto-tenue)] transition hover:bg-[var(--superficie-alt)]"
                        aria-label="Quitar archivo"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
