// Copia los archivos de la sala (carpeta tema/) dentro de una copia local de un tema de Shopify.
// Uso: node scripts/instalar-en-tema.mjs <carpeta-del-tema>
// No sube nada a Shopify: eso se hace después con `shopify theme dev` o `shopify theme push --unpublished`.

import { cp, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const origen = fileURLToPath(new URL('../tema/', import.meta.url));
const destino = process.argv[2];

if (!destino) {
  console.error('Falta la carpeta del tema. Ejemplo: node scripts/instalar-en-tema.mjs ../mi-tema');
  process.exit(1);
}
try {
  await stat(join(destino, 'layout', 'theme.liquid'));
} catch {
  console.error(`"${destino}" no parece un tema de Shopify (no tiene layout/theme.liquid).`);
  process.exit(1);
}

async function archivos(dir) {
  const salida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) salida.push(...(await archivos(ruta)));
    else salida.push(ruta);
  }
  return salida;
}

for (const archivo of await archivos(origen)) {
  const rel = relative(origen, archivo);
  await cp(archivo, join(destino, rel));
  console.log('copiado  ' + rel);
}
