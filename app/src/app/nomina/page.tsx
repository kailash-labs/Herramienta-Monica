import { redirect } from 'next/navigation'
import Shell from '@/components/shell'
import { createClient } from '@/lib/supabase/server'
import { esCoordinador } from '@/lib/perfil'
import { nombreMes } from '@/lib/dominio'
import CargadorNomina from './cargador'

export default async function PaginaNomina() {
  if (!(await esCoordinador())) redirect('/')

  const supabase = await createClient()

  const [{ data: reportes }, { data: conceptos }, { data: tiendas }] = await Promise.all([
    supabase
      .from('reportes_nomina')
      .select('id, tienda_id, anio, mes, archivo_nombre, estado, filas_totales, filas_con_match, cargado_at')
      .order('cargado_at', { ascending: false })
      .limit(20),
    supabase
      .from('conceptos_nomina')
      .select('id, codigo, nombre, clasificacion, cuenta_como_extra, cuenta_como_recargo, incluir_en_conciliacion')
      .eq('activo', true)
      .order('codigo'),
    supabase.from('tiendas').select('id, codigo, nombre').eq('activa', true).order('codigo'),
  ])

  // Movimientos que no cruzaron: son los que hay que revisar a mano
  const { data: sinMatch } = await supabase
    .from('movimientos_nomina')
    .select('id, codigo_empleado_origen, nombre_origen, codigo_concepto_origen, cantidad, estado_match, reporte_id')
    .neq('estado_match', 'ok')
    .limit(50)

  return (
    <Shell actual="nomina">
      <div className="mx-auto max-w-[1200px] px-6 py-6">
        <header>
          <h1 className="text-base font-semibold tracking-tight">Nómina</h1>
          <p className="mt-0.5 text-sm text-[var(--texto-suave)]">
            Acá entra el reporte de Frisby. El sistema separa extras y recargos y
            descarta el resto.
          </p>
        </header>

        <CargadorNomina
          tiendas={tiendas ?? []}
          conceptos={conceptos ?? []}
          reportes={(reportes ?? []).map((r) => ({
            ...r,
            periodo: `${nombreMes(r.mes)} ${r.anio}`,
          }))}
          sinMatch={sinMatch ?? []}
        />
      </div>
    </Shell>
  )
}
