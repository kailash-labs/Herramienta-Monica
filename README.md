# Herramienta Mónica

Control de aforos y horas extra para Frisby. Una sola base conecta los dos
procesos que hoy viven separados: **lo planeado** (el aforo de la semana) y
**lo real** (el reporte de nómina).

> El proceso 1 llena la columna planeado, el proceso 2 llena la columna real,
> y la comparación se vuelve automática.

## El ciclo

```
   El admin copia la semana anterior y ajusta
                ↓
   El sistema valida y previene la extra
                ↓
            Cierre de mes
                ↓
   Llega el reporte real de nómina
                ↓
   El sistema reconcilia real contra reportado
                ↓
   ¿No cuadra? → llamado de atención
```

## Del flujograma al esquema

Cada paso de los dos flujogramas tiene su lugar en la base:

| Paso del proceso | Dónde vive |
|---|---|
| El admin llena el aforo de la semana | `semanas` + `turnos` |
| Copiar el aforo de la semana anterior | `copiar_aforo_semana()` / `crear_aforo_copiando_anterior()` |
| Un turno partido (dos bloques el mismo día) | dos filas de `turnos` con `orden_bloque` 1 y 2 |
| Suma horas y valida 42h · descanso · equidad | `validar_semana()` sobre `v_resumen_semanal` |
| Los parámetros de cada regla | `reglas` (con override por tienda) |
| Las alertas del motor | `validaciones` |
| Dashboard en verde / semana lista | `publicar_semana()` — falla si hay bloqueantes |
| Cambios de la semana: enfermedad, ausencia | `cambios_turno` (trigger automático) + `ausencias` |
| Dashboard acumulado de ausentismo | `ausencias` (tipo, causa, días) |
| Frisby envía el reporte de nómina | `reportes_nomina` + `movimientos_nomina` |
| Separa extras y recargos, descarta lo demás | `conceptos_nomina` → `v_extras_reales` |
| Compara real contra lo reportado | `conciliar_periodo()` → `conciliacion_detalle` |
| Borrador de llamado de atención | `generar_alertas_conciliacion()` → `alertas` |
| El texto del mensaje, sin reescribirlo | `plantillas_mensaje` |

## Reglas del motor

Las bloqueantes impiden publicar la semana; las advertencias avisan y quedan
registradas. Todas viven en la tabla `reglas` y se ajustan sin tocar código.

| Código | Severidad | Parámetro |
|---|---|---|
| `MAX_HORAS_SEMANA` | bloqueante | el contrato de cada persona · `horas_max: 42` como techo |
| `DIA_DESCANSO` | bloqueante | `dias_min: 1` |
| `SOLAPE_TURNOS` | bloqueante | — |
| `DESCANSO_ENTRE_TURNOS` | advertencia | `horas_min: 12` |
| `MAX_DIAS_CONSECUTIVOS` | advertencia | `dias_max: 6` |
| `EQUIDAD_APERTURAS` / `EQUIDAD_CIERRES` / `EQUIDAD_PARTIDOS` | advertencia | `brecha_max: 2` |

Una tienda puede sobrescribir cualquier regla global: basta una fila en `reglas`
con el mismo `codigo` y su `tienda_id`.

**El tope de horas es por persona, no global.** Cada colaborador tiene su
`horas_contrato`: 42 h tiempo completo, 21 h medio tiempo, 36 h aprendiz — se
derivan del `tipo_jornada` al darlo de alta. `horas_max` quedó como techo
absoluto, para atajar un contrato mal cargado.

### Rotación de descansos

La rotación no se puede juzgar desde una sola semana, así que va como vista
mensual y no como regla del motor: `v_descansos_mensual` muestra qué días
descansó cada persona, y `rotacion_fin_semana(tienda, mes)` señala a quien
acumula fines de semana libres mientras otro de su mismo cargo no tiene ninguno.

`v_novedades_mensual` da los días de vacaciones e incapacidad por persona y mes
— la base para liquidar los incentivos trimestrales.

## Simplicidad: qué decisiones la sostienen

La herramienta cubría lo que se pidió, pero estaba armada como la pensó el
desarrollador y no como la usa la gente. Cinco cosas cambiaron eso.

**Copiar la semana anterior es la acción principal.** Cargar los seis días de una
sola persona a mano son ~28 toques; una tienda de diecisiete personas es
impracticable desde un celular. `copiar_aforo_semana()` convierte *crear* en
*corregir*: se copian los turnos y se ajusta lo que cambió. Nunca sobrescribe —
lo único que podría destruir es trabajo hecho a mano y no hay deshacer — así que
omite los días ya cargados, las personas que no están y los días con una novedad
registrada, y **dice qué omitió y por qué**.

**Una acción principal por pantalla.** La barra del aforo tenía cinco botones del
mismo peso, y el único destacado era «Publicar» — la acción *final*. Ahora hay un
botón primario según el estado de la semana y el resto en un menú «Más».

**Ningún error de base de datos llega a la pantalla.** `lib/mensajes.ts` traduce
todo. La regla que lo hace mecánico: PostgREST devuelve `P0001` para todo
`raise exception` nuestro, y esos mensajes ya están escritos para una persona —
ese es el único allowlist. Lo que no se reconoce va al log del servidor con su
detalle técnico y a la pantalla como una frase con el próximo paso.

**Una palabra por concepto**: aforo (no cronograma ni plantilla), comparar (no
cruzar ni conciliar), alertas (no hallazgos ni validaciones). Y el **nombre antes
que el código**: Mónica lee «Marta Gómez», no `07351`.

**Ningún default que invente un dato.** La causa de una incapacidad arrancaba en
«viral»: si nadie la tocaba, una causa clínica que nadie eligió entraba al
tablero con el que se decide sobre seguridad en el trabajo. Ahora arranca vacía y
el botón no se habilita sin ella.

### Lo que no se puede hacer, y por qué

- **Publicar con alertas que bloquean.** El botón se deshabilita y dice cuántas
  faltan. El predicado del cliente es el mismo que usa `publicar_semana`; si se
  cambia uno hay que cambiar el otro, y el camino de error del servidor se
  conserva porque el motor reevalúa al publicar.
- **Borrar un reporte de nómina de un clic.** Se lleva en cascada sus movimientos
  y la comparación del período: pide confirmación nombrando lo que se va a
  borrar. Es el único botón de la app que pregunta dos veces — poner confirmación
  en todos convertiría la carga desde el celular en un desfile de diálogos.
- **Borrar a alguien que ya trabajó.** `eliminar_colaborador` se niega si hay un
  turno, una novedad o un movimiento de nómina, y responde con qué hacer en su
  lugar. Ver más abajo.

### Quien trabajó no se borra, se retira

Es la decisión que ordena la pantalla de personal. Los turnos, las novedades y
los movimientos de nómina de una persona son lo que hace que el consolidado de un
mes cerrado siga cuadrando dentro de un año: borrarla en cascada se los lleva y
deja al mes sin contra qué comparar.

Entonces hay dos operaciones distintas y no una:

| | Retirar | Borrar |
|---|---|---|
| Cuándo | Renunció, la trasladaron | Se cargó por error o duplicada |
| Qué hace | `fecha_retiro` + `activo = false` | `delete` |
| Historial | Intacto | No hay ninguno que perder |
| Turnos | Libera los **posteriores** a la fecha de retiro, y solo en semanas abiertas | — |
| Quién | Admin de tienda o coordinación | Solo coordinación |
| Reversible | Sí, «Volver a activar» | No |

La fecha de retiro es el **último día trabajado**, así que ese día conserva su
turno y se liberan los siguientes. Las semanas `cerrada` no se tocan, por lo
mismo que en `registrar_ausencia`: ya se conciliaron contra nómina.

La interfaz no ofrece «Borrar» donde la base va a negarse — la pantalla resuelve
de antemano quién tiene historial. Un menú con una opción que casi siempre falla
enseña a desconfiar del menú.

## Roles y acceso

RLS en todas las tablas.

- **coordinador** (Mónica) — ve y opera todas las tiendas, carga la nómina,
  concilia y envía alertas.
- **admin_tienda** — arma y edita el aforo de las tiendas que tiene asignadas
  en `perfil_tiendas`.
- **observador** — solo lectura.

## Trazabilidad

Cada alta, edición o baja de un turno queda en `cambios_turno` con quién, cuándo
y **por qué**. La app declara el motivo antes de escribir:

```sql
select set_config('app.motivo_cambio', 'incapacidad', true);
select set_config('app.ausencia_id', '<uuid de la ausencia>', true);
delete from turnos where ...;
```

Sin motivo declarado, un alta queda como `planeacion_inicial` y cualquier otro
cambio como `otro` — nunca se pierde el registro.

## Desarrollo

```bash
supabase start          # levanta la base local (puertos 544xx)
supabase db reset       # aplica migraciones + seed
supabase db advisors --local --type security
```

El seed carga el aforo real de **Q40 Unicentro Armenia, semana del 3 al 9 de
noviembre de 2025**, tomado del cronograma exportado de Sipo. Las horas
semanales calculadas coinciden con las del PDF original, así que sirve para
probar el motor contra un horario que de verdad se ejecutó.

Correr el motor sobre esa semana:

```sql
select * from validar_semana((select id from semanas limit 1));
```

## La aplicación

Next.js 16 (App Router) en `app/`, contra la misma base.

```bash
cd app
npm install
npm run dev          # http://localhost:3040
```

Usuarios de desarrollo (los crea `supabase/seed_usuarios.sql`, se corre a mano):

| Correo | Clave | Rol |
|---|---|---|
| `monica@kailash.co` | `monica123` | coordinador — ve todo |
| `mauricio@kailash.co` | `admin123` | admin de Q40 |

```bash
{ echo "set app.entorno_local = 'si';"; cat supabase/seed_usuarios.sql; } \
  | docker exec -i supabase_db_Herramienta-Monica psql -U postgres -d postgres
```

El archivo se niega a correr sin esa confirmación: crea cuentas con contraseñas
conocidas, y en producción serían una puerta abierta. Para dar de alta gente de
verdad, invitarla desde el dashboard y usar `supabase/promover_coordinador.sql`.

### Pantallas

- **`/cronograma/[tienda]/[semana]`** — el aforo de la semana. **Una sola
  pantalla que se adapta al ancho**: en pantalla ancha es la grilla de siete
  columnas con las bandas por cargo; en pantalla angosta es una lista de personas
  y la semana de cada una en vertical, con los horarios más usados de la tienda a
  un toque. Las dos vistas están en el DOM y el CSS muestra una — sin detección
  por JavaScript y sin que el usuario elija nada. Abajo, las alertas del motor,
  las novedades de la semana y los adjuntos.

  Si la semana todavía no existe, la acción principal es **copiar el aforo de la
  semana pasada**; empezar en blanco queda como salida secundaria.
- **`/personal/[tienda]`** — la gente de la tienda, agrupada por cargo igual que
  el aforo. Una acción principal, «Agregar persona»; el resto en el «···» de cada
  fila. Quien ya no está queda detrás de un toque, que es lo que permite deshacer
  un retiro mal cargado. `/personal` sin tienda redirige solo cuando hay una sola,
  igual que la portada. Está en la barra también para el admin de tienda: sin
  poder dar de alta a alguien nuevo no puede armar su aforo.
- **`/consolidado`** — solo coordinación. Planeado contra real de todas las
  tiendas del mes, ordenado por lo que no cuadra, con el borrador del llamado de
  atención a un clic.
- **`/nomina`** — solo coordinación. Entra el CSV del reporte, se cruza por
  código de empleado y concepto, y lo que no cruzó queda listado aparte en vez de
  perderse.
- **`/ausentismo`** — solo coordinación. El acumulado: días perdidos, causas de
  incapacidad y evolución por mes, filtrable por año y tienda. Con vista de tabla
  como alternativa a los gráficos.
- **`/cronograma/[tienda]/[semana]/imprimir`** — hoja horizontal lista para
  «Guardar como PDF» y mandar al grupo.

### Ayuda dentro de la app

El signo de pregunta de la barra de arriba abre dos cosas.

**Recorrido guiado.** Oscurece la pantalla, recorta el elemento del que está
hablando y pone el texto al lado. Señala los elementos **reales** de la página,
no un dibujo de la página: cada paso apunta a un `data-guia` del DOM
(`components/guia/pasos.ts`). Eso trae dos propiedades que importan:

- **Un paso cuyo elemento no está en pantalla se salta solo.** La misma lista de
  pasos sirve para el admin y para coordinación, para la semana vacía y para la
  cargada. En la semana sin cargar el recorrido son 5 pasos; en la cargada, 12.
  No hay condicionales por rol ni por estado.
- **La lista y la grilla del aforo son dos anclajes distintos** y solo sobrevive
  el que de verdad se está viendo, porque los dos conviven en el DOM y se elige
  el que ocupa lugar. En un celular el recorrido explica la lista; en una
  computadora, la grilla.

Arranca solo la primera vez que alguien entra y no vuelve a aparecer. Una
herramienta que hay que estudiar antes de usar no se usa, y quien la abre en
medio de un turno no va a buscar la ayuda por su cuenta.

**Manual escrito** (`components/guia/manual.ts`). El paso a paso de cada tarea,
organizado por trabajo y no por pantalla: nadie abre la herramienta pensando
«voy a la sección aforos», la abre pensando «tengo que cargar la semana».
Incluye qué significa cada alerta, los tres estados de una semana y una tabla de
«si algo no sale». A un administrador de tienda no se le muestran las secciones
de coordinación: no puede entrar a esas pantallas.

Dos detalles de implementación que costaron encontrar y conviene no revertir:

- **El scroll es instantáneo, no suave.** Además de que el usuario quiere ver de
  qué se le habla y no mirar una animación, `scrollIntoView({behavior:'smooth'})`
  simplemente no scrollea en algunos contextos, y el recorrido quedaba señalando
  un elemento fuera de pantalla.
- **El alto del globo se mide, no se estima.** Con un número fijo, los pasos que
  traen el porqué —bastante más altos— terminaban tapando justo el elemento que
  estaban señalando.

### Ausencias: una sola acción

Una incapacidad casi nunca es de un día. Registrarla desde el panel de la semana
guarda tipo, causa, rango y detalle, **libera los turnos de esos días** y deja
cada cambio en la bitácora vinculado a esa ausencia. Las horas y las reglas se
recalculan en el mismo paso.

Si estuviera separado —crear la ausencia por un lado, borrar tres turnos por
otro— la causa quedaría de un lado y la trazabilidad del otro, y el tablero de
ausentismo nunca tendría con qué llenarse.

En la grilla, un día liberado por ausencia se pinta distinto de un descanso
normal: dice por qué está vacío.

### Leer un aforo desde un archivo

**Leer un archivo**, en el menú «Más» del aforo, acepta una foto, un PDF o un Excel y
transcribe la grilla automáticamente con Claude (`claude-opus-5`). El Excel se
parsea en el servidor y se manda como texto; la foto y el PDF van directo al
modelo.

**Lo leído no se escribe solo.** Aparece una pantalla de revisión con lo que se
entendió, marcando los turnos que el modelo no leyó con certeza y los nombres
que no cruzaron con ningún colaborador. Se corrige lo que haga falta, se
destilda lo que no va, y recién ahí se aplica.

Esa pantalla no es burocracia: la diferencia entre `14:40` y `11:40` en una foto
con reflejo son tres horas extra que nadie autorizó, y el sistema no tiene forma
de saber cuál de las dos era. El modelo marca su propia incertidumbre y una
persona decide.

Requiere `ANTHROPIC_API_KEY` en `app/.env.local`. Sin la clave el botón aparece
deshabilitado con la leyenda «la lectura automática todavía no está configurada»,
y la instrucción para el desarrollador va al log del servidor: que falte una
variable de entorno no es un error de quien está usando la herramienta.

### Las dos vías de entrada del aforo

El admin puede armar el aforo a mano **o** subir la foto/PDF de lo que mandó. El
archivo queda adjunto a la semana como evidencia y se marca «sin pasar al aforo»
hasta que alguien lo transcribe. El motor sigue validando sobre los turnos, no
sobre la imagen: es lo único que se puede sumar.

### Detalles de la implementación

- **Next 16** renombró `middleware` a `proxy` y `cookies()` pasó a ser
  asíncrono; ambas cosas están contempladas en `src/proxy.ts` y
  `src/lib/supabase/server.ts`.
- **El motivo del cambio** viaja en la misma transacción que la escritura
  (`guardar_turno_dia`). Si la app hiciera `set_config` en una llamada y el
  insert en otra, el pool de PostgREST las separaría y la bitácora perdería el
  motivo.
- **`perfilActual()`** filtra por `id` explícitamente: un coordinador ve todos
  los perfiles por RLS, así que un `select` sin filtro devuelve varias filas y
  `.single()` falla justo para quien más permisos tiene.
- **Storage** valida el primer segmento de la ruta (`<tienda>/<semana>/archivo`)
  contra los permisos del usuario, con parseo tolerante: una ruta mal formada
  deniega en vez de reventar.
- **Los mensajes de las reglas se corrigieron con un `replace` verificado** sobre
  el cuerpo de `validar_semana`, no copiando sus 200 líneas: era un cambio de
  ortografía, y reescribir la función que decide si una semana se puede publicar
  para arreglar un acento es la forma más fácil de romper algo que funcionaba. El
  helper que lo hace se borra al final de la migración — una función que ejecuta
  texto arbitrario no tiene por qué quedar instalada.
- **El resumen de la copia viaja por `sessionStorage`** (`aviso-traspaso.ts`). Al
  copiar desde la pantalla vacía, el servidor empieza a devolver la grilla y el
  componente que hizo la copia se desmonta antes de poder contar qué copió.

## Estado

Lo que está hecho:

- Esquema completo con RLS, trazabilidad y motor de reglas
- Comparación de planeado contra real y generación de borradores
- Aforo editable con validación en vivo y publicación bloqueada por reglas
- Una sola pantalla de aforo que sirve en celular y en escritorio
- Copiado del aforo de la semana anterior, con detalle de lo que omitió
- Registro de ausencias con causa, que libera turnos y recalcula al vuelo
- Subida de foto/PDF del aforo, aislada por tienda
- Cargador de nómina en CSV y consolidado para coordinación
- Seed con el aforo real de una tienda

### Contra el flujograma «Cronograma en tiempo real»

| Paso | Estado |
|---|---|
| Admin publica el aforo oficial en PDF | Completo |
| Sistema valida 42h, descanso y equidad | Completo |
| Admin registra cambios: enfermedad, ausencia | Completo |
| Sistema guarda con trazabilidad, recalcula extras | Completo |
| PDF o vista en vivo | Completo |
| Alimenta el dashboard acumulado de ausentismo | Completo |

Lo que sigue:

1. Conectar el proyecto Supabase remoto (`zeuduwmfxgzgqwiejnsh`) y hacer `db push`
2. **Mapear los códigos de concepto reales** de un reporte de Frisby — los de
   `conceptos_nomina` son preliminares y sin eso la comparación no sirve
3. **Una pantalla que responda «quién tiene horas extra»**. Hoy ninguna lo hace, y
   es una de las preguntas centrales de Mónica.
4. **Pantalla de personal**: dar de alta, retirar y cambiar el contrato de una
   persona. Al cambiar `horas_contrato` tiene que revalidar las semanas abiertas
   de esa persona, porque las alertas guardan su mensaje ya armado y hoy solo se
   refrescan al editar un turno o al copiar una semana.
5. Modo oscuro: la app es clara en todas sus pantallas, incluidos los gráficos.
   Es coherente hoy, pero si se agrega hay que elegir los tonos de los gráficos
   contra la superficie oscura, no invertirlos

### Un defecto de cascada que la pantalla de personal volvió alcanzable

Borrar una `semana`, una `tienda` o un `colaborador` **fallaba** si tenía turnos:
el `on delete cascade` borra los turnos, y el trigger de trazabilidad intentaba
escribir en `cambios_turno` referenciando una fila padre que ya no existía. No
molestaba mientras ninguna pantalla borrara nada de eso.

Arreglado en `20260803120000_personal.sql` con un guard en
`app.registrar_cambio_turno()`: en un `DELETE` cuyo padre ya no está, no se
escribe la bitácora. Tampoco haría falta — `cambios_turno` cuelga de la semana y
de la tienda con `on delete cascade`, así que se iría detrás del padre igual.

El parche se aplica con un reemplazo quirúrgico sobre `pg_get_functiondef`, no
reescribiendo la función: así sobrevive cualquier cambio que otra migración le
haya hecho al cuerpo, y si la función cambió de forma la migración falla ruidosa
en vez de revertir el trabajo de otro en silencio.

### Decisiones que conviene confirmar con Mónica

- **Imputación de semanas a meses:** una semana se imputa al mes de su lunes.
  Simple y explicable, pero la semana que cruza fin de mes cae entera en el mes
  anterior.
- **Umbrales de equidad y descanso entre jornadas** (12h) son un punto de
  partida; el aforo real de Q40 los incumple en 5 casos, así que hay que
  calibrarlos con el criterio de operación.
- **Los códigos de concepto de nómina** hay que ajustarlos con un reporte real.
