/**
 * Genera el manual en un HTML autocontenido desde el mismo manual.ts que usa la
 * app. Se genera, no se transcribe: si el manual cambia adentro de la
 * herramienta, este archivo se vuelve a generar y no se desincroniza.
 */
const fs = require('fs')
const path = require('path')

const SCRATCH = __dirname
const { MANUAL } = require(path.join(SCRATCH, 'manualjs/manual.js'))
const MEDIA = '/Users/tomaslopez/Herramienta-Monica/app/.next/static/media'

function fuente(archivo) {
  return fs.readFileSync(path.join(MEDIA, archivo)).toString('base64')
}

const INTER = fuente('83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2')
const MONO = fuente('70bc3e132a0a741e-s.p.3t6q91iet4nsy.woff2')

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/** Lo que va entre comillas angulares es un literal de la interfaz: va en mono */
const rico = (s) => esc(s).replace(/«([^»]+)»/g, '<span class="ui">«$1»</span>')

function bloque(b) {
  switch (b.tipo) {
    case 'parrafo':
      return `<p>${rico(b.texto)}</p>`
    // El texto va envuelto en un <span>: el <li> es una grilla de dos columnas
    // (cifra · texto), y sin el envoltorio cada «literal» en mono se convertiría
    // en una celda propia y partiría la frase en pedazos.
    case 'pasos':
      return `<ol class="pasos">${b.items
        .map((t) => `<li><span>${rico(t)}</span></li>`)
        .join('')}</ol>`
    case 'lista':
      return `<ul class="puntos">${b.items
        .map((t) => `<li><span>${rico(t)}</span></li>`)
        .join('')}</ul>`
    case 'aviso':
      return `<aside class="aviso"><p>${rico(b.texto)}</p></aside>`
    case 'tabla':
      return `<div class="tabla-caja"><table>
  <thead><tr>${b.encabezados.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${b.filas
    .map(([a, c]) => `<tr><td>${rico(a)}</td><td>${rico(c)}</td></tr>`)
    .join('')}</tbody>
</table></div>`
    default:
      return ''
  }
}

const secciones = MANUAL.map((s, i) => {
  const n = String(i + 1).padStart(2, '0')
  return `<section id="${s.id}">
  <header class="cabecera-seccion">
    <span class="numero" aria-hidden="true">${n}</span>
    <h2>${esc(s.titulo)}</h2>
    ${s.soloCoordinacion ? '<p class="solo">Solo coordinación</p>' : ''}
  </header>
  ${s.bloques.map(bloque).join('\n  ')}
</section>`
}).join('\n\n')

const indice = MANUAL.map(
  (s, i) =>
    `<li><a href="#${s.id}"><span class="idx-n">${String(i + 1).padStart(2, '0')}</span>${esc(
      s.titulo,
    )}</a></li>`,
).join('')

const html = `<title>Herramienta Mónica · Manual de uso</title>
<style>
@font-face {
  font-family: 'Inter';
  src: url(data:font/woff2;base64,${INTER}) format('woff2');
  font-weight: 100 900;
  font-display: block;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url(data:font/woff2;base64,${MONO}) format('woff2');
  font-weight: 100 800;
  font-display: block;
}

/* ---------------------------------------------------------------------------
   Paleta heredada de la herramienta: superficies frías y neutras, un solo
   acento cálido (el amarillo Frisby) y el ámbar sobrio de los avisos.
   --------------------------------------------------------------------------- */
:root {
  --papel:        #f2f4f7;
  --hoja:         #ffffff;
  --tinta:        #16191f;
  --tinta-suave:  #5b6472;
  --tinta-tenue:  #8b95a4;
  --linea:        #e3e7ed;
  --linea-fuerte: #c8cfd9;
  --acento:       #f5a623;
  --acento-texto: #a8690a;
  --aviso-tinta:  #8a5a12;
  --aviso-fondo:  #fdf4e3;
  --sombra:       0 1px 2px rgb(16 25 40 / .04), 0 18px 48px -24px rgb(16 25 40 / .18);
}

@media (prefers-color-scheme: dark) {
  :root {
    --papel:        #0f1115;
    --hoja:         #181b21;
    --tinta:        #eceef2;
    --tinta-suave:  #a3acba;
    --tinta-tenue:  #6f7886;
    --linea:        #272c35;
    --linea-fuerte: #3a414d;
    --acento:       #f5a623;
    --acento-texto: #f0ab3d;
    --aviso-tinta:  #e8b45c;
    --aviso-fondo:  #241d11;
    --sombra:       0 1px 2px rgb(0 0 0 / .3), 0 18px 48px -24px rgb(0 0 0 / .6);
  }
}

:root[data-theme='dark'] {
  --papel:        #0f1115;
  --hoja:         #181b21;
  --tinta:        #eceef2;
  --tinta-suave:  #a3acba;
  --tinta-tenue:  #6f7886;
  --linea:        #272c35;
  --linea-fuerte: #3a414d;
  --acento:       #f5a623;
  --acento-texto: #f0ab3d;
  --aviso-tinta:  #e8b45c;
  --aviso-fondo:  #241d11;
  --sombra:       0 1px 2px rgb(0 0 0 / .3), 0 18px 48px -24px rgb(0 0 0 / .6);
}

:root[data-theme='light'] {
  --papel:        #f2f4f7;
  --hoja:         #ffffff;
  --tinta:        #16191f;
  --tinta-suave:  #5b6472;
  --tinta-tenue:  #8b95a4;
  --linea:        #e3e7ed;
  --linea-fuerte: #c8cfd9;
  --acento:       #f5a623;
  --acento-texto: #a8690a;
  --aviso-tinta:  #8a5a12;
  --aviso-fondo:  #fdf4e3;
  --sombra:       0 1px 2px rgb(16 25 40 / .04), 0 18px 48px -24px rgb(16 25 40 / .18);
}

body {
  margin: 0;
  background: var(--papel);
  color: var(--tinta);
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

.envoltura {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 20px 96px;
}

/* --- Portada ------------------------------------------------------------- */
.portada {
  display: grid;
  gap: 20px;
  padding: 72px 0 44px;
  border-bottom: 1px solid var(--linea);
}
.marca {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--tinta-suave);
}
.punto {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--acento);
  flex: none;
}
h1 {
  margin: 0;
  font-size: clamp(2.1rem, 5.5vw, 3.4rem);
  line-height: 1.06;
  letter-spacing: -.028em;
  font-weight: 650;
  text-wrap: balance;
  max-width: 20ch;
}
.bajada {
  margin: 0;
  max-width: 60ch;
  font-size: 1.0625rem;
  color: var(--tinta-suave);
  text-wrap: pretty;
}
.pie-portada {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11.5px;
  color: var(--tinta-tenue);
  font-variant-numeric: tabular-nums;
}

/* --- Cuerpo: índice fijo + columna de lectura ---------------------------- */
.cuerpo {
  display: grid;
  gap: 48px;
  padding-top: 48px;
}
@media (min-width: 1000px) {
  .cuerpo {
    grid-template-columns: 232px minmax(0, 1fr);
    gap: 64px;
  }
}

.indice {
  align-self: start;
}
@media (min-width: 1000px) {
  .indice {
    position: sticky;
    top: 32px;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
  }
}
.indice h2 {
  margin: 0 0 12px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--tinta-tenue);
}
.indice ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 1px;
  counter-reset: none;
}
.indice a {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 6px;
  padding: 6px 8px 6px 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--tinta-suave);
  text-decoration: none;
  border-radius: 6px;
  transition: color .15s, background .15s;
}
.indice a:hover,
.indice a:focus-visible {
  color: var(--tinta);
  background: color-mix(in srgb, var(--acento) 12%, transparent);
}
.idx-n {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: var(--tinta-tenue);
  font-variant-numeric: tabular-nums;
  padding-left: 8px;
}

.lectura {
  display: grid;
  gap: 28px;
  min-width: 0;
}

/* --- Sección ------------------------------------------------------------- */
.lectura > section {
  background: var(--hoja);
  border: 1px solid var(--linea);
  border-radius: 10px;
  box-shadow: var(--sombra);
  padding: 34px 30px 36px;
  display: grid;
  gap: 16px;
  scroll-margin-top: 24px;
}
@media (min-width: 700px) {
  .lectura > section { padding: 40px 44px 44px; }
}

.cabecera-seccion {
  display: grid;
  gap: 4px;
  padding-bottom: 4px;
}
.numero {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .1em;
  color: var(--acento-texto);
  font-variant-numeric: tabular-nums;
}
.cabecera-seccion h2 {
  margin: 0;
  font-size: clamp(1.25rem, 2.6vw, 1.55rem);
  line-height: 1.2;
  letter-spacing: -.018em;
  font-weight: 620;
  text-wrap: balance;
}
.solo {
  margin: 2px 0 0;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--tinta-tenue);
}

.lectura p {
  margin: 0;
  max-width: 66ch;
  color: var(--tinta-suave);
  text-wrap: pretty;
}

/* Literales de la interfaz, en la misma mono que usa la herramienta */
/* Sin nowrap: «Copiar el aforo de la semana pasada» no entra en un teléfono */
.ui {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: .875em;
  color: var(--tinta);
}

.pasos {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: paso;
  display: grid;
  gap: 11px;
  max-width: 68ch;
}
.pasos li {
  counter-increment: paso;
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 13px;
  align-items: baseline;
}
.pasos li::before {
  content: counter(paso, decimal-leading-zero);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--tinta-tenue);
  font-variant-numeric: tabular-nums;
  text-align: right;
  padding-top: 1px;
}

.puntos {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 9px;
  max-width: 66ch;
}
.puntos li {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 4px;
  color: var(--tinta-suave);
}
.puntos li::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--linea-fuerte);
  margin-top: .62em;
}

.aviso {
  background: var(--aviso-fondo);
  border-left: 2px solid var(--acento);
  border-radius: 0 7px 7px 0;
  padding: 14px 18px;
  max-width: 68ch;
}
.aviso p {
  color: var(--aviso-tinta);
  font-size: .9375rem;
  max-width: none;
}
.aviso .ui { color: var(--aviso-tinta); }

.tabla-caja {
  overflow-x: auto;
  border: 1px solid var(--linea);
  border-radius: 8px;
}
table {
  width: 100%;
  min-width: 460px;
  border-collapse: collapse;
  font-size: .9375rem;
  text-align: left;
}
thead th {
  background: color-mix(in srgb, var(--tinta) 4%, var(--hoja));
  border-bottom: 1px solid var(--linea);
  padding: 9px 16px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--tinta-tenue);
  white-space: nowrap;
}
tbody td {
  border-bottom: 1px solid var(--linea);
  padding: 12px 16px;
  vertical-align: top;
  color: var(--tinta-suave);
  line-height: 1.55;
}
tbody td:first-child {
  color: var(--tinta);
  font-weight: 480;
  width: 38%;
}
tbody tr:last-child td { border-bottom: 0; }

footer {
  margin-top: 44px;
  padding-top: 22px;
  border-top: 1px solid var(--linea);
  font-size: 13px;
  color: var(--tinta-tenue);
  max-width: 66ch;
}
footer p { margin: 0 0 6px; color: inherit; }

a { color: var(--acento-texto); }
:focus-visible {
  outline: 2px solid var(--acento);
  outline-offset: 2px;
  border-radius: 4px;
}
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
  html { scroll-behavior: auto; }
}
html { scroll-behavior: smooth; }

/* --- Papel --------------------------------------------------------------- */
@media print {
  body { background: #fff; color: #000; font-size: 10.5pt; }
  .envoltura { max-width: none; padding: 0; }
  .indice { display: none; }
  .cuerpo { display: block; padding-top: 24px; }
  .portada { padding: 0 0 24px; }
  .lectura > section {
    box-shadow: none;
    border: 0;
    border-top: 1px solid #bbb;
    border-radius: 0;
    padding: 18px 0 8px;
    break-inside: avoid;
  }
  .aviso { background: #f4f4f4; }
  .tabla-caja { break-inside: avoid; }
}
</style>

<div class="envoltura">
  <header class="portada">
    <p class="marca"><span class="punto"></span>Herramienta Mónica</p>
    <h1>Manual de uso</h1>
    <p class="bajada">
      El paso a paso de cada tarea, ordenado por trabajo y no por pantalla. Es el
      mismo manual que está dentro de la herramienta, en el signo de pregunta de
      la barra de arriba — ahí también está el recorrido guiado, que señala cada
      parte de la pantalla que tenés abierta.
    </p>
    <p class="pie-portada">
      <span>Aforos y horas extra</span>
      <span>12 secciones</span>
      <span>3 de agosto de 2026</span>
    </p>
  </header>

  <div class="cuerpo">
    <nav class="indice" aria-label="Índice del manual">
      <h2>Contenido</h2>
      <ol>${indice}</ol>
    </nav>

    <main class="lectura">
${secciones}

      <footer>
        <p>
          Las secciones marcadas «Solo coordinación» corresponden a pantallas que
          un administrador de tienda no ve, y no aparecen en su copia del manual
          dentro de la app.
        </p>
        <p>
          Documento generado desde el manual que vive en la herramienta: si algo
          cambia adentro, este archivo se regenera y no queda desactualizado.
        </p>
      </footer>
    </main>
  </div>
</div>
`

// Dos salidas del mismo contenido:
//  · el archivo suelto que se manda por correo o WhatsApp, con su documento
//    completo — sin `meta charset` los acentos se rompen al abrirlo local;
//  · la variante para publicar como página, que ya viene envuelta en su <head>.
const documento = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
${html.replace(/^<title>/, '<title>')}
</body>
</html>
`
  .replace('<div class="envoltura">', '</head>\n<body>\n<div class="envoltura">')

const [salidaDoc, salidaPagina] = process.argv.slice(2)
fs.writeFileSync(salidaDoc, documento)
console.log('archivo suelto:', salidaDoc, (documento.length / 1024).toFixed(0) + ' KB')
if (salidaPagina) {
  fs.writeFileSync(salidaPagina, html)
  console.log('para publicar :', salidaPagina, (html.length / 1024).toFixed(0) + ' KB')
}
