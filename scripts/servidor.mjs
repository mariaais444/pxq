// Servidor local mínimo, sin dependencias, para ver el prototipo y las salas de prueba.
// Uso: npm run servidor   → abrí http://localhost:8765/prototipo/salas/sala-ejemplo.html
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const PUERTO = Number(process.env.PUERTO || 8765);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const ruta = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  try {
    const archivo = join(raiz, ruta.endsWith('/') || !ruta ? join(ruta, 'index.html') : ruta);
    if (!archivo.startsWith(raiz)) throw new Error('fuera de la carpeta');
    const datos = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': tipos[extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(datos);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado: ' + ruta);
  }
}).listen(PUERTO, () => {
  console.log(`Listo. Abrí en el navegador:`);
  console.log(`  http://localhost:${PUERTO}/prototipo/salas/sala-ejemplo.html   (salas con puertas)`);
  console.log(`  http://localhost:${PUERTO}/prototipo/index.html                (prototipo original)`);
  console.log('Para cortarlo: Ctrl + C');
});
