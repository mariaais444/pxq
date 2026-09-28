// Prueba local de la sección de Liquid, sin tienda: renderiza tema/sections/pq-sala.liquid con liquidjs,
// con la sala de ejemplo y productos de prueba, y escribe prototipo/seccion.html.
// Esa página se prueba igual que el prototipo:
//   node scripts/probar-seccion.mjs
//   npx http-server -p 8765 .   (o: python3 -m http.server 8765)
//   node scripts/probar-prototipo.mjs http://localhost:8765/prototipo/seccion.html
//
// Los filtros propios de Shopify (image_url, image_tag, money, asset_url) están imitados de forma simple.
// No reemplaza a `shopify theme dev`: sirve para probar la lógica del Liquid (orden, zonas, datos, lista).

import { Liquid, Tag } from 'liquidjs';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const sala = JSON.parse(await readFile(raiz + 'prototipo/sala/sala.json', 'utf8'));

// --- Datos simulados, con la misma forma que Shopify entrega los metaobjetos ---
const imagen = (img) => ({ __imagen: img }); // un archivo subido (MediaImage)
const precios = { obra: 480000, aparador: 620000, lampara: 95000, sofa: 1350000, sillon: 410000, mesa: 280000 };
let variante = 1000;
const piezas = sala.piezas.map((p) => ({
  system: { handle: p.pieza, type: 'pieza_en_sala' },
  producto: {
    value: {
      title: p.etiqueta + ' (producto de prueba)',
      handle: 'prueba-' + p.pieza,
      url: '#producto-' + p.pieza,
      price: precios[p.pieza] * 100,
      available: p.pieza !== 'lampara',
      selected_or_first_available_variant: { id: ++variante, price: precios[p.pieza] * 100 },
      featured_image: { __producto: p.pieza, alt: p.etiqueta + ' (producto de prueba)' },
    },
  },
  capa: { value: imagen(p.capa) },
  sombra: { value: p.sombra ? imagen(p.sombra) : null },
  orden: { value: p.orden },
  zona: { value: p.zona },
  etiqueta: { value: p.etiqueta },
}));
// En el admin las piezas pueden estar cargadas en cualquier orden: las mezclamos para probar que la sección las ordena.
const mezcladas = [piezas[3], piezas[0], piezas[5], piezas[1], piezas[4], piezas[2]];

const metaobjeto = {
  system: { type: 'sala', handle: sala.id },
  titulo: { value: sala.titulo },
  fondo: { value: imagen(sala.fondo) },
  ancho: { value: sala.ancho },
  alto: { value: sala.alto },
  piezas: { value: mezcladas },
  salas_vecinas: { value: [{ url: '#sala-vecina', titulo: { value: 'Sala vecina' }, system: { handle: 'sala-vecina' } }] },
};

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
liquid.registerFilter('asset_url', (n) => '../tema/assets/' + n);
liquid.registerFilter('stylesheet_tag', (u) => `<link href="${u}" rel="stylesheet" type="text/css" media="all" />`);
liquid.registerFilter('money', (c) => '$ ' + (c / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 }));
liquid.registerFilter('strip_html', (s) => String(s).replace(/<[^>]*>/g, ''));
liquid.registerFilter('image_url', (img, ...args) => {
  const { width } = opciones(args);
  if (img && img.__producto) return 'productos/' + img.__producto + '.webp';
  const src = img.__imagen.src;
  const tamanos = Object.keys(src).map(Number).sort((a, b) => a - b);
  const w = tamanos.find((t) => t >= width) || tamanos.at(-1); // Shopify no agranda
  return { url: 'sala/' + src[w], src, toString: () => 'sala/' + src[w] };
});
liquid.registerFilter('image_tag', (u, ...args) => {
  const o = opciones(args);
  const widths = String(o.widths || '').split(',').map((n) => Number(n.trim()));
  const disponibles = Object.keys(u.src).map(Number);
  const srcset = [...new Set(widths.map((w) => Math.min(w, Math.max(...disponibles))))]
    .filter((w) => u.src[w])
    .map((w) => `sala/${u.src[w]} ${w}w`)
    .join(', ');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const attrs = { src: u.url, srcset, ...o };
  delete attrs.widths;
  return '<img ' + Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ') + '>';
});

const globales = (vendido, puntos) => ({
  section: { id: 'template--1__main', settings: { sala: null, mostrar_puntos: puntos, vendido, texto_ayuda: 'Tocá un mueble u obra para ver su precio. También podés elegir desde la lista.' } },
  metaobject: metaobjeto,
  template: { type: 'metaobject', name: 'sala' },
  request: { design_mode: false },
  cart: { currency: { iso_code: 'ARS' } },
});

const html = await liquid.renderFile('pq-sala', globales('ocultar', true));

// Validaciones rápidas del HTML generado
const orden = [...html.matchAll(/<polygon[^>]*data-pieza="([^"]+)"/g)].map((m) => m[1]);
const esperado = sala.piezas.map((p) => p.pieza);
if (orden.join() !== esperado.join()) throw new Error('Orden de zonas incorrecto: ' + orden.join() + ' (esperado ' + esperado.join() + ')');
const datos = JSON.parse(html.match(/<script type="application\/json" data-pq-productos>([\s\S]*?)<\/script>/)[1]);
if (Object.keys(datos).length !== 6) throw new Error('Faltan productos en el JSON');
console.log('OK   la sección ordena las zonas: ' + orden.join(' → '));
console.log('OK   JSON de productos válido (' + Object.keys(datos).join(', ') + ')');

// Página de prueba: mismo encabezado y carrito simulado que el prototipo; ?vendido= y ?puntos= cambian los settings.
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
    <script>window.PQ_SALA = ${JSON.stringify({ piezas: sala.piezas.map((p) => ({ pieza: p.pieza, etiqueta: p.etiqueta })) })};</script>
    <script src="api-simulada.js"></script>
  </body>
</html>
`;
await writeFile(raiz + 'prototipo/seccion.html', pagina);
console.log('Escrito prototipo/seccion.html');
