import { notFound } from 'next/navigation'
import Shell from '@/components/shell'
import { createClient } from '@/lib/supabase/server'
import { esCoordinador } from '@/lib/perfil'
import { lunesDe } from '@/lib/dominio'
import ListaPersonal from './lista'

export default async function PaginaPersonal(props: {
  params: Promise<{ tiendaId: string }>
}) {
  const { tiendaId } = await props.params
  const supabase = await createClient()

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, codigo, nombre, ciudad')
    .eq('id', tiendaId)
    .maybeSingle()

  if (!tienda) notFound()

  // Sin filtrar por `activo`: quien ya no está se muestra aparte, detrás de un
  // toque. Es lo que permite deshacer un retiro cargado por error.
  const [{ data: cargos }, { data: gente }, coordinador] = await Promise.all([
    supabase
      .from('cargos')
      .select('id, codigo, nombre, color, orden')
      .eq('activo', true)
      .order('orden'),
    supabase
      .from('colaboradores')
      .select(
        'id, nombre_completo, codigo_empleado, documento, cargo_id, tipo_jornada, horas_contrato, fecha_ingreso, fecha_retiro, activo',
      )
      .eq('tienda_id', tiendaId)
      .order('nombre_completo'),
    esCoordinador(),
  ])

  // Quién tiene historial, para no ofrecer "Borrar" donde la base va a negarse.
  // Un menú con una opción que casi siempre falla enseña a desconfiar del menú.
  const ids = (gente ?? []).map((c) => c.id)
  const conHistorial = new Set<string>()
  if (ids.length > 0) {
    const [{ data: t }, { data: a }, { data: m }] = await Promise.all([
      supabase.from('turnos').select('colaborador_id').in('colaborador_id', ids),
      supabase.from('ausencias').select('colaborador_id').in('colaborador_id', ids),
      supabase
        .from('movimientos_nomina')
        .select('colaborador_id')
        .in('colaborador_id', ids),
    ])
    for (const fila of [...(t ?? []), ...(a ?? []), ...(m ?? [])]) {
      if (fila.colaborador_id) conHistorial.add(fila.colaborador_id)
    }
  }

  return (
    <Shell actual="personal">
      <ListaPersonal
        tienda={tienda}
        cargos={cargos ?? []}
        gente={gente ?? []}
        conHistorial={[...conHistorial]}
        semanaActual={lunesDe(new Date())}
        esCoordinador={coordinador}
      />
    </Shell>
  )
}
