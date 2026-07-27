# Herramienta Mónica

Control de aforos y horas extra para Frisby. Una sola base conecta los dos
procesos que hoy viven separados: **lo planeado** (el aforo de la semana) y
**lo real** (el reporte de nómina).

> El proceso 1 llena la columna planeado, el proceso 2 llena la columna real,
> y la comparación se vuelve automática.

## El ciclo

```
   El admin planea en la plantilla
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
| El admin llena la plantilla única | `semanas` + `turnos` |
| Un turno partido (dos bloques el mismo día) | dos filas de `turnos` con `orden_bloque` 1 y 2 |
| Suma horas y valida 42h · descanso · equidad | `validar_semana()` sobre `v_resumen_semanal` |
| Los parámetros de cada regla | `reglas` (con override por tienda) |
| Lo que el motor encuentra | `validaciones` |
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
| `MAX_HORAS_SEMANA` | bloqueante | `horas_max: 42` |
| `DIA_DESCANSO` | bloqueante | `dias_min: 1` |
| `SOLAPE_TURNOS` | bloqueante | — |
| `DESCANSO_ENTRE_TURNOS` | advertencia | `horas_min: 12` |
| `MAX_DIAS_CONSECUTIVOS` | advertencia | `dias_max: 6` |
| `EQUIDAD_APERTURAS` / `EQUIDAD_CIERRES` / `EQUIDAD_PARTIDOS` | advertencia | `brecha_max: 2` |

Una tienda puede sobrescribir cualquier regla global: basta una fila en `reglas`
con el mismo `codigo` y su `tienda_id`.

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

- **`/cronograma/[tienda]/[semana]`** — la grilla semanal, con las bandas por
  cargo del cronograma de Sipo. Se toca una celda y se arma el turno; un partido
  son dos bloques. Abajo, lo que encontró el motor, las ausencias de la semana y
  los adjuntos.
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

### Las dos vías de entrada del aforo

El admin puede llenar la plantilla en la grilla **o** subir la foto/PDF de lo que
mandó. El archivo queda adjunto a la semana como evidencia y se marca
«sin pasar a la plantilla» hasta que alguien lo transcribe. El motor sigue
validando sobre los turnos, no sobre la imagen: es lo único que se puede sumar.

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

## Estado

Lo que está hecho:

- Esquema completo con RLS, trazabilidad y motor de reglas
- Conciliación planeado vs real y generación de borradores
- Cronograma editable con validación en vivo y publicación bloqueada por reglas
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
   `conceptos_nomina` son preliminares y sin eso la conciliación no sirve
3. Modo oscuro: la app es clara en todas sus pantallas, incluidos los gráficos.
   Es coherente hoy, pero si se agrega hay que elegir los tonos de los gráficos
   contra la superficie oscura, no invertirlos
4. Lector automático de la foto del aforo, si se decide que vale la pena

### Decisiones que conviene confirmar con Mónica

- **Imputación de semanas a meses:** una semana se imputa al mes de su lunes.
  Simple y explicable, pero la semana que cruza fin de mes cae entera en el mes
  anterior.
- **Umbrales de equidad y descanso entre jornadas** (12h) son un punto de
  partida; el aforo real de Q40 los incumple en 5 casos, así que hay que
  calibrarlos con el criterio de operación.
- **Los códigos de concepto de nómina** hay que ajustarlos con un reporte real.
