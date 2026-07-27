import { Suspense } from 'react'
import FormularioIngreso from './formulario'

export default function PaginaIngreso() {
  return (
    <main className="flex-1 grid place-items-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="flex items-baseline gap-2">
            <span className="h-3 w-3 rounded-full bg-[var(--acento)]" />
            <h1 className="text-lg font-semibold tracking-tight">
              Herramienta Mónica
            </h1>
          </div>
          <p className="mt-2 text-sm text-[var(--texto-suave)]">
            Aforos y horas extra. Lo planeado y lo real, en una sola base.
          </p>
        </div>

        <Suspense>
          <FormularioIngreso />
        </Suspense>
      </div>
    </main>
  )
}
