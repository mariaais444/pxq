#!/usr/bin/env node
// Prepara una sala por capas para la web.
//
//   node scripts/preparar-sala.mjs <carpeta-de-capas> <carpeta-de-salida>
//
// Lee 00_fondo.png, 10_sombra_<pieza>.png y 20_objeto_<pieza>.png (todas del
// mismo tamaño) y, opcionalmente, sala.config.json con el orden y los nombres.
// Para cada capa genera WebP en 1600 y 800 px de ancho (sin agrandar: si el
// lienzo es más chico que 1600, se usa su ancho real), calcula el contorno
// clickeable de cada objeto y escribe sala.json (y sala.data.js, para poder
// abrir el prototipo con doble clic, sin servidor).

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ANCHOS = [1600, 800];
const UMBRAL_ALFA = 128; // píxel "sólido" desde este valor de opacidad
const MARGEN_ZONA = 6; // px que se agranda la zona para que sea fácil de tocar
const MAX_PUNTOS = 40;
const SEPARACION_PUNTO = 2.5; // % del alto por encima de la pieza
const RADIO_PUNTO = 12; // px del lienzo que ocupa el punto; no puede pisar otra pieza

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) {
  console.error('Uso: node scripts/preparar-sala.mjs <carpeta-de-capas> <carpeta-de-salida>');
  process.exit(1);
}

const archivos = (await fs.readdir(entrada)).filter((f) => f.toLowerCase().endsWith('.png'));
const fondo = archivos.find((f) => /^00_fondo\.png$/i.test(f));
if (!fondo) throw new Error('Falta 00_fondo.png en ' + entrada);

const config = await leerConfig(path.join(entrada, 'sala.config.json'));
const objetos = new Map();
const sombras = new Map();
for (const f of archivos) {
  let m;
  if ((m = f.match(/^20_objeto_(.+)\.png$/i))) objetos.set(m[1], f);
  else if ((m = f.match(/^10_sombra_(.+)\.png$/i))) sombras.set(m[1], f);
}
for (const p of sombras.keys()) {
  if (!objetos.has(p)) console.warn(`Aviso: 10_sombra_${p}.png no tiene objeto con el mismo nombre.`);
}

const meta = await sharp(path.join(entrada, fondo)).metadata();
const ancho = meta.width;
const alto = meta.height;

await fs.mkdir(salida, { recursive: true });

// Orden: el del config; si falta, las piezas más abajo en la imagen van adelante.
const infoPiezas = [];
for (const [pieza, archivo] of objetos) {
  const { data, info } = await sharp(path.join(entrada, archivo)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== ancho || info.height !== alto) {
    throw new Error(`${archivo} mide ${info.width}×${info.height} y el fondo ${ancho}×${alto}. Todas las capas tienen que medir lo mismo.`);
  }
  infoPiezas.push({ pieza, archivo, ...calcularZona(data, ancho, alto) });
}
const ordenConfig = config.orden || [];
for (const p of ordenConfig) if (!objetos.has(p)) console.warn(`Aviso: "${p}" está en el orden pero no hay 20_objeto_${p}.png.`);
infoPiezas.sort((a, b) => {
  const ia = ordenConfig.indexOf(a.pieza);
  const ib = ordenConfig.indexOf(b.pieza);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.caja[3] - b.caja[3];
});
if (infoPiezas.some((p) => !ordenConfig.includes(p.pieza))) {
  console.warn('Aviso: hay piezas sin orden en sala.config.json; se ordenaron por su borde inferior.');
}

// Punto indicador: arriba de la pieza. Si ahí pisaría otra pieza (por ejemplo, la mesa
// delante del sofá), se pone sobre la parte visible de la propia pieza, bien adentro.
infoPiezas.forEach((p, i) => {
  const x = Math.round(p.punto[0]);
  const y = Math.max(Math.round(alto * 0.03), Math.round(p.punto[1] - (SEPARACION_PUNTO / 100) * alto));
  const otras = infoPiezas.filter((o) => o !== p);
  if (!pisaOtra(otras, x, y)) {
    p.punto = [x, y];
    return;
  }
  p.punto = puntoInterior(p, infoPiezas.slice(i + 1));
  console.log(`${p.pieza}: el punto de arriba pisaba otra pieza; va sobre la pieza.`);
});

const sala = {
  version: 1,
  id: config.id || path.basename(path.resolve(entrada)),
  titulo: config.titulo || 'Sala',
  ancho,
  alto,
  fondo: await exportar(fondo, 'fondo', true),
  piezas: [],
};

let orden = 0;
for (const p of infoPiezas) {
  orden += 10;
  sala.piezas.push({
    pieza: p.pieza,
    etiqueta: config.etiquetas?.[p.pieza] || p.pieza,
    orden,
    capa: await exportar(p.archivo, 'objeto_' + p.pieza),
    sombra: sombras.has(p.pieza) ? await exportar(sombras.get(p.pieza), 'sombra_' + p.pieza) : null,
    zona: {
      puntos: p.puntos.map(([x, y]) => [pct(x, ancho), pct(y, alto)]),
      punto: [pct(p.punto[0], ancho), pct(p.punto[1], alto)],
    },
  });
  console.log(`${p.pieza.padEnd(10)} orden ${String(orden).padStart(3)}  ${String(p.puntos.length).padStart(2)} puntos  caja ${p.caja.join(',')}`);
}

const json = JSON.stringify(sala, null, 2);
await fs.writeFile(path.join(salida, 'sala.json'), json + '\n');
await fs.writeFile(path.join(salida, 'sala.data.js'), `window.PQ_SALA = ${json};\n`);
console.log(`\nListo: ${path.join(salida, 'sala.json')}`);

// ---------------------------------------------------------------------------

async function leerConfig(ruta) {
  try {
    return JSON.parse(await fs.readFile(ruta, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw new Error(`No pude leer ${ruta}: ${e.message}`);
  }
}

async function exportar(archivo, nombre, opaco = false) {
  const src = {};
  let peso = 0;
  const anchos = [...new Set(ANCHOS.map((w) => Math.min(w, ancho)))];
  for (const w of anchos) {
    const destino = `${nombre}-${w}.webp`;
    const img = sharp(path.join(entrada, archivo)).resize({ width: w });
    // En las capas transparentes, los píxeles invisibles se descartan (exact:false)
    // para que no pesen.
    const info = await (opaco ? img.removeAlpha().webp({ quality: 78 }) : img.webp({ quality: 82, alphaQuality: 90 }))
      .toFile(path.join(salida, destino));
    src[w] = destino;
    peso += info.size;
  }
  return { original: archivo, src, bytes: peso };
}

function pct(v, total) {
  return Math.round((v / total) * 10000) / 100;
}

// Contorno exterior de la parte sólida (componente más grande, un poco agrandada),
// simplificado a MAX_PUNTOS como máximo. Coordenadas en píxeles del lienzo.
function calcularZona(rgba, w, h) {
  const solido = new Uint8Array(w * h);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] >= UMBRAL_ALFA) {
      solido[i] = 1;
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('Una capa de objeto no tiene píxeles visibles.');

  const mascara = dilatar(solido, w, h, MARGEN_ZONA);
  const comp = componenteMayor(mascara, w, h);
  const contorno = trazarContorno(comp.mascara, w, h, comp.inicio);
  const puntos = simplificar(contorno, MAX_PUNTOS);
  if (comp.fraccion < 0.95) {
    console.warn(`Aviso: la pieza tiene partes separadas; la zona cubre ${Math.round(comp.fraccion * 100)} % de su superficie.`);
  }
  return { puntos, solido, caja: [x0, y0, x1, y1], punto: [(x0 + x1) / 2, y0] };
}

function pisaOtra(otras, x, y) {
  for (let dy = -RADIO_PUNTO; dy <= RADIO_PUNTO; dy++) {
    for (let dx = -RADIO_PUNTO; dx <= RADIO_PUNTO; dx++) {
      const nx = x + dx, ny = y + dy;
      if (dx * dx + dy * dy > RADIO_PUNTO ** 2 || nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
      if (otras.some((o) => o.solido[ny * ancho + nx])) return true;
    }
  }
  return false;
}

// El píxel visible de la pieza más alejado de sus bordes (distancia en dos pasadas).
function puntoInterior(p, delante) {
  const [x0, y0, x1, y1] = p.caja;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const d = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y + y0) * ancho + x + x0;
      d[y * w + x] = p.solido[k] && !delante.some((o) => o.solido[k]) ? Infinity : 0;
    }
  }
  const v = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[y * w + x]) d[y * w + x] = Math.min(d[y * w + x], v(x - 1, y) + 1, v(x, y - 1) + 1, v(x - 1, y - 1) + 1.4, v(x + 1, y - 1) + 1.4);
    }
  }
  let mejor = [p.punto[0], p.punto[1]], dmax = -1;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      if (!d[y * w + x]) continue;
      d[y * w + x] = Math.min(d[y * w + x], v(x + 1, y) + 1, v(x, y + 1) + 1, v(x + 1, y + 1) + 1.4, v(x - 1, y + 1) + 1.4);
      if (d[y * w + x] > dmax) { dmax = d[y * w + x]; mejor = [x + x0, y + y0]; }
    }
  }
  return mejor;
}

function dilatar(m, w, h, r) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      for (let dx = Math.max(0, x - r); dx <= Math.min(w - 1, x + r); dx++) tmp[y * w + dx] = 1;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (!tmp[y * w + x]) continue;
      for (let dy = Math.max(0, y - r); dy <= Math.min(h - 1, y + r); dy++) out[dy * w + x] = 1;
    }
  }
  return out;
}

function componenteMayor(m, w, h) {
  const etiqueta = new Int32Array(w * h);
  const pila = new Int32Array(w * h);
  let mejor = { id: 0, area: 0 };
  let total = 0;
  let id = 0;
  for (let i = 0; i < w * h; i++) {
    if (!m[i] || etiqueta[i]) continue;
    id++;
    let area = 0;
    let tope = 0;
    pila[tope++] = i;
    etiqueta[i] = id;
    while (tope) {
      const j = pila[--tope];
      area++;
      const x = j % w, y = (j / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const k = ny * w + nx;
          if (m[k] && !etiqueta[k]) {
            etiqueta[k] = id;
            pila[tope++] = k;
          }
        }
      }
    }
    total += area;
    if (area > mejor.area) mejor = { id, area, inicio: i };
  }
  const mascara = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (etiqueta[i] === mejor.id) mascara[i] = 1;
  // mejor.inicio es el primer píxel del componente al recorrer por filas:
  // el de más arriba a la izquierda, que siempre está en el borde exterior.
  return { mascara, inicio: mejor.inicio, fraccion: mejor.area / total };
}

// Trazado de borde de Moore, en sentido horario.
function trazarContorno(m, w, h, inicio) {
  const dirs = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const lleno = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  const sx = inicio % w, sy = (inicio / w) | 0;
  const puntos = [[sx, sy]];
  let px = sx, py = sy;
  let atras = 0; // se entra desde la izquierda, que está vacía
  for (let pasos = 0; pasos < w * h * 4; pasos++) {
    let d = -1;
    for (let k = 0; k < 8; k++) {
      const dd = (atras + k) % 8;
      if (lleno(px + dirs[dd][0], py + dirs[dd][1])) {
        d = dd;
        break;
      }
    }
    if (d === -1) break; // píxel aislado
    const bx = px + dirs[(d + 7) % 8][0], by = py + dirs[(d + 7) % 8][1];
    const nx = px + dirs[d][0], ny = py + dirs[d][1];
    if (px === sx && py === sy && puntos.length > 2 && nx === puntos[1][0] && ny === puntos[1][1]) break;
    atras = dirs.findIndex(([ddx, ddy]) => ddx === bx - nx && ddy === by - ny);
    px = nx;
    py = ny;
    if (px === sx && py === sy && puntos.length > 2) continue;
    puntos.push([px, py]);
  }
  return puntos;
}

// Douglas-Peucker sobre un polígono cerrado; sube la tolerancia hasta quedar en <= max puntos.
function simplificar(puntos, max) {
  if (puntos.length <= max) return puntos;
  // Se corta el anillo en el punto inicial y en el más lejano a él.
  let lejos = 0, dmax = -1;
  for (let i = 1; i < puntos.length; i++) {
    const d = (puntos[i][0] - puntos[0][0]) ** 2 + (puntos[i][1] - puntos[0][1]) ** 2;
    if (d > dmax) { dmax = d; lejos = i; }
  }
  const a = puntos.slice(0, lejos + 1);
  const b = puntos.slice(lejos).concat([puntos[0]]);
  for (let tol = 0.5; ; tol *= 1.25) {
    const r = dp(a, tol).slice(0, -1).concat(dp(b, tol).slice(0, -1));
    if (r.length <= max) return r;
  }
}

function dp(pts, tol) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const guardar = new Uint8Array(n);
  guardar[0] = guardar[n - 1] = 1;
  const pila = [[0, n - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    const [ax, ay] = pts[i], [bx, by] = pts[j];
    const largo = Math.hypot(bx - ax, by - ay) || 1;
    let k = -1, dmax = tol;
    for (let t = i + 1; t < j; t++) {
      const d = Math.abs((bx - ax) * (ay - pts[t][1]) - (ax - pts[t][0]) * (by - ay)) / largo;
      if (d > dmax) { dmax = d; k = t; }
    }
    if (k !== -1) {
      guardar[k] = 1;
      pila.push([i, k], [k, j]);
    }
  }
  return pts.filter((_, i) => guardar[i]);
}
