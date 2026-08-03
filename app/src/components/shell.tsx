import Link from 'next/link'
import { perfilActual } from '@/lib/perfil'
import BotonSalir from './boton-salir'
import Ayuda from './guia/ayuda'

export default async function Shell({
  children,
  actual,
}: {
  children: React.ReactNode
  actual?: 'cronograma' | 'personal' | 'consolidado' | 'nomina' | 'ausentismo'
}) {
  const perfil = await perfilActual()
  const esCoordinador = perfil?.rol === 'coordinador'

  const enlaces = [
    { id: 'cronograma', href: '/', texto: 'Aforos' },
    // Personas también para el admin de tienda: quién entra y quién se va es
    // suyo, y sin poder cargar a alguien nuevo no puede armar su aforo.
    { id: 'personal', href: '/personal', texto: 'Personas' },
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
      {/* La barra se arma en dos filas en pantalla angosta. Sin esto, el logo, el
          menú, el nombre y el botón de salir desbordan a 390 px y toda la app
          queda con scroll horizontal. */}
      <header className="border-b bg-[var(--superficie)]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:gap-x-8 sm:px-6 sm:py-3">
          <Link href="/" className="order-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--acento)]" />
            <span className="text-sm font-semibold tracking-tight">
              Herramienta Mónica
            </span>
          </Link>

          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:gap-3">
            {/* El nombre es contexto, no acción: se cae primero cuando no cabe */}
            <span className="hidden text-xs text-[var(--texto-tenue)] sm:inline">
              {perfil?.nombre}
              {esCoordinador && ' · coordinación'}
            </span>
            <Ayuda seccion={actual} esCoordinador={esCoordinador} />
            <BotonSalir />
          </div>

          <nav
            data-guia="nav"
            className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto sm:order-2 sm:mx-0 sm:w-auto"
          >
            {enlaces.map((e) => (
              <Link
                key={e.id}
                href={e.href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
                  actual === e.id
                    ? 'bg-[var(--superficie-alt)] font-medium text-[var(--texto)]'
                    : 'text-[var(--texto-suave)] hover:bg-[var(--superficie-alt)]'
                }`}
              >
                {e.texto}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </>
  )
}
