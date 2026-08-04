/**
 * Traduce cualquier error a una frase que una persona pueda leer.
 *
 * La regla que hace esto mecánico en vez de veinte decisiones: PostgREST
 * devuelve `code: 'P0001'` para todo `raise exception` nuestro, y esos mensajes
 * ya están escritos en español para un humano. Ese es el único allowlist: lo
 * que escribimos nosotros se muestra tal cual, todo lo demás se traduce.
 *
 * Lo que no se reconoce nunca se muestra crudo, pero tampoco se pierde: va al
 * log del servidor. Ocultarlo de la pantalla no puede costar la capacidad de
 * diagnosticar.
 */

type ErrorConCodigo = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

const POR_CODIGO: Record<string, string> = {
  // 23505 · unique_violation
  '23505': 'Ese turno ya estaba cargado.',
  // 23514 · check_violation
  '23514': 'Ese dato no cumple una regla del sistema.',
  // 23503 · foreign_key_violation
  '23503': 'Falta un dato relacionado: puede que la persona o la tienda ya no exista.',
  // 23502 · not_null_violation
  '23502': 'Quedó un campo obligatorio sin llenar.',
  // 22007 / 22008 · fecha mal formada
  '22007': 'Alguna fecha quedó mal escrita.',
  '22008': 'Alguna fecha quedó mal escrita.',
  // 42501 · insufficient_privilege · PGRST301 · JWT vencido
  '42501': 'No tenés permiso para editar esta tienda.',
  PGRST301: 'Se cerró la sesión. Volvé a entrar.',
  // PGRST116 · el select esperaba una fila y no la encontró
  PGRST116: 'No encontramos ese registro. Puede que alguien lo haya borrado.',
}

const GENERICO = 'No se pudo guardar. Probá de nuevo; si sigue pasando, avisanos.'

function esObjeto(x: unknown): x is ErrorConCodigo {
  return typeof x === 'object' && x !== null
}

/**
 * @param error  lo que devolvió Supabase, o cualquier excepción
 * @param donde  etiqueta para el log del servidor: qué se estaba intentando
 */
export function mensajeAmable(error: unknown, donde?: string): string {
  if (donde) console.error(`[${donde}]`, error)
  else console.error(error)

  if (!esObjeto(error)) return GENERICO

  const codigo = error.code ?? ''

  // Los raise exception de nuestras funciones ya vienen escritos para leerse.
  if (codigo === 'P0001') {
    const base = error.message?.trim()
    if (!base) return GENERICO
    const pista = error.hint?.trim()
    return pista ? `${base}. ${pista}` : base
  }

  const conocido = POR_CODIGO[codigo]
  if (conocido) return conocido

  // Sin código: el fetch se cayó, no llegó al servidor.
  if (!codigo && error.message?.includes('fetch')) {
    return 'No hay conexión. Revisá la señal y volvé a intentar.'
  }

  return GENERICO
}
