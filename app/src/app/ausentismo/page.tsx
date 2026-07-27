import { redirect } from 'next/navigation'
import Shell from '@/components/shell'
import { createClient } from '@/lib/supabase/server'
import { esCoordinador } from '@/lib/perfil'
import Tablero from './tablero'

export default async function PaginaAusentismo(props: {
  searchParams: Promise<{ anio?: string; tienda?: string }>
}) {
  if (!(await esCoordinador())) redirect('/')

  const sp = await props.searchParams
  const anio = Number(sp.anio ?? new Date().getFullYear())
  const tiendaFiltro = sp.tienda ?? ''

  const supabase = await createClient()

  const { data: tiendas } = await supabase
    .from('tiendas')
    .select('id, codigo, nombre')
    .eq('activa', true)
    .order('codigo')

  let consulta = supabase
    .from('ausencias')
    .select('id, tienda_id, colaborador_id, tipo, causa, fecha_inicio, fecha_fin, dias')
    .gte('fecha_inicio', `${anio}-01-01`)
    .lte('fecha_inicio', `${anio}-12-31`)

  if (tiendaFiltro) consulta = consulta.eq('tienda_id', tiendaFiltro)

  const { data: ausencias } = await consulta

  return (
    <Shell actual="ausentismo">
      <Tablero
        anio={anio}
        tiendaFiltro={tiendaFiltro}
        tiendas={tiendas ?? []}
        ausencias={ausencias ?? []}
      />
    </Shell>
  )
}
