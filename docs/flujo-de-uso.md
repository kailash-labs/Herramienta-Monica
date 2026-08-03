# Flujo de uso de la herramienta

Cómo se usa la herramienta de punta a punta: qué hace la persona, qué hace el
sistema por su cuenta, y qué queda registrado.

---

## El ciclo, en una frase

El administrador carga el horario de la semana, el sistema valida las horas antes
de que se conviertan en extras, las novedades y los descansos se van acumulando
solos, y al cierre del mes el reporte de Frisby se cruza contra lo que se había
planeado. Coordinación solo mira las excepciones.

```
        ┌──────────────── LUNES ────────────────┐
        │  El administrador carga el horario    │
        └───────────────────┬───────────────────┘
                            ▼
                 El sistema valida las horas
                  (21 h / 42 h, descansos)
                            │
        ┌───────────── DURANTE LA SEMANA ───────┐
        │  Incapacidades, ausencias, cambios    │
        └───────────────────┬───────────────────┘
                            ▼
              Se recalculan las extras al vuelo
              y todo queda con fecha y responsable
                            │
        ┌────────────── CIERRE DE MES ──────────┐
        │  Llega el reporte de Frisby           │
        └───────────────────┬───────────────────┘
                            ▼
              El sistema cruza real vs. planeado
              y avisa solo de lo que no cuadra
```

---

## Momento 1 · Inicio de semana: cargar el horario

### Lo que hace la persona

El administrador entra a la herramienta y ve la semana en blanco o con el
horario de la semana anterior como punto de partida. Tiene tres caminos, y puede
combinarlos:

1. **Llenarla directo en la plataforma.** Toca la celda de una persona en un día
   y escribe la hora de entrada y de salida. Si el turno es partido, agrega un
   segundo bloque.
2. **Cargar un archivo.** Sube la foto del horario que armó, el Excel donde lo
   trabajó, o el PDF que exportó del sistema de Frisby. La herramienta lo lee y
   propone el horario completo.
3. **Adjuntar el archivo como respaldo.** Si prefiere seguir armándolo por fuera,
   igual puede dejar la foto o el PDF adjunto a la semana, para que quede
   constancia de lo que envió.

Cuando carga un archivo, **la herramienta no escribe nada todavía**: muestra lo
que entendió para que la persona lo revise. Los horarios que no pudo leer con
certeza quedan resaltados, y los nombres que no coinciden con nadie de la tienda
se señalan aparte. La persona corrige lo que haga falta y confirma.

> Ese paso de revisión es deliberado. En una foto con reflejo, `14:40` y `11:40`
> se parecen, y son tres horas extra de diferencia. La herramienta marca su
> propia incertidumbre en lugar de adivinar.

### Lo que hace el sistema por su cuenta

- Suma las horas de cada persona en el día y en la semana.
- Compara ese total contra el contrato de cada uno: **21 horas si es medio
  tiempo, 42 si es tiempo completo**.
- Verifica que todos tengan su día de descanso.
- Revisa que haya descanso suficiente entre el cierre de un día y la apertura del
  siguiente.
- Revisa que las aperturas, los cierres y los turnos partidos estén repartidos
  parejo dentro de cada cargo.
- Marca los turnos que se cruzan entre sí.

### Lo que queda como salida

- **La semana en pantalla**, con el total de horas de cada persona y las horas
  extra resaltadas.
- **La lista de alertas**, separando las que impiden publicar de las que solo
  avisan.
- **El PDF del horario**, para mandar al grupo.

La semana no se puede publicar mientras haya una alerta que bloquee. O se
corrige el horario, o se justifica la excepción por escrito y queda registrada.

---

## Momento 2 · Durante la semana: los cambios

Esta es la parte que hoy se pierde. Un aforo publicado es una foto; lo que pasa
después no queda en ningún lado.

### Lo que hace la persona

- **Registra una novedad.** Alguien se incapacita, pide permiso, sale a
  vacaciones. Se registra una vez, con el tipo, la causa y el rango de fechas.
- **Reorganiza el horario.** Cubre con otra persona, mueve turnos, ajusta.
- **Declara el motivo.** Cuando la semana ya está publicada, cada cambio pide el
  motivo: incapacidad, ausencia, cambio operativo, corrección.

### Lo que hace el sistema por su cuenta

- Al registrar una novedad, **libera los turnos de esos días** y recalcula las
  horas de la persona. No hay que borrarlos uno por uno.
- Vuelve a correr todas las validaciones. Si al cubrir a alguien la persona que
  la reemplaza queda por encima de su contrato, la alerta aparece en ese momento
   — no al final del mes.
- Guarda cada movimiento con quién lo hizo, cuándo, por qué, y cuántas horas
  sumó o restó.
- Acumula la novedad en el historial de la persona.

### Lo que queda como salida

- **El horario actualizado**, siempre vigente, no una foto del lunes.
- **La bitácora de la semana**: qué cambió, cuándo y por qué.
- **Las novedades del mes**, acumulándose solas.

---

## Momento 3 · Cierre de mes: el cruce con nómina

### Lo que hace la persona

- Sube el reporte de nómina que envía Frisby.
- Revisa lo que no cuadró.
- Manda los avisos que correspondan.

### Lo que hace el sistema por su cuenta

- Separa del reporte las horas extra y los recargos reales, y **descarta el resto
  de los conceptos**. Ese es el paso que hoy se hace a mano cada mes.
- Cruza cada persona por su código de empleado.
- Compara lo que se pagó contra lo que se había planeado en las semanas del mes.
- Clasifica cada diferencia: se pagó de más, falta pagar, o se pagó una extra que
  nunca se planeó.
- **Redacta el llamado de atención** para cada caso que no cuadra, con los
  números adentro.
- Marca aparte las filas del reporte que no pudo cruzar, en lugar de perderlas.

### Lo que queda como salida

- **El consolidado del mes**, todas las tiendas juntas, ordenado por lo que no
  cuadra y con el resto oculto por defecto.
- **Los borradores de aviso**, listos para copiar y enviar.
- **Las novedades del mes por persona**: cuántos días de vacaciones, cuántos de
  incapacidad. Es lo que se necesita para liquidar los incentivos trimestrales
  sin revisar todo de nuevo.
- **Los descansos del mes**: qué días descansó cada persona, y quién viene
  repitiendo descanso en fin de semana sin rotar.

---

## Momento 4 · Control: lo que mira coordinación

Coordinación no revisa horarios. Revisa excepciones.

### Lo que hace la persona

Entra y mira una sola pantalla que junta todo lo que necesita atención:

- Personas por encima de su contrato.
- Semanas sin publicar o con alertas sin resolver.
- Diferencias entre lo pagado y lo planeado.
- Descansos mal repartidos.
- Novedades registradas en el período.
- Avisos redactados y todavía sin enviar.

Desde ahí entra al caso puntual, lo resuelve o lo justifica, y sigue.

### Lo que hace el sistema por su cuenta

- Junta las alertas de todas las tiendas y de todos los tipos en un solo lugar.
- Las ordena por lo que cuesta plata primero.
- Deja de mostrar lo que ya se resolvió o se justificó.

### Lo que queda como salida

- **El tablero de ausentismo acumulado**: causas de incapacidad y evolución mes a
  mes. En dos o tres años es la base para decidir sobre seguridad en el trabajo.
- **El histórico por persona**: sus turnos, sus descansos y sus novedades mes a
  mes.

---

## Estructura de pantallas

| Módulo | Para qué sirve | Quién entra |
|---|---|---|
| **Cronograma** | Cargar y editar la semana. Es la pantalla donde se trabaja. | Administrador y coordinación |
| ↳ Vista celular | Cargar el horario desde el teléfono, persona por persona | Administrador |
| ↳ Leer archivo | Subir foto, Excel o PDF y revisar lo que se leyó | Administrador |
| ↳ Imprimir | Hoja horizontal lista para PDF y para el grupo | Ambos |
| **Personal** | Listado de la tienda: contrato, tipo de jornada, fijo o rotativo | Ambos |
| ↳ Histórico de la persona | Sus turnos, descansos y novedades mes a mes | Ambos |
| **Novedades** | Registrar vacaciones, incapacidades y permisos | Ambos |
| **Descansos** | Qué días descansó cada uno y cómo va la rotación de fines de semana | Coordinación |
| **Nómina** | Subir el reporte de Frisby y ver lo que no cruzó | Coordinación |
| **Consolidado** | Planeado contra real, todas las tiendas, por mes | Coordinación |
| **Alertas** | Bandeja única de todo lo que necesita atención | Coordinación |
| **Ausentismo** | Acumulado del año: causas y evolución | Coordinación |

**Sobre los accesos:** el administrador solo ve y edita sus tiendas.
Coordinación ve todas y es la única que carga nómina, concilia y envía avisos.
Un tercer perfil de solo lectura queda disponible para quien deba consultar sin
poder modificar.

---

## Blueprint funcional

### Cada semana

- [ ] El administrador carga el horario: a mano, o subiendo foto / Excel / PDF
- [ ] Si subió un archivo, revisa lo que la herramienta leyó y confirma
- [ ] El sistema valida horas contra el contrato de cada persona (21 h / 42 h)
- [ ] El sistema valida día de descanso, descanso entre turnos y equidad por cargo
- [ ] Se corrigen o se justifican las alertas que bloquean
- [ ] Se publica la semana y se exporta el PDF

### Durante la semana

- [ ] Se registran las novedades: incapacidad, permiso, vacaciones
- [ ] El sistema libera los turnos de esos días y recalcula
- [ ] Se reorganiza el horario declarando el motivo del cambio
- [ ] El sistema vuelve a validar y avisa si aparecieron extras

### Cada mes

- [ ] Se sube el reporte de nómina de Frisby
- [ ] El sistema separa extras y recargos, y descarta el resto
- [ ] El sistema cruza lo pagado contra lo planeado, por persona y por tienda
- [ ] Coordinación revisa solo lo que no cuadra
- [ ] Se envían los avisos que la herramienta ya redactó
- [ ] Se consultan los días de novedad por persona para los incentivos
- [ ] Se revisa la rotación de descansos de fin de semana

### Todo el tiempo

- [ ] Cada cambio queda con quién, cuándo y por qué
- [ ] Las alertas de todas las tiendas se juntan en una sola bandeja
- [ ] El ausentismo se acumula solo, sin trabajo adicional

---

## Estado al 30 de julio

Lo que sigue es honesto sobre qué se puede mostrar hoy y qué no.

### Ya funciona

| | |
|---|---|
| Cronograma semanal editable, con turnos partidos | Listo |
| Validación de horas, descanso, equidad y solapes | Listo |
| Bloqueo de publicación con alertas sin resolver | Listo |
| Registro de novedades que libera turnos y recalcula | Listo |
| Trazabilidad de cada cambio con motivo | Listo |
| Lectura de foto, Excel y PDF con pantalla de revisión | Listo, falta habilitar la clave del servicio |
| Adjuntar el archivo como respaldo | Listo |
| Export a PDF de la semana | Listo |
| Carga del reporte de nómina y cruce contra lo planeado | Listo, faltan los códigos de concepto reales |
| Borradores de llamado de atención | Listo |
| Consolidado mensual de todas las tiendas | Listo |
| Tablero de ausentismo acumulado | Listo |

### Escrito, pendiente de aplicar

| | |
|---|---|
| Tope de horas según el contrato de cada persona (21 h / 42 h) | Corregido, sin aplicar |
| Días de novedad por persona y por mes | Escrito, sin aplicar |
| Qué días descansó cada persona en el mes | Escrito, sin aplicar |
| Rotación de descansos de fin de semana | Escrito, sin aplicar |

### Falta construir

| | Por qué importa |
|---|---|
| **Carga desde el celular** | La grilla actual es de escritorio. Si los administradores cargan desde el teléfono, hace falta una vista por persona o por día. |
| **Pantalla de personal** | Los datos existen en la base, pero no hay dónde ver ni editar el listado de la tienda. |
| **Marcar quién es fijo y quién rota** | Mónica lo pidió y hoy no existe ese campo. |
| **Bandeja única de alertas** | Hoy las alertas están repartidas: las de la semana en el cronograma, las de nómina en el consolidado. Falta el lugar donde se ven todas juntas. |
| **Histórico por persona** | Los datos están; falta la pantalla que los muestre mes a mes. |

---

## Decisiones que hacen falta

Cuatro cosas que no se pueden resolver sin Mónica:

1. **Los códigos de concepto de nómina.** Los que están cargados son los
   estándar colombianos, puestos de referencia. Sin un reporte real de Frisby
   para mapearlos, el cruce compara contra códigos que no son los suyos. **Es lo
   que más bloquea.**

2. **Los umbrales.** El descanso mínimo entre jornadas está en 12 horas y la
   brecha de equidad en 2 turnos. El aforo real de Q40 incumple las 12 horas en
   cinco casos, así que o el umbral está mal calibrado o esos cinco casos son
   excepciones aceptadas. Lo define la operación, no el sistema.

3. **Las semanas que cruzan de mes.** Hoy una semana se imputa completa al mes de
   su lunes. Es simple y explicable, pero la semana que arranca el 29 cae entera
   en el mes anterior. Si eso distorsiona el cierre, hay que cambiar el criterio.

4. **Quién es fijo y quién rota.** Hace falta saber qué significa exactamente en
   la operación para poder validarlo: si un rotativo tiene reglas distintas de
   descanso o de asignación de fines de semana.
