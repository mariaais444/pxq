// Prueba local de la sección de Liquid, sin tienda: renderiza tema/sections/pq-sala.liquid con liquidjs,
// con las salas de prueba y productos de prueba. Escribe:
//   - prototipo/seccion.html: la Sala 1 sola, con un encabezado simple (la usa probar-prototipo.mjs).
//   - prototipo/salas/sala-ejemplo.html y prototipo/salas/sala-2.html: las dos salas con el diseño de
//     página real (tema/layout/pq-sala.liquid) y las puertas entre ellas (la usa probar-puertas.mjs).
//
//   node scripts/probar-seccion.mjs
//   python3 -m http.server 8765           (desde la raíz del repo)
//   node scripts/probar-prototipo.mjs http://localhost:8765/prototipo/seccion.html
//   node scripts/probar-puertas.mjs
//
// Los filtros propios de Shopify (image_url, image_tag, money, asset_url) están imitados de forma simple.
// No reemplaza a `shopify theme dev`: sirve para probar la lógica del Liquid (orden, zonas, puertas, datos).

import { Liquid, Tag } from 'liquidjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const leer = async (dir) => ({ dir, ...JSON.parse(await readFile(raiz + `prototipo/${dir}/sala.json`, 'utf8')) });
const salas = [await leer('sala'), await leer('sala-2')];
const URLS = { 'sala-ejemplo': '/prototipo/salas/sala-ejemplo.html', 'sala-2': '/prototipo/salas/sala-2.html' };

// --- Datos simulados, con la misma forma que Shopify entrega los metaobjetos ---
const imagen = (img, dir) => ({ __imagen: img, dir }); // un archivo subido (MediaImage)
const precios = { obra: 480000, aparador: 620000, lampara: 95000, sofa: 1350000, sillon: 410000, mesa: 280000 };
let variante = 1000; // mismo orden que prototipo/api-simulada.js: piezas de la Sala 1 y después de la Sala 2
const pieza = (p, dir) => {
  const precio = precios[p.pieza] || 100000;
  return {
    system: { handle: p.pieza, type: 'pieza_en_sala' },
    producto: {
      value: {
        title: p.etiqueta + ' (producto de prueba)',
        handle: 'prueba-' + p.pieza,
        url: '#producto-' + p.pieza,
        price: precio * 100,
        available: p.pieza !== 'lampara',
        selected_or_first_available_variant: { id: ++variante, price: precio * 100 },
        featured_image: { __producto: p.pieza.replace(/2$/, ''), alt: p.etiqueta + ' (producto de prueba)' },
      },
    },
    capa: { value: imagen(p.capa, dir) },
    sombra: { value: p.sombra ? imagen(p.sombra, dir) : null },
    orden: { value: p.orden },
    zona: { value: p.zona },
    etiqueta: { value: p.etiqueta },
  };
};
const metaobjetos = {};
for (const s of salas) {
  const piezas = s.piezas.map((p) => pieza(p, s.dir));
  // En el admin las piezas pueden estar cargadas en cualquier orden: las damos vuelta para probar que la sección las ordena.
  metaobjetos[s.id] = {
    system: { type: 'sala', handle: s.id },
    url: URLS[s.id],
    titulo: { value: s.titulo },
    fondo: { value: imagen(s.fondo, s.dir) },
    ancho: { value: s.ancho },
    alto: { value: s.alto },
    piezas: { value: piezas.reverse() },
  };
}
for (const s of salas) {
  metaobjetos[s.id].puertas = {
    value: s.puertas.map((pu) => ({
      system: { handle: pu.id, type: 'puerta_sala' },
      destino: { value: metaobjetos[pu.destino] },
      zona: { value: pu.zona },
      etiqueta: { value: pu.etiqueta },
      capa_cerrada: { value: pu.capa_cerrada ? imagen(pu.capa_cerrada, s.dir) : null },
      capa_abierta: { value: pu.capa_abierta ? imagen(pu.capa_abierta, s.dir) : null },
    })),
  };
}

// --- Motor de Liquid con los tags y filtros de Shopify que usa la sección ---
const liquid = new Liquid({ root: [raiz + 'tema/sections', raiz + 'tema/snippets'], extname: '.liquid', jsTruthy: false });
class Ignorar extends Tag {
  constructor(token, rest, liquid) {
    super(token, rest, liquid);
    const fin = 'end' + token.name;
    while (rest.length && rest.shift().name !== fin);
  }
  *render() {}
}
liquid.registerTag('schema', Ignorar);
liquid.registerTag('doc', Ignorar);

const opciones = (args) => Object.fromEntries(args.filter(Array.isArray));
liquid.registerFilter('asset_url', (n) => '/tema/assets/' + n);
liquid.registerFilter('stylesheet_tag', (u) => `<link href="${u}" rel="stylesheet" type="text/css" media="all" />`);
liquid.registerFilter('money', (c) => '$ ' + (c / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 }));
liquid.registerFilter('strip_html', (s) => String(s).replace(/<[^>]*>/g, ''));
liquid.registerFilter('image_url', (img, ...args) => {
  const { width } = opciones(args);
  if (img && img.__producto) return '/prototipo/productos/' + img.__producto + '.webp';
  const src = img.__imagen.src;
  const base = `/prototipo/${img.dir}/`;
  const tamanos = Object.keys(src).map(Number).sort((a, b) => a - b);
  const w = tamanos.find((t) => t >= width) || tamanos.at(-1); // Shopify no agranda
  return { url: base + src[w], src, base, toString: () => base + src[w] };
});
liquid.registerFilter('image_tag', (u, ...args) => {
  const o = opciones(args);
  const widths = String(o.widths || '').split(',').map((n) => Number(n.trim()));
  const disponibles = Object.keys(u.src).map(Number);
  const srcset = [...new Set(widths.map((w) => Math.min(w, Math.max(...disponibles))))]
    .filter((w) => u.src[w])
    .map((w) => `${u.base}${u.src[w]} ${w}w`)
    .join(', ');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const attrs = { src: u.url, srcset, ...o };
  delete attrs.widths;
  return '<img ' + Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ') + '>';
});

const globales = (sala) => ({
  section: { id: 'template--1__main', settings: { sala: null, tamano: 'pantalla', mostrar_puntos: true, vendido: 'ocultar', texto_ayuda: 'Tocá un mueble u obra para ver su precio. También podés elegir desde la lista.' } },
  metaobject: sala,
  template: { type: 'metaobject', name: 'sala' },
  request: { design_mode: false, path: sala.url, locale: { iso_code: 'es' } },
  cart: { currency: { iso_code: 'ARS' }, item_count: 0 },
});
// Datos para api-simulada.js: todas las piezas, en el mismo orden que las variantes de arriba.
const datosPrueba = `<script>window.PQ_SALA = ${JSON.stringify({ piezas: salas.flatMap((s) => s.piezas.map((p) => ({ pieza: p.pieza, etiqueta: p.etiqueta }))) })};</script>
    <script src="/prototipo/api-simulada.js"></script>`;

// --- Sala 1 sola (probar-prototipo.mjs) ---
const html = await liquid.renderFile('pq-sala', globales(metaobjetos['sala-ejemplo']));
const orden = [...html.matchAll(/<polygon[^>]*data-pieza="([^"]+)"/g)].map((m) => m[1]);
const esperado = salas[0].piezas.map((p) => p.pieza);
if (orden.join() !== esperado.join()) throw new Error('Orden de zonas incorrecto: ' + orden.join() + ' (esperado ' + esperado.join() + ')');
const datos = JSON.parse(html.match(/<script type="application\/json" data-pq-productos>([\s\S]*?)<\/script>/)[1]);
if (Object.keys(datos).length !== 6) throw new Error('Faltan productos en el JSON');
if (!/class="pq-sala__puerta"[^>]*href|href="[^"]+"\s+data-pq-puerta/.test(html.replace(/\s+/g, ' '))) throw new Error('La Sala 1 no tiene la puerta');
console.log('OK   la sección ordena las zonas: ' + orden.join(' → '));
console.log('OK   JSON de productos válido (' + Object.keys(datos).join(', ') + ')');

const pagina = `<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>p*q · Sección renderizada (prueba local)</title>
    <link rel="icon" href="data:,">
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: #fbf8f3; color: #1d1a17; }
      .encabezado { display: flex; justify-content: space-between; padding: 1rem clamp(1rem, 4vw, 2.5rem); }
      .encabezado a { color: inherit; }
      main { max-width: 1280px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <header class="encabezado">
      <strong>p*q</strong>
      <div id="shopify-section-cart-icon-bubble"><a href="#carrito">Carrito (<span data-contador>0</span>)</a></div>
    </header>
    <main>
<!-- Generado por scripts/probar-seccion.mjs a partir de tema/sections/pq-sala.liquid. No editar. -->
${html}
    </main>
    <script>
      // Settings de la sección por URL, solo para esta prueba.
      (() => {
        const q = new URLSearchParams(location.search), s = document.querySelector('[data-pq-sala]');
        if (q.get('vendido') === 'punto') s.dataset.vendido = 'punto';
        if (q.get('puntos') === 'no') s.dataset.puntos = 'no';
        s.dataset.seccionesCarrito = 'cart-icon-bubble';
      })();
    </script>
    ${datosPrueba}
  </body>
</html>
`;
await writeFile(raiz + 'prototipo/seccion.html', pagina);
console.log('Escrito prototipo/seccion.html');

// --- Las dos salas con el diseño real y las puertas (probar-puertas.mjs) ---
await mkdir(raiz + 'prototipo/salas', { recursive: true });
for (const s of salas) {
  const sala = metaobjetos[s.id];
  const seccion = `<div id="shopify-section-template--1__main" class="shopify-section">${await liquid.renderFile('pq-sala', globales(sala))}</div>`;
  const layout = await liquid.parseAndRender(await readFile(raiz + 'tema/layout/pq-sala.liquid', 'utf8'), {
    ...globales(sala),
    page_title: s.titulo,
    page_description: '',
    canonical_url: sala.url,
    shop: { name: 'p*q' },
    routes: { root_url: '/', cart_url: '#carrito' },
    content_for_header: '<link rel="icon" href="data:,">',
    content_for_layout: seccion + '\n    ' + datosPrueba,
  });
  await writeFile(raiz + `prototipo/salas/${s.id}.html`, layout);
  console.log(`Escrito prototipo/salas/${s.id}.html (${s.puertas.length} puerta)`);
}
