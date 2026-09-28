#!/usr/bin/env node
// PROVISORIO: arma capas-sala-2/ a partir de las capas de la Sala 1 (capas-ejemplo/), mientras no
// estén las ilustraciones reales de la Sala 2.
//
//   node scripts/generar-sala-2-provisoria.mjs
//   node scripts/preparar-sala.mjs capas-ejemplo prototipo/sala
//   node scripts/preparar-sala.mjs capas-sala-2 prototipo/sala-2
//
// Qué hace:
// - Espeja el fondo y 3 piezas (sofá, sillón y mesa) para que la puerta quede en la pared izquierda,
//   que es por donde se entra viniendo de la Sala 1. Al fondo le da un tono más cálido.
// - Escribe capas-sala-2/sala.config.json con la puerta de regreso a la Sala 1.
// - Genera capas provisorias de puerta cerrada y abierta para las dos salas: la abierta muestra un
//   pedacito de la otra sala a través del marco.
//
// Cuando lleguen las ilustraciones reales: reemplazá los PNG de capas-sala-2/ (y las capas de puerta),
// ajustá sala.config.json si cambia la puerta, y volvé a correr preparar-sala.mjs. No hace falta
// tocar código ni correr este script otra vez.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SALA1 = 'capas-ejemplo';
const SALA2 = 'capas-sala-2';
const PIEZAS = { sofa: 'sofa2', sillon: 'sillon2', mesa: 'mesa2' };
const ETIQUETAS = { sofa2: 'Sofá (provisorio)', sillon2: 'Sillón (provisorio)', mesa2: 'Mesa baja (provisoria)' };

const { width: W, height: H } = await sharp(path.join(SALA1, '00_fondo.png')).metadata();

// Hoja de la puerta de la Sala 1 (pared derecha), en píxeles, medida sobre 00_fondo: el interior del marco.
const HOJA_1 = [[1017, 364], [1078, 348], [1078, 623], [1017, 623]];
const HOJA_2 = HOJA_1.map(([x, y]) => [W - 1 - x, y]); // espejada: pared izquierda
const pct = (v, t) => Math.round((v / t) * 10000) / 100;
// Zona clickeable: el marco completo, un poco agrandado para que sea fácil de tocar.
const zona = (hoja) => {
  const xs = hoja.map((p) => p[0]), ys = hoja.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs) - 6, Math.max(...xs) + 6];
  const izq = hoja.filter((p) => p[0] === Math.min(...xs)), der = hoja.filter((p) => p[0] === Math.max(...xs));
  const arriba = (lado) => Math.min(...lado.map((p) => p[1])) - 6;
  const abajo = Math.max(...ys) + 6;
  return [[x0, arriba(izq)], [x1, arriba(der)], [x1, abajo], [x0, abajo]].map(([x, y]) => [pct(x, W), pct(y, H)]);
};

await fs.mkdir(SALA2, { recursive: true });

// Fondo: espejado y más cálido.
await sharp(path.join(SALA1, '00_fondo.png'))
  .flop()
  .linear([1.07, 1.0, 0.86], [8, 2, -6])
  .toFile(path.join(SALA2, '00_fondo.png'));

for (const [orig, nuevo] of Object.entries(PIEZAS)) {
  await sharp(path.join(SALA1, `20_objeto_${orig}.png`)).flop().toFile(path.join(SALA2, `20_objeto_${nuevo}.png`));
  const sombra = path.join(SALA1, `10_sombra_${orig}.png`);
  if (await existe(sombra)) await sharp(sombra).flop().toFile(path.join(SALA2, `10_sombra_${nuevo}.png`));
}

await fs.writeFile(
  path.join(SALA2, 'sala.config.json'),
  JSON.stringify(
    {
      id: 'sala-2',
      titulo: 'Sala 2 · Objetos (provisoria)',
      provisoria: 'Generada por scripts/generar-sala-2-provisoria.mjs. Reemplazar por las ilustraciones reales.',
      orden: ['sofa2', 'sillon2', 'mesa2'],
      etiquetas: ETIQUETAS,
      puertas: [{ id: 'a-sala-ejemplo', destino: 'sala-ejemplo', etiqueta: 'Sala de ejemplo', puntos: zona(HOJA_2) }],
    },
    null,
    2
  ) + '\n'
);

// Capas de puerta provisorias (las dos salas).
await capasPuerta(SALA1, 'a-sala-2', HOJA_1, path.join(SALA2, '00_fondo.png'));
await capasPuerta(SALA2, 'a-sala-ejemplo', HOJA_2, path.join(SALA1, '00_fondo.png'));

console.log(`Listo: ${SALA2}/ (provisoria) y capas de puerta en ${SALA1}/ y ${SALA2}/.`);
console.log('Zona de la puerta de la Sala 1 para sala.config.json:', JSON.stringify(zona(HOJA_1)));

// Cerrada: la hoja tal como está en el fondo. Abierta: por el marco se ve un pedacito de la otra sala.
async function capasPuerta(carpeta, id, hoja, fondoDestino) {
  const mascara = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><polygon points="${hoja.map((p) => p.join(',')).join(' ')}" fill="#fff"/></svg>`
  );
  const recortar = (img) => img.composite([{ input: mascara, blend: 'dest-in' }]).png().toFile.bind(img);
  await recortar(sharp(path.join(carpeta, '00_fondo.png')).ensureAlpha())(path.join(carpeta, `30_puerta_${id}_cerrada.png`));

  const xs = hoja.map((p) => p[0]), ys = hoja.map((p) => p[1]);
  const caja = { left: Math.min(...xs), top: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs) + 1, height: Math.max(...ys) - Math.min(...ys) + 1 };
  // Vista: el centro de la otra sala (pared del fondo y piso), un poco desenfocado, como algo lejano.
  const vista = await sharp(fondoDestino)
    .extract({ left: Math.round(W * 0.36), top: Math.round(H * 0.22), width: Math.round(W * 0.28), height: Math.round(H * 0.72) })
    .resize(caja.width, caja.height, { fit: 'cover' })
    .blur(0.8)
    .png()
    .toBuffer();
  const lienzo = sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: vista, left: caja.left, top: caja.top }])
    .png();
  const conVista = await lienzo.toBuffer();
  await sharp(conVista).composite([{ input: mascara, blend: 'dest-in' }]).png().toFile(path.join(carpeta, `30_puerta_${id}_abierta.png`));
}

async function existe(f) {
  try {
    await fs.access(f);
    return true;
  } catch {
    return false;
  }
}
