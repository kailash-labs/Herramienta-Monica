import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { hojasATexto, leerExcel } from './leer-excel'

/**
 * Lee un aforo desde una foto, un PDF o un Excel y devuelve los turnos.
 *
 * Deliberadamente NO escribe nada en la base: devuelve lo leido para que una
 * persona lo revise antes de aplicarlo. Un turno mal leido es plata mal pagada,
 * y la diferencia entre '14:40' y '11:40' en una foto borrosa son tres horas
 * extra que nadie autorizo.
 */

const MODELO = 'claude-opus-5'

export const TurnoLeido = z.object({
  colaborador: z
    .string()
    .describe('Nombre o código del colaborador tal como aparece en el documento'),
  cargo: z
    .string()
    .nullable()
    .describe('Cargo o sección bajo la que aparece, si el documento lo indica'),
  dia: z
    .number()
    .int()
    .min(1)
    .max(7)
    .describe('Día de la semana: 1 = lunes, 7 = domingo'),
  bloques: z
    .array(
      z.object({
        inicio: z.string().describe('Hora de inicio en formato HH:MM de 24 horas'),
        fin: z.string().describe('Hora de fin en formato HH:MM de 24 horas'),
      }),
    )
    .describe('Un bloque para un turno normal; dos para un turno partido'),
  confianza: z
    .enum(['alta', 'media', 'baja'])
    .describe(
      'Qué tan legible era este turno en el documento. Usá baja si tuviste que adivinar algún dígito.',
    ),
})

export const AforoLeido = z.object({
  tienda: z
    .string()
    .nullable()
    .describe('Código o nombre de la tienda si aparece en el documento'),
  semana_inicio: z
    .string()
    .nullable()
    .describe('Fecha del lunes de la semana en formato YYYY-MM-DD, si el documento la indica'),
  turnos: z.array(TurnoLeido),
  advertencias: z
    .array(z.string())
    .describe(
      'Todo lo que no pudiste leer con certeza, quedó ambiguo o parece inconsistente. Escribilas en español.',
    ),
})

export type AforoLeido = z.infer<typeof AforoLeido>
export type TurnoLeido = z.infer<typeof TurnoLeido>

const INSTRUCCIONES = `Sos un asistente que transcribe cronogramas de turnos (aforos) de tiendas Frisby a datos estructurados.

El documento es una grilla: cada fila es un colaborador, cada columna un día de la semana (lunes a domingo), y cada celda el horario que trabaja ese día.

Reglas de lectura:
- Las horas van en formato de 24 horas. "2:40 PM" es "14:40". Un aforo de tienda va de la mañana a la noche, así que "8:20" casi siempre es 08:20 y "9:20 - 16:20" es de la mañana a la tarde.
- Una celda con dos horarios ("11:00 - 15:20" y "17:20 - 20:00") es un turno partido: dos bloques el mismo día.
- Una celda vacía, con un guion o con un punto significa que no trabaja ese día. No generes un turno para ella.
- Las filas suelen estar agrupadas bajo un encabezado de cargo (ADMINISTRACIÓN, DESPACHO COMBOS, etc.). Poné ese cargo en cada colaborador del grupo.
- Ignorá filas de totales, subtotales y encabezados repetidos.

Sobre la confianza y las advertencias:
- Marcá confianza "baja" en cualquier turno donde hayas tenido que adivinar un dígito por borrosidad, reflejo, corte o letra ambigua.
- Es mucho mejor marcar algo como dudoso que inventarlo con seguridad. Una persona va a revisar todo esto antes de que se aplique.
- Si no lográs leer una fila entera, no la inventes: dejala afuera y explicá en advertencias qué fila fue y por qué.
- Si el documento no es un aforo, devolvé la lista de turnos vacía y explicalo en advertencias.`

/**
 * Si la lectura automática está disponible. La pantalla lo consulta para mostrar
 * el botón deshabilitado con su leyenda, en vez de dejar que el usuario lo toque
 * y reciba un error que además le pide editar un archivo del servidor.
 */
export function lecturaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

/** Falta configuración del servidor: no es un error del usuario */
export class SinConfigurar extends Error {
  constructor() {
    super('SIN_CONFIGURAR')
  }
}

function cliente() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // La instrucción va al log del servidor, no a la pantalla de la coordinadora
    console.error(
      '[importacion] Falta ANTHROPIC_API_KEY: agregala a app/.env.local para habilitar la lectura automática de archivos.',
    )
    throw new SinConfigurar()
  }
  return new Anthropic({ apiKey })
}

type Entrada =
  | { tipo: 'imagen'; mime: string; base64: string }
  | { tipo: 'pdf'; base64: string }
  | { tipo: 'excel'; datos: Uint8Array }

export async function extraerAforo(entrada: Entrada): Promise<AforoLeido> {
  const anthropic = cliente()

  const contenido: Anthropic.ContentBlockParam[] = []

  if (entrada.tipo === 'imagen') {
    contenido.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: entrada.mime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        data: entrada.base64,
      },
    })
    contenido.push({ type: 'text', text: 'Transcribí el aforo de esta imagen.' })
  } else if (entrada.tipo === 'pdf') {
    contenido.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: entrada.base64 },
    })
    contenido.push({ type: 'text', text: 'Transcribí el aforo de este PDF.' })
  } else {
    const hojas = leerExcel(entrada.datos)
    if (hojas.every((h) => h.filas.length === 0)) {
      throw new Error('El Excel no tiene contenido legible.')
    }
    contenido.push({
      type: 'text',
      text: `Transcribí el aforo de esta planilla. Las celdas van separadas por tabulaciones y cada fila arranca con su número.\n\n${hojasATexto(hojas)}`,
    })
  }

  // Streaming: la extracción de una grilla completa es larga y sin streaming
  // se arriesga un timeout de HTTP.
  const stream = anthropic.messages.stream({
    model: MODELO,
    max_tokens: 32000,
    system: INSTRUCCIONES,
    output_config: { format: zodOutputFormat(AforoLeido) },
    messages: [{ role: 'user', content: contenido }],
  })

  const mensaje = await stream.finalMessage()

  // Los clasificadores pueden declinar: hay que mirar stop_reason antes del contenido
  if (mensaje.stop_reason === 'refusal') {
    throw new Error(
      'El modelo no procesó este archivo. Si el contenido es un aforo normal, probá con otra foto o cargalo a mano.',
    )
  }

  if (mensaje.stop_reason === 'max_tokens') {
    throw new Error(
      'El documento es demasiado grande para leerlo de una vez. Subí una tienda o una semana por archivo.',
    )
  }

  const bloque = mensaje.content.find((b) => b.type === 'text')
  if (!bloque || bloque.type !== 'text') {
    throw new Error('El modelo no devolvió datos legibles.')
  }

  const parseado = AforoLeido.safeParse(JSON.parse(bloque.text))
  if (!parseado.success) {
    throw new Error('La respuesta del modelo no tuvo la forma esperada.')
  }

  return parseado.data
}
