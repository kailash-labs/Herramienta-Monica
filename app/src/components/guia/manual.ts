/**
 * El manual escrito. Es el complemento del recorrido guiado: el recorrido
 * muestra dónde está cada cosa, el manual explica cómo se hace cada tarea de
 * punta a punta y qué hacer cuando algo no sale.
 *
 * Está organizado por trabajo y no por pantalla, porque nadie abre la
 * herramienta pensando «voy a la sección aforos»: la abre pensando «tengo que
 * cargar la semana».
 */

export type Bloque =
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'pasos'; items: string[] }
  | { tipo: 'lista'; items: string[] }
  | { tipo: 'aviso'; texto: string }
  | { tipo: 'tabla'; encabezados: [string, string]; filas: [string, string][] }

export type Seccion = {
  id: string
  titulo: string
  /** Solo para coordinación: al admin de tienda no le sirve y sería ruido */
  soloCoordinacion?: boolean
  bloques: Bloque[]
}

export const MANUAL: Seccion[] = [
  {
    id: 'que-es',
    titulo: 'Qué es esta herramienta',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'Junta en un solo lugar los dos procesos que hoy viven separados: lo que se planea (el aforo de la semana) y lo que se paga (el reporte de nómina). Cuando los dos están en la misma base, la comparación deja de hacerse a mano.',
      },
      {
        tipo: 'lista',
        items: [
          'El administrador de tienda mantiene quién trabaja ahí, arma el aforo de su semana y registra las novedades que van pasando.',
          'La herramienta suma las horas sola y avisa si algo incumple una regla, antes de que la hora extra ocurra.',
          'Coordinación carga el reporte de nómina del mes y ve, en una sola pantalla, dónde lo pagado no coincide con lo planeado.',
        ],
      },
      {
        tipo: 'parrafo',
        texto:
          'La idea de fondo: que el administrador pueda resolverse solo y que coordinación vea los problemas sin que la llamen.',
      },
    ],
  },

  {
    id: 'cargar-semana',
    titulo: 'Cargar el aforo de la semana',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'Es la tarea principal del administrador y se hace una vez por semana. Se puede hacer entera desde el celular.',
      },
      {
        tipo: 'pasos',
        items: [
          'Entrá con tu correo y tu contraseña. Si administrás una sola tienda, la herramienta te deja directo en la semana actual.',
          'Con las flechas de arriba a la derecha, movete a la semana que vas a cargar. Las semanas siempre empiezan lunes.',
          'Si la semana todavía no existe, tocá «Copiar el aforo de la semana pasada». Trae todos los turnos de la semana anterior de una vez.',
          'Leé el resumen verde que aparece: dice cuántos días copió, de cuántas personas, y a quién dejó afuera y por qué.',
          'Ajustá lo que cambió. En el celular: tocá a la persona, tocá el día, elegí el horario. En la computadora: tocá la celda del día.',
          'Para un horario que se repite mucho, usá los atajos de un toque: son los horarios más usados de tu propia tienda.',
          'Para un turno partido, tocá «Partir en dos bloques» y cargá los dos horarios.',
          'Para dejar un día libre, abrí el día y tocá «Descansa».',
          'Si falta alguien en la lista, entrá a «Personas» —está en la barra de arriba y también con el enlace debajo del aforo— y agregala. Vuelve al aforo ya cargada.',
          'Cuando termines, mirá el panel de alertas de abajo y resolvé lo que haga falta.',
          'Tocá «Publicar el aforo».',
        ],
      },
      {
        tipo: 'aviso',
        texto:
          'Copiar nunca pisa lo que ya cargaste. Si ya empezaste a mano y después copiás, los días que ya tenían turno quedan como estaban y la herramienta te lo dice. Podés tocar el botón dos veces sin miedo: la segunda no duplica nada.',
      },
      {
        tipo: 'parrafo',
        texto: 'Lo que la copia deja afuera a propósito, y por qué:',
      },
      {
        tipo: 'tabla',
        encabezados: ['Qué no copia', 'Por qué'],
        filas: [
          ['Los días que ya tenían turno cargado', 'Copiar encima borraría tu trabajo, y no hay deshacer'],
          ['Los días con una novedad ya registrada', 'Volvería a poner el turno que la incapacidad liberó'],
          ['A las personas inactivas o ya retiradas', 'Ya no trabajan en la tienda'],
          ['A quien ingresó después de esa semana', 'Todavía no había entrado'],
          ['Las notas de los turnos', '«Cubre a Andrea» era cierto la semana pasada, no esta'],
        ],
      },
    ],
  },

  {
    id: 'personas',
    titulo: 'Quién trabaja en la tienda',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'El aforo lista a la gente que está cargada en la tienda. Si entró alguien nuevo y no aparece, o si alguien se fue y sigue apareciendo, se arregla en «Personas», arriba en la barra. También se llega desde el aforo, con el enlace que está justo debajo de la lista.',
      },
      {
        tipo: 'parrafo',
        texto: 'Para dar de alta a alguien que empieza:',
      },
      {
        tipo: 'pasos',
        items: [
          'Entrá a «Personas» y tocá «Agregar persona».',
          'Escribí el nombre y el apellido.',
          'Elegí el cargo. Es el que agrupa las filas del aforo.',
          'Elegí la jornada. Las horas por semana se completan solas: tiempo completo 42, medio tiempo 21, aprendiz 36. Si el contrato dice otra cosa, escribí el número.',
          'Poné el código de empleado, el mismo que trae el reporte de nómina.',
          'Poné desde qué día trabaja.',
          'Tocá «Agregar al aforo». Desde ese momento aparece en todas las semanas.',
        ],
      },
      {
        tipo: 'aviso',
        texto:
          'Las horas por semana no son un dato de adorno: la hora extra se cuenta contra ese número y no contra 42 fijas. Alguien de medio tiempo con 21 h genera extra a partir de las 21. Si la jornada queda mal cargada, las alertas de esa persona van a estar mal toda la vida del contrato.',
      },
      {
        tipo: 'parrafo',
        texto:
          'Cuando alguien deja de trabajar en la tienda, abrí el «···» de su fila y elegí «Ya no trabaja acá». Te pide el último día que trabajó. Desde el día siguiente deja de aparecer en el aforo, y los turnos que tuviera cargados después de esa fecha se liberan: si esa semana ya estaba publicada, van a quedar días sin cubrir y hay que revisarlos.',
      },
      {
        tipo: 'parrafo',
        texto:
          'A quien trabajó no se la borra, se la retira. Sus turnos, sus novedades y sus movimientos de nómina siguen existiendo, que es lo que hace que el consolidado de los meses anteriores siga cuadrando dentro de un año. Borrar de verdad solo aparece para alguien cargado por error, que todavía no tiene ni un turno, y solo lo puede hacer coordinación.',
      },
      {
        tipo: 'parrafo',
        texto:
          'Si marcaste un retiro por equivocación, abajo de la lista está «Ver a quienes ya no están» y ahí podés volver a activarla. Ojo: la persona vuelve, pero los turnos que el retiro liberó no vuelven solos.',
      },
      {
        tipo: 'tabla',
        encabezados: ['Si pasó esto', 'Hacé esto'],
        filas: [
          ['Entró alguien nuevo', '«Agregar persona»'],
          ['Se equivocaron en el nombre, el cargo o las horas', '«···» → «Corregir los datos»'],
          ['Renunció o la trasladaron', '«···» → «Ya no trabaja acá»'],
          ['La cargaste dos veces sin ponerle turnos', '«···» → «La cargué por error» (solo coordinación)'],
          ['Marcaste un retiro que no era', '«Ver a quienes ya no están» → «Volver a activar»'],
        ],
      },
    ],
  },

  {
    id: 'novedades',
    titulo: 'Registrar una incapacidad, un permiso o vacaciones',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'Todo lo que saca a alguien de su turno se registra en el panel «Novedades de la semana», abajo de la pantalla del aforo.',
      },
      {
        tipo: 'pasos',
        items: [
          'En el panel «Novedades de la semana», tocá «Registrar».',
          'Elegí a la persona.',
          'Elegí el tipo: incapacidad, permiso remunerado o no remunerado, ausencia injustificada, vacaciones o licencia.',
          'Si es una incapacidad, elegí la causa. Es obligatoria y arranca vacía a propósito.',
          'Poné el rango de fechas. Podés empezar antes de la semana que estás viendo: una incapacidad casi nunca arranca justo un lunes.',
          'Si querés, escribí un detalle («gastroenteritis», «cita de control»).',
          'Dejá tildado «quitar los turnos de esos días» salvo que la persona sí haya trabajado.',
          'Tocá «Registrar la novedad».',
        ],
      },
      {
        tipo: 'aviso',
        texto:
          'La herramienta te va a decir cuántos turnos liberó, por ejemplo «Registré la novedad y liberé 4 turnos». Si el número no es el que esperabas, revisá el rango de fechas antes de seguir.',
      },
      {
        tipo: 'parrafo',
        texto:
          'Registrar una novedad hace tres cosas en un solo paso: guarda la causa, libera los turnos de esos días y recalcula las horas y las reglas. Si esas cosas estuvieran separadas, la causa quedaría de un lado y el rastro del cambio del otro, y el tablero de ausentismo nunca se llenaría.',
      },
      {
        tipo: 'parrafo',
        texto:
          'Si la novedad cruza más de una semana, la herramienta libera los turnos de todas las semanas que toque y las actualiza a todas, no solo a la que tenés abierta.',
      },
    ],
  },

  {
    id: 'alertas',
    titulo: 'Las alertas: qué revisa la herramienta',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'El motor de reglas corre solo cada vez que guardás un turno o copiás una semana. Las alertas que dicen «Bloquea» impiden publicar; las que dicen «Aviso» no, pero quedan registradas.',
      },
      {
        tipo: 'tabla',
        encabezados: ['La alerta dice', 'Qué significa'],
        filas: [
          [
            'Queda con más horas que su contrato',
            'Bloquea. El tope es el de cada persona, no un número fijo: 42 h jornada completa, 21 h medio tiempo, 36 h aprendiz',
          ],
          ['Queda con menos días de descanso que el mínimo', 'Bloquea. Todos necesitan al menos un día libre en la semana'],
          ['Tiene dos bloques cruzados', 'Bloquea. Los dos horarios del turno partido se pisan entre sí'],
          ['Solo descansa X horas entre un turno y el otro', 'Aviso. El mínimo está en 12 horas y es un valor a calibrar con operación'],
          ['Encadena X días seguidos', 'Aviso. El máximo está en 6 días'],
          ['Reparto desparejo de aperturas o cierres', 'Aviso. Alguien del mismo cargo tiene muchas más que otro'],
        ],
      },
      {
        tipo: 'parrafo',
        texto: 'Cuando una alerta bloquea y el caso igual está bien:',
      },
      {
        tipo: 'pasos',
        items: [
          'En el panel de alertas, tocá «Justificar y aceptar» debajo de la alerta.',
          'Escribí por qué el caso es aceptable.',
          'Guardá. La alerta se cierra y tu explicación queda guardada con tu nombre.',
        ],
      },
      {
        tipo: 'aviso',
        texto:
          'Justificar no es un truco para saltarse la regla: es dejar registrado quién autorizó la excepción y con qué argumento. Eso es lo que permite defender la decisión después.',
      },
    ],
  },

  {
    id: 'publicar',
    titulo: 'Publicar y cambiar después',
    bloques: [
      {
        tipo: 'parrafo',
        texto: 'Una semana pasa por tres estados:',
      },
      {
        tipo: 'tabla',
        encabezados: ['Estado', 'Qué se puede hacer'],
        filas: [
          ['Borrador', 'La estás armando. Cambiá lo que quieras, las reglas avisan pero no molestan'],
          ['Publicada', 'Es el aforo oficial. Se puede seguir cambiando, pero cada cambio pide el motivo y queda registrado'],
          ['Cerrada', 'Congelada. Ya no admite cambios: es la foto contra la que se compara la nómina'],
        ],
      },
      {
        tipo: 'parrafo',
        texto:
          'Si el botón «Publicar el aforo» está apagado, abajo dice por qué: o todavía no hay ningún turno cargado, o hay alertas que bloquean. Resolvelas o justificalas y el botón se enciende.',
      },
      {
        tipo: 'parrafo',
        texto:
          'Para cambiar un turno de una semana ya publicada, tocá la celda o el día como siempre. La herramienta te va a pedir el motivo del cambio: incapacidad, permiso, cambio operativo, solicitud del colaborador, corrección. Cada cambio queda guardado con quién lo hizo, cuándo y por qué.',
      },
    ],
  },

  {
    id: 'imprimir',
    titulo: 'Mandar el aforo al grupo',
    bloques: [
      {
        tipo: 'pasos',
        items: [
          'En el menú «Más», tocá «Imprimir».',
          'Se abre la hoja de la semana en horizontal, lista para leer.',
          'Tocá «Imprimir o guardar PDF».',
          'En el diálogo del navegador elegí «Guardar como PDF» y orientación horizontal.',
          'Mandá el archivo por donde lo mandes siempre.',
        ],
      },
    ],
  },

  {
    id: 'archivo',
    titulo: 'Cargar el aforo desde una foto o un Excel',
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'En el menú «Más» está «Leer un archivo». Acepta una foto, un PDF o un Excel y transcribe la grilla automáticamente.',
      },
      {
        tipo: 'pasos',
        items: [
          'Menú «Más» → «Leer un archivo».',
          'Subí la foto, el PDF o el Excel.',
          'Esperá a que termine de leerlo.',
          'Revisá la pantalla que aparece: marca los turnos que no se leyeron con certeza y los nombres que no cruzaron con nadie de la tienda.',
          'Corregí lo que esté mal y destildá lo que no va.',
          'Recién ahí, aplicalo al aforo.',
        ],
      },
      {
        tipo: 'aviso',
        texto:
          'Nada se escribe solo. Esa pantalla de revisión no es burocracia: la diferencia entre leer 14:40 y 11:40 en una foto con reflejo son tres horas extra que nadie autorizó, y no hay forma de saber cuál de las dos era. Una persona decide.',
      },
      {
        tipo: 'parrafo',
        texto:
          'Si el botón aparece apagado con la leyenda «la lectura automática todavía no está configurada», es algo que falta habilitar del lado del servidor, no un error tuyo. Mientras tanto cargá los turnos a mano; el resto de la herramienta funciona igual.',
      },
    ],
  },

  {
    id: 'nomina',
    titulo: 'Cargar el reporte de nómina',
    soloCoordinacion: true,
    bloques: [
      {
        tipo: 'pasos',
        items: [
          'Entrá a «Nómina».',
          'Elegí el año, el mes y la tienda del reporte.',
          'Subí el archivo CSV que manda nómina.',
          'Mirá el resumen: cuántas filas se leyeron y cuántas cruzaron.',
          'Si quedaron filas sin cruzar, revisá la lista de abajo: casi siempre es un código de empleado que no coincide.',
        ],
      },
      {
        tipo: 'parrafo',
        texto:
          'El cruce se hace por código de empleado y por concepto. Solo los conceptos marcados como extra o recargo entran a la comparación; todo lo demás del reporte se descarta solo.',
      },
      {
        tipo: 'aviso',
        texto:
          'La lista de conceptos sigue hoy los códigos estándar de nómina en Colombia. Con un reporte real de Frisby se ajusta a los códigos que use la empresa, y a partir de ahí la comparación es exacta. Es lo más importante que falta para que esta parte sirva del todo.',
      },
      {
        tipo: 'parrafo',
        texto:
          'Borrar un reporte se lleva también sus movimientos y la comparación de ese período. Por eso es lo único en toda la herramienta que pregunta dos veces antes de hacerlo.',
      },
    ],
  },

  {
    id: 'consolidado',
    titulo: 'Comparar lo planeado con lo pagado',
    soloCoordinacion: true,
    bloques: [
      {
        tipo: 'pasos',
        items: [
          'Cargá primero el reporte de nómina del mes en la sección «Nómina».',
          'Entrá a «Consolidado» y elegí el mes.',
          'Tocá «Comparar el mes».',
          'Leé la tabla: aparecen solo los casos donde lo planeado y lo pagado no coinciden, ordenados por lo que más pesa en plata.',
          'Para el caso que corresponda, abrí el borrador del llamado de atención.',
          'Revisalo, ajustalo si hace falta, y mandalo.',
        ],
      },
      {
        tipo: 'parrafo',
        texto:
          'La tabla no lista a todo el mundo a propósito. Si una persona está ahí, es porque hay algo que mirar: la idea es no leer fila por fila.',
      },
    ],
  },

  {
    id: 'ausentismo',
    titulo: 'El tablero de ausentismo',
    soloCoordinacion: true,
    bloques: [
      {
        tipo: 'parrafo',
        texto:
          'Muestra los días perdidos, las causas y la evolución por mes, filtrable por año y por tienda. Hay vista de tabla como alternativa a los gráficos.',
      },
      {
        tipo: 'parrafo',
        texto:
          'Se llena solo con las novedades que los administradores registran en su aforo: nadie carga nada dos veces. Por eso importa que la causa de una incapacidad se elija de verdad y no quede una puesta por descarte — es el número con el que se van a tomar decisiones de seguridad en el trabajo.',
      },
    ],
  },

  {
    id: 'problemas',
    titulo: 'Si algo no sale',
    bloques: [
      {
        tipo: 'tabla',
        encabezados: ['Lo que ves', 'Qué hacer'],
        filas: [
          [
            '«Esa semana ya está cerrada y no admite cambios»',
            'La semana se congeló para comparar contra nómina. Pedile a coordinación que la reabra si hay que corregir algo',
          ],
          [
            'El botón de publicar está apagado',
            'Abajo dice el motivo: o no hay turnos cargados, o hay alertas que bloquean. Resolvelas o justificalas',
          ],
          [
            '«No tenés permiso para editar esta tienda»',
            'Tu usuario no tiene esa tienda asignada. Avisá a coordinación',
          ],
          [
            '«Se cerró la sesión. Volvé a entrar»',
            'Pasó demasiado tiempo. Entrá de nuevo; lo que ya guardaste está guardado',
          ],
          [
            '«No hay conexión»',
            'Es la señal del teléfono. Lo último que hiciste no se guardó: reintentalo cuando vuelva',
          ],
          [
            'Copiaste y no trajo a alguien',
            'El resumen dice por qué. Casi siempre es que la persona figura como inactiva o tiene una novedad esos días',
          ],
          [
            'Las alertas no reflejan un cambio de contrato',
            'Se recalculan al guardar un turno o al copiar una semana. Tocá cualquier turno y guardalo para forzar el recálculo',
          ],
          [
            'Falta alguien en el aforo, o sobra',
            'Entrá a «Personas»: se agrega con «Agregar persona», y quien se fue con «···» → «Ya no trabaja acá»',
          ],
          [
            '«El código X ya es de otra persona»',
            'Ese código de empleado está cargado en alguien más, a veces en otra tienda que no ves. Revisalo contra el reporte de nómina',
          ],
          [
            '«Ya tiene historial en la herramienta y no se puede borrar»',
            'Tiene turnos, novedades o nómina cargados. No se borra: se marca «Ya no trabaja acá», que la saca del aforo y conserva lo que trabajó',
          ],
          [
            '«Solo coordinación puede borrar a una persona»',
            'Borrar del todo es de coordinación. Retirarla sí podés, y es lo que corresponde cuando ya trabajó',
          ],
          [
            'Retiraste a alguien por error',
            'Abajo de la lista de Personas, «Ver a quienes ya no están» → «Volver a activar». Ojo: los turnos que el retiro liberó no vuelven solos',
          ],
        ],
      },
    ],
  },
]
