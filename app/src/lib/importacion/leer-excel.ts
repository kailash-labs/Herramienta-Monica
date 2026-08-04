import { unzipSync, strFromU8 } from 'fflate'

/**
 * Lector minimo de .xlsx.
 *
 * Un aforo en Excel no es una tabla limpia: es una grilla dibujada a mano, con
 * celdas combinadas y encabezados donde cada quien decidio ponerlos. No hay
 * esquema que respetar, asi que no vale la pena una libreria pesada: alcanza
 * con sacar la grilla de texto y dejar que el modelo la interprete.
 *
 * Un .xlsx es un ZIP de XML. Leemos sharedStrings + cada hoja y devolvemos
 * filas de celdas. Sin dependencias mas alla de fflate (2 KB, sin sub-paquetes).
 */

export type HojaExcel = {
  nombre: string
  filas: string[][]
}

/** 'C7' -> 2 (indice de columna, base 0) */
function columnaDe(ref: string): number {
  const letras = ref.replace(/\d+$/, '')
  let n = 0
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64)
  return n - 1
}

/** 'C7' -> 6 (indice de fila, base 0) */
function filaDe(ref: string): number {
  const m = ref.match(/\d+$/)
  return m ? Number(m[0]) - 1 : 0
}

function desescapar(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&') // siempre al final: si no, re-desescapa lo anterior
}

/** Concatena los <t> de un nodo, que es como Excel parte el texto con formato */
function textoDe(xml: string): string {
  const partes = xml.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []
  return desescapar(partes.map((p) => p.replace(/<[^>]+>/g, '')).join(''))
}

function leerSharedStrings(xml: string | undefined): string[] {
  if (!xml) return []
  const items = xml.match(/<si>[\s\S]*?<\/si>/g) ?? []
  return items.map(textoDe)
}

/**
 * Excel guarda las fechas como numero de serie desde 1900. Un aforo tiene
 * horas ('08:20') que llegan como fraccion de dia, asi que hay que convertirlas
 * o el modelo recibe 0.3472222 en vez de una hora.
 */
function serialAHora(n: number): string | null {
  const frac = n - Math.floor(n)
  if (frac === 0) return null
  const totalMin = Math.round(frac * 24 * 60)
  const h = Math.floor(totalMin / 60) % 24
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function leerExcel(datos: Uint8Array): HojaExcel[] {
  let archivos: Record<string, Uint8Array>
  try {
    archivos = unzipSync(datos)
  } catch {
    throw new Error('El archivo no parece un .xlsx válido.')
  }

  const compartidas = leerSharedStrings(
    archivos['xl/sharedStrings.xml'] ? strFromU8(archivos['xl/sharedStrings.xml']) : undefined,
  )

  // Nombres de hoja en orden; el orden del workbook coincide con sheet1, sheet2…
  const wb = archivos['xl/workbook.xml'] ? strFromU8(archivos['xl/workbook.xml']) : ''
  const nombres = [...wb.matchAll(/<sheet[^>]*name="([^"]*)"/g)].map((m) => desescapar(m[1]))

  const rutas = Object.keys(archivos)
    .filter((r) => /^xl\/worksheets\/sheet\d+\.xml$/.test(r))
    .sort((a, b) => {
      const n = (s: string) => Number(s.match(/sheet(\d+)/)![1])
      return n(a) - n(b)
    })

  const hojas: HojaExcel[] = []

  for (let i = 0; i < rutas.length; i++) {
    const xml = strFromU8(archivos[rutas[i]])
    const filasXml = xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) ?? []

    const grilla: string[][] = []
    let maxCol = 0

    for (const filaXml of filasXml) {
      const celdas = filaXml.match(/<c[^>]*(?:\/>|>[\s\S]*?<\/c>)/g) ?? []
      let idxFila = -1
      const fila: string[] = []

      for (const celda of celdas) {
        const ref = celda.match(/r="([A-Z]+\d+)"/)?.[1]
        if (!ref) continue
        if (idxFila < 0) idxFila = filaDe(ref)
        const col = columnaDe(ref)
        maxCol = Math.max(maxCol, col)

        const tipo = celda.match(/t="([^"]*)"/)?.[1]
        let valor = ''

        if (tipo === 's') {
          // Índice a la tabla de cadenas compartidas
          const idx = Number(celda.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? -1)
          valor = compartidas[idx] ?? ''
        } else if (tipo === 'inlineStr') {
          valor = textoDe(celda)
        } else {
          const crudo = celda.match(/<v>([\s\S]*?)<\/v>/)?.[1]
          if (crudo !== undefined) {
            const n = Number(crudo)
            const hora = Number.isFinite(n) ? serialAHora(n) : null
            valor = hora ?? desescapar(crudo)
          }
        }

        fila[col] = valor
      }

      if (idxFila >= 0) grilla[idxFila] = fila
    }

    // Normalizar: sin huecos, sin filas totalmente vacías al final
    const normal = grilla.map((f) =>
      Array.from({ length: maxCol + 1 }, (_, c) => (f?.[c] ?? '').toString().trim()),
    )
    while (normal.length && normal[normal.length - 1].every((c) => c === '')) normal.pop()

    hojas.push({ nombre: nombres[i] ?? `Hoja ${i + 1}`, filas: normal.filter(Boolean) })
  }

  return hojas
}

/** Grilla a texto delimitado, que es lo que se le manda al modelo */
export function hojasATexto(hojas: HojaExcel[], maxFilas = 300): string {
  return hojas
    .map((h) => {
      const filas = h.filas.slice(0, maxFilas)
      const truncada = h.filas.length > maxFilas
      const cuerpo = filas
        .map((f, i) => `${i + 1}\t${f.join('\t')}`)
        .join('\n')
      return `### Hoja: ${h.nombre}\n${cuerpo}${truncada ? `\n… (${h.filas.length - maxFilas} filas más)` : ''}`
    })
    .join('\n\n')
}
