import Link from 'next/link'
import { redirect } from 'next/navigation'
import Shell from '@/components/shell'
import { createClient } from '@/lib/supabase/server'
import { lunesDe, rangoSemana } from '@/lib/dominio'

export default async function Home() {
  const supabase = await createClient()
  const semanaActual = lunesDe(new Date())

  const { data: tiendas } = await supabase
    .from('tiendas')
    .select('id, codigo, nombre, ciudad')
    .eq('activa', true)
    .order('codigo')

  // Un admin de una sola tienda no deberia tener que elegir
  if (tiendas?.length === 1) {
    redirect(`/cronograma/${tiendas[0].id}/${semanaActual}`)
  }

  return (
    <Shell actual="cronograma">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-base font-semibold tracking-tight">Cronograma</h1>
        <p className="mt-1 text-sm text-[var(--texto-suave)]">
          Semana del {rangoSemana(semanaActual)}
        </p>

        <ul className="mt-6 space-y-2">
          {(tiendas ?? []).map((t) => (
            <li key={t.id}>
              <Link
                href={`/cronograma/${t.id}/${semanaActual}`}
                className="flex items-center justify-between rounded-[var(--radio)] border bg-[var(--superficie)] px-4 py-3 transition hover:border-[var(--borde-fuerte)]"
              >
                <span>
                  <span className="text-sm font-medium">
                    {t.codigo} · {t.nombre}
                  </span>
                  {t.ciudad && (
                    <span className="ml-2 text-xs text-[var(--texto-tenue)]">
                      {t.ciudad}
                    </span>
                  )}
                </span>
                <span className="text-[var(--texto-tenue)]">→</span>
              </Link>
            </li>
          ))}
        </ul>

        {(tiendas ?? []).length === 0 && (
          <p className="mt-6 rounded-[var(--radio)] border border-dashed px-4 py-8 text-center text-sm text-[var(--texto-suave)]">
            No tenés tiendas asignadas todavía.
          </p>
        )}
      </div>
    </Shell>
  )
}
