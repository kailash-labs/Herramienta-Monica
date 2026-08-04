/**
 * Un mensaje que sobrevive al cambio de pantalla, una sola vez.
 *
 * Al copiar el aforo desde la pantalla vacía pasan dos cosas juntas: se escriben
 * los turnos y la semana empieza a existir. Eso hace que el servidor devuelva la
 * grilla en vez de la pantalla vacía, así que el componente que hizo la copia se
 * desmonta antes de poder contar qué copió — y el usuario se quedaría sin saber
 * cuántos días entraron ni a quién se omitió.
 *
 * `sessionStorage` y no un parámetro en la URL: el resumen es una frase larga,
 * no un dato del recurso, y no tiene por qué quedar en el historial ni poder
 * compartirse por enlace.
 */

const CLAVE = 'aforo:aviso'

export function guardarAviso(texto: string) {
  try {
    sessionStorage.setItem(CLAVE, texto)
  } catch {
    // Modo incógnito o storage lleno: el aviso se pierde, la copia no.
  }
}

/** Lo devuelve y lo borra: es de un solo uso, no debe reaparecer al recargar */
export function tomarAviso(): string | null {
  try {
    const texto = sessionStorage.getItem(CLAVE)
    if (texto) sessionStorage.removeItem(CLAVE)
    return texto
  } catch {
    return null
  }
}
