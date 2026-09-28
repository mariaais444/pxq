// Solo para el prototipo: arma una foto de "producto de prueba" por pieza,
// recortando su capa. En Shopify cada producto tiene sus propias fotos.
//
//   node prototipo/generar-productos-prueba.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const capas = 'capas-ejemplo';
const destino = 'prototipo/productos';
await fs.mkdir(destino, { recursive: true });

for (const f of await fs.readdir(capas)) {
  const m = f.match(/^20_objeto_(.+)\.png$/);
  if (!m) continue;
  const recorte = await sharp(path.join(capas, f)).trim({ threshold: 1 }).png().toBuffer();
  await sharp(recorte)
    .resize({ width: 480, height: 480, fit: 'inside' })
    .extend({ top: 40, bottom: 40, left: 40, right: 40, background: '#efe9e0' })
    .flatten({ background: '#efe9e0' })
    .webp({ quality: 80 })
    .toFile(path.join(destino, m[1] + '.webp'));
  console.log(m[1]);
}
