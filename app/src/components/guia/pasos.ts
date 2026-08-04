/**
 * Los pasos del recorrido guiado, por pantalla.
 *
 * `clave` es el `data-guia` del elemento que se señala. Un paso cuyo elemento no
 * está en pantalla se salta solo: así una misma lista sirve para el admin y para
 * coordinación, para la semana vacía y para la cargada, y para la vista angosta
 * y la ancha — sin condicionales acá.
 *
 * `porque` es opcional y es para lo que no se adivina mirando: por qué la
 * herramienta hace algo de una manera y no de otra.
 */

export type Paso = {
  /** El `data-guia` del elemento a señalar */
  clave: string
  /** De qué parte de la pantalla se está hablando */
  zona: string
  titulo: string
  texto: string
  porque?: string
  /** No señala nada: se muestra centrado. Para abrir o cerrar el recorrido. */
  centrado?: boolean
}

export type Seccion =
  | 'cronograma'
  | 'personal'
  | 'consolidado'
  | 'nomina'
  | 'ausentismo'

const CIERRE: Paso = {
  clave: '',
  centrado: true,
  zona: 'Listo',
  titulo: 'Eso es todo',
  texto:
    'Podés volver a ver este recorrido cuando quieras desde el signo de pregunta, arriba a la derecha. Ahí también está el manual escrito, con el paso a paso de cada tarea.',
}

const AFORO: Paso[] = [
  {
    clave: 'nav',
    zona: 'Arriba de todo',
    titulo: 'Las secciones',
    texto:
      'Acá se cambia de sección. Si sos administrador de tienda vas a ver «Aforos», que es tu trabajo, y «Personas», que es quién trabaja en tu tienda. Coordinación ve además el consolidado, la nómina y el ausentismo.',
  },
  {
    clave: 'lista-tiendas',
    zona: 'Inicio',
    titulo: 'Elegí la tienda',
    texto:
      'Cada tienda tiene su propio aforo. Si administrás una sola, la herramienta te lleva directo y esta pantalla no aparece.',
  },
  {
    clave: 'semana-titulo',
    zona: 'Encabezado',
    titulo: 'Dónde estás parado',
    texto:
      'La tienda y la semana que estás viendo. Al lado del nombre, la etiqueta dice si la semana está en borrador, publicada o cerrada.',
    porque:
      'En borrador podés cambiar lo que quieras. Publicada sigue siendo editable, pero cada cambio te pide el motivo y queda registrado. Cerrada ya no admite cambios: es la foto contra la que se compara la nómina.',
  },
  {
    clave: 'semana-nav',
    zona: 'Encabezado',
    titulo: 'Moverte entre semanas',
    texto:
      'Las flechas van a la semana anterior y a la siguiente. Las semanas siempre empiezan lunes.',
  },
  {
    clave: 'copiar-anterior',
    zona: 'Semana sin cargar',
    titulo: 'Empezá copiando la semana pasada',
    texto:
      'Este es el atajo más grande de la herramienta. Trae todos los turnos de la semana anterior de un toque, y después vos ajustás lo que cambió.',
    porque:
      'Cargar los seis días de una sola persona a mano son unos 28 toques. La mayoría de las semanas se parecen a la anterior, así que copiar convierte «armar la semana» en «corregir cinco cosas». La copia nunca pisa lo que ya cargaste, no trae a las personas que ya no están, y salta los días que ya tienen una novedad registrada. Al terminar te dice exactamente qué copió y qué dejó afuera.',
  },
  {
    clave: 'empezar-blanco',
    zona: 'Semana sin cargar',
    titulo: 'O empezá de cero',
    texto:
      'Si la operación cambió de fondo y la semana pasada ya no sirve de base, acá arrancás con la semana vacía.',
  },
  {
    clave: 'metricas',
    zona: 'Resumen',
    titulo: 'Cómo viene la semana',
    texto:
      'Las horas planeadas de toda la tienda y, al lado, cuántas de esas son hora extra. Si «Extra planeada» está en cero, la semana no genera sobrecosto.',
    porque:
      'La extra se calcula contra el contrato de cada persona, no contra un número fijo. Alguien de medio tiempo con 21 h de contrato genera extra a partir de las 21, no de las 42.',
  },
  {
    clave: 'metrica-alertas',
    zona: 'Resumen',
    titulo: 'Las alertas',
    texto:
      'Cuántas cosas encontró el motor de reglas: exceso de horas, falta de día de descanso, poco descanso entre turnos, turnos cruzados y reparto desparejo de aperturas y cierres.',
    porque:
      'Se recalculan solas cada vez que guardás un turno o copiás una semana. No hay que pedirle nada a la herramienta.',
  },
  {
    clave: 'aforo-lista',
    zona: 'El aforo',
    titulo: 'La semana de cada persona',
    texto:
      'Tocá a una persona y se abre su semana hacia abajo, un día por fila. Tocá un día y elegís el horario: los más usados de tu tienda aparecen como atajos de un toque, y si el que necesitás no está, lo escribís a mano o lo partís en dos bloques.',
    porque:
      'Los atajos no son una lista fija: salen de la historia de tu propia tienda, así que cada punto de venta ve sus horarios y cambian solos con el tiempo.',
  },
  {
    clave: 'aforo-grilla',
    zona: 'El aforo',
    titulo: 'La semana completa',
    texto:
      'Las personas agrupadas por cargo y los siete días en columnas. Tocá cualquier celda para armar, cambiar o quitar el turno de ese día. Las celdas con «+» están libres; las de color tienen turno; las amarillas están cubiertas por una novedad.',
    porque:
      'Esta misma pantalla se ve así en una computadora y como lista por persona en un celular. No hay que elegir vista ni cambiar de dirección: se acomoda al ancho.',
  },
  {
    clave: 'publicar',
    zona: 'Acciones',
    titulo: 'Publicar el aforo',
    texto:
      'Cuando la semana está lista, publicarla la vuelve el aforo oficial. Si hay alertas que bloquean, el botón queda apagado y abajo te dice cuántas faltan.',
    porque:
      'No te deja publicar algo que incumple una regla, pero tampoco te traba: si el caso es válido, se justifica desde el panel de alertas y queda registrado quién lo aprobó y por qué.',
  },
  {
    clave: 'menu-mas',
    zona: 'Acciones',
    titulo: 'Lo demás, acá adentro',
    texto:
      'Copiar la semana anterior otra vez, leer un archivo (una foto, un PDF o un Excel del aforo) e imprimir la hoja para mandar al grupo.',
    porque:
      'Están en un menú y no sueltos para que se vea cuál es la acción que importa en cada momento.',
  },
  {
    clave: 'enlace-personal',
    zona: 'Debajo del aforo',
    titulo: 'Si falta alguien en la lista',
    texto:
      'El aforo muestra a quien está cargado en la tienda. Si entró alguien nuevo y no aparece, o si alguien se fue y sigue apareciendo, se arregla acá.',
    porque:
      'A quien ya trabajó no se la borra, se la retira: sale del aforo y se conserva todo lo que hizo, que es lo que hace que el consolidado de los meses anteriores siga cuadrando. Al retirarla se liberan los turnos que tuviera cargados más adelante, y la herramienta te dice cuántos y de qué semanas.',
  },
  {
    clave: 'panel-alertas',
    zona: 'Abajo',
    titulo: 'Qué hay que corregir',
    texto:
      'Cada alerta dice a quién afecta y qué pasa, en palabras. Las que dicen «Bloquea» impiden publicar; las de «Aviso» no, pero quedan registradas.',
    porque:
      'Si una alerta es correcta pero el caso está justificado, «Justificar y aceptar» la cierra dejando tu explicación guardada. Eso es lo que después permite defender la decisión.',
  },
  {
    clave: 'panel-novedades',
    zona: 'Abajo',
    titulo: 'Incapacidades, permisos y vacaciones',
    texto:
      'Registrá acá cualquier novedad. Podés poner un rango que empiece antes de la semana que estás viendo: una incapacidad casi nunca arranca justo un lunes.',
    porque:
      'Registrarla hace tres cosas de una vez: guarda la causa, libera los turnos de esos días y recalcula las horas y las reglas. Si estuviera separado, la causa quedaría de un lado y la trazabilidad del otro, y el tablero de ausentismo nunca se llenaría. Al terminar te dice cuántos turnos liberó.',
  },
  {
    clave: 'panel-adjuntos',
    zona: 'Abajo',
    titulo: 'La foto de lo que mandaste',
    texto:
      'Subí acá la foto o el PDF del aforo como respaldo. Queda guardado junto a la semana y marcado hasta que alguien lo pase al aforo.',
  },
  CIERRE,
]

const PERSONAL: Paso[] = [
  {
    clave: 'agregar-persona',
    zona: 'Personas',
    titulo: 'Quién entra',
    texto:
      'Cargá acá a quien empieza a trabajar en la tienda. Desde que la agregás aparece en el aforo de todas las semanas y ya se le pueden poner turnos.',
    porque:
      'El código de empleado es el que trae el reporte de nómina. Sin él la persona igual funciona en el aforo, pero sus horas extra no se pueden comparar contra lo que se le pagó.',
  },
  {
    clave: 'lista-personas',
    zona: 'Personas',
    titulo: 'Quién está y quién se fue',
    texto:
      'La gente activa, agrupada por cargo igual que en el aforo. En el «···» de cada una: corregir los datos, o marcar que ya no trabaja acá.',
    porque:
      'A quien ya trabajó no se la borra, se la retira: sale del aforo y se conserva todo lo que hizo. Si se borrara, el consolidado de los meses anteriores dejaría de cuadrar. Borrar de verdad solo aparece para alguien cargado por error, que todavía no tiene nada.',
  },
  CIERRE,
]

const CONSOLIDADO: Paso[] = [
  {
    clave: 'consolidado-comparar',
    zona: 'Consolidado',
    titulo: 'Comparar el mes',
    texto:
      'Enfrenta la hora extra que se planeó contra la que efectivamente pagó nómina, para todas las tiendas del mes.',
    porque:
      'Antes de comparar hace falta haber cargado el reporte de nómina de ese mes en la sección Nómina. Sin eso no hay contra qué comparar.',
  },
  {
    clave: 'consolidado-tabla',
    zona: 'Consolidado',
    titulo: 'Solo lo que no cuadra',
    texto:
      'Acá no aparece todo el mundo: aparecen los casos donde lo planeado y lo pagado no coinciden, ordenados por lo que más pesa en plata.',
    porque:
      'La idea es no leer fila por fila. Si una persona está en esta lista, es porque hay algo que mirar.',
  },
  {
    clave: 'consolidado-alerta',
    zona: 'Consolidado',
    titulo: 'El llamado de atención, ya redactado',
    texto:
      'Para cada diferencia se genera el borrador del mensaje con los datos ya puestos. Se revisa, se ajusta si hace falta, y se manda.',
  },
  CIERRE,
]

const NOMINA: Paso[] = [
  {
    clave: 'nomina-cargar',
    zona: 'Nómina',
    titulo: 'Subir el reporte del mes',
    texto:
      'Elegí el período y la tienda, y subí el CSV que manda nómina. La herramienta cruza por código de empleado y por concepto.',
  },
  {
    clave: 'nomina-reportes',
    zona: 'Nómina',
    titulo: 'Lo que ya cargaste',
    texto:
      'Cada reporte con cuántas filas cruzaron. Lo que no cruzó no se pierde: queda listado aparte para que puedas ver qué pasó.',
    porque:
      'Borrar un reporte se lleva también sus movimientos y la comparación de ese período, así que es lo único en toda la herramienta que pregunta dos veces antes de hacerlo.',
  },
  {
    clave: 'nomina-conceptos',
    zona: 'Nómina',
    titulo: 'Qué entra a la comparación',
    texto:
      'Solo estos códigos cuentan como hora extra o recargo. Todo lo demás del reporte se descarta solo.',
    porque:
      'La lista sigue los códigos estándar de nómina en Colombia. Con un reporte real de Frisby se ajusta a los códigos que use la empresa, y a partir de ahí la comparación es exacta.',
  },
  CIERRE,
]

const AUSENTISMO: Paso[] = [
  {
    clave: 'ausentismo-filtros',
    zona: 'Ausentismo',
    titulo: 'El acumulado',
    texto:
      'Días perdidos, causas y evolución por mes. Se filtra por año y por tienda.',
    porque:
      'Se llena solo con las novedades que los administradores registran en su aforo. No hay que cargar nada dos veces.',
  },
  {
    clave: 'ausentismo-causas',
    zona: 'Ausentismo',
    titulo: 'Por qué falta la gente',
    texto:
      'El reparto por causa. Es el dato que con el tiempo permite ver si hay un patrón, sobre todo con los accidentes laborales.',
    porque:
      'Por eso la causa de una incapacidad es obligatoria al registrarla y arranca vacía: un valor puesto por descarte ensuciaría justo el número con el que se toman decisiones de seguridad en el trabajo.',
  },
  CIERRE,
]

export const PASOS: Record<Seccion, Paso[]> = {
  cronograma: AFORO,
  personal: PERSONAL,
  consolidado: CONSOLIDADO,
  nomina: NOMINA,
  ausentismo: AUSENTISMO,
}
