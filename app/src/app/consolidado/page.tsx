import { redirect } from 'next/navigation'
import Shell from '@/components/shell'
import { createClient } from '@/lib/supabase/server'
import { esCoordinador } from '@/lib/perfil'
import { nombreMes } from '@/lib/dominio'
import TablaConsolidado from './tabla'

export default async function PaginaConsolidado(props: {
  searchParams: Promise<{ anio?: string; mes?: string }>
}) {
  const sp = await props.searchParams
  const hoy = new Date()
  const anio = Number(sp.anio ?? hoy.getFullYear())
  const mes = Number(sp.mes ?? hoy.getMonth() + 1)

  if (!(await esCoordinador())) redirect('/')

  const supabase = await createClient()

  const { data: tiendas } = await supabase
    .from('tiendas')
    .select('id, codigo, nombre')
    .eq('activa', true)
    .order('codigo')

  const { data: conciliaciones } = await supabase
    .from('conciliaciones')
    .select('id, tienda_id, anio, mes, estado, generada_at, tolerancia_horas')
    .eq('anio', anio)
    .eq('mes', mes)

  const ids = (conciliaciones ?? []).map((c) => c.id)

  const { data: detalle } = ids.length
    ? await supabase
        .from('conciliacion_detalle')
        .select(
          'id, conciliacion_id, colaborador_id, horas_extra_planeadas, horas_extra_reales, horas_recargo_reales, diferencia_horas, valor_extras, estado',
        )
        .in('conciliacion_id', ids)
    : { data: [] }

  const { data: colaboradores } = await supabase
    .from('colaboradores')
    .select('id, nombre_completo, codigo_empleado, tienda_id')

  const { data: alertas } = await supabase
    .from('alertas')
    .select('id, colaborador_id, tipo, estado, asunto, cuerpo, origen_id, tienda_id')
    .eq('tipo', 'llamado_atencion')

  return (
    <Shell actual="consolidado">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <header className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              Consolidado · planeado contra real
            </h1>
            <p className="mt-0.5 text-sm text-[var(--texto-suave)]">
              {nombreMes(mes)} de {anio} · todas las tiendas en una sola vista
            </p>
          </div>
        </header>

        <TablaConsolidado
          anio={anio}
          mes={mes}
          tiendas={tiendas ?? []}
          conciliaciones={conciliaciones ?? []}
          detalle={detalle ?? []}
          colaboradores={colaboradores ?? []}
          alertas={alertas ?? []}
        />
      </div>
    </Shell>
  )
}
