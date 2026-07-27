import Link from 'next/link'
import { perfilActual } from '@/lib/perfil'
import BotonSalir from './boton-salir'

export default async function Shell({
  children,
  actual,
}: {
  children: React.ReactNode
  actual?: 'cronograma' | 'consolidado' | 'nomina' | 'ausentismo'
}) {
  const perfil = await perfilActual()
  const esCoordinador = perfil?.rol === 'coordinador'

  const enlaces = [
    { id: 'cronograma', href: '/', texto: 'Cronograma' },
    ...(esCoordinador
      ? [
          { id: 'consolidado', href: '/consolidado', texto: 'Consolidado' },
          { id: 'nomina', href: '/nomina', texto: 'Nómina' },
          { id: 'ausentismo', href: '/ausentismo', texto: 'Ausentismo' },
        ]
      : []),
  ]

  return (
    <>
      <header className="border-b bg-[var(--superficie)]">
        <div className="mx-auto flex max-w-[1600px] items-center gap-8 px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--acento)]" />
            <span className="text-sm font-semibold tracking-tight">
              Herramienta Mónica
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {enlaces.map((e) => (
              <Link
                key={e.id}
                href={e.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  actual === e.id
                    ? 'bg-[var(--superficie-alt)] font-medium text-[var(--texto)]'
                    : 'text-[var(--texto-suave)] hover:bg-[var(--superficie-alt)]'
                }`}
              >
                {e.texto}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-[var(--texto-tenue)]">
              {perfil?.nombre}
              {esCoordinador && ' · coordinación'}
            </span>
            <BotonSalir />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </>
  )
}
