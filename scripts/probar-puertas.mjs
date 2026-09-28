// Prueba automática de las puertas entre salas (transición, historial, carrito, teclado, accesibilidad, rendimiento).
// Uso: node scripts/probar-seccion.mjs && python3 -m http.server 8765 (desde la raíz) y en otra terminal:
//   node scripts/probar-puertas.mjs [url-base]
// Guarda cuadros de la transición en $CAPTURAS (por defecto, la carpeta actual).

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8765';
const SALA1 = BASE + '/prototipo/salas/sala-ejemplo.html';
const SALA2 = BASE + '/prototipo/salas/sala-2.html';
const S = process.env.CAPTURAS || '.';
const A = '[data-pq-sala]:not([data-pq-montada]) '; // la sala visible (la de destino puede estar armada y oculta)
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let fallas = 0;
const ok = (c, m) => {
  console.log((c ? 'OK   ' : 'FALLA') + ' ' + m);
  if (!c) fallas++;
};

async function nueva(opciones = {}) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, ...opciones });
  const page = await ctx.newPage();
  page.errores = [];
  page.on('pageerror', (e) => page.errores.push(e.message));
  page.on('console', (m) => m.type() === 'error' && page.errores.push(m.text()));
  // Marca que sobrevive mientras no se recargue la página.
  await page.addInitScript(() => {
    window.__cargas = (window.__cargas || 0) + 1;
    document.addEventListener('pq:transicion-fin', (e) => (window.__fin = e.detail));
  });
  return { ctx, page };
}
const finTransicion = (page) => page.waitForFunction(() => window.__fin, null, { timeout: 8000 }).then(() => page.evaluate(() => { const f = window.__fin; window.__fin = null; return f; }));
const tituloSala = (page) => page.locator(A.trim()).getAttribute('data-titulo');
const marcarSinRecarga = (page) => page.evaluate(() => (window.__sinRecarga = true));
const sinRecarga = (page) => page.evaluate(() => window.__sinRecarga === true);

// 1) Ida con clic, precargada: arranque < 100 ms, cuadros, rendimiento con CPU 4× más lenta, carrito
{
  const { ctx, page } = await nueva();
  await page.goto(SALA1, { waitUntil: 'networkidle' });
  ok((await page.locator(A + '.pq-sala__puerta').textContent()).includes('Sala 2'), 'la Sala 1 tiene la puerta "Sala 2 · Objetos"');
  ok((await page.locator(A + '.pq-sala__puerta').getAttribute('href')).endsWith('/sala-2.html'), 'la puerta es un enlace real a la Sala 2');

  // Carrito: agregar el sofá antes de cruzar
  await page.locator(A + '.pq-sala__ver[data-pieza=sofa]').click();
  await page.waitForTimeout(400);
  await page.locator(A + '[data-pq-agregar]').click();
  await page.waitForFunction(() => document.querySelector('[data-pq-contador]').textContent.trim() === '1');
  await page.keyboard.press('Escape');
  await marcarSinRecarga(page);

  // Precarga al pasar el mouse: trae la Sala 2 y la deja armada, oculta
  await page.locator(A + '.pq-sala__puerta').hover();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  ok((await page.locator('[data-pq-montada]').count()) === 1, 'al pasar el mouse por la puerta, la Sala 2 queda precargada y armada (oculta)');

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__largas = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__largas.push(Math.round(e.duration)))).observe({ type: 'longtask' });
    window.__cuadros = [];
    document.addEventListener('pq:transicion-inicio', () => {
      window.__inicio = performance.now();
      const medir = (t) => {
        window.__cuadros.push(t);
        if (!window.__fin) requestAnimationFrame(medir);
      };
      requestAnimationFrame(medir);
    });
    document.addEventListener('click', () => (window.__clic = performance.now()), true);
    const esperarAnim = () => (document.getAnimations().length ? (window.__primeraAnim = performance.now()) : requestAnimationFrame(esperarAnim));
    document.addEventListener('pq:transicion-inicio', () => requestAnimationFrame(esperarAnim));
  });
  await page.locator(A + '.pq-sala__puerta').click();
  for (const ms of [150, 450, 750, 1100]) {
    await page.waitForTimeout(ms === 150 ? 150 : 300);
    await page.screenshot({ path: `${S}/transicion-${String(ms).padStart(4, '0')}ms.png` });
  }
  const fin = await finTransicion(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const m = await page.evaluate(() => {
    const c = window.__cuadros;
    const saltos = c.slice(1).map((t, i) => t - c[i]);
    return { arranque: window.__primeraAnim - window.__clic, largas: window.__largas, max: Math.max(...saltos), cuadros: c.length, lentos: saltos.filter((s) => s > 50).length };
  });
  ok(m.arranque < 100, `precargada: la animación arranca ${Math.round(m.arranque)} ms después del clic (CPU 4× más lenta)`);
  ok(m.largas.length === 0, `sin tareas largas (> 50 ms) durante la transición con CPU 4× más lenta: [${m.largas.join(', ')}]`);
  console.log(`      duración ${fin.ms} ms, ${m.cuadros} cuadros, salto máximo entre cuadros ${Math.round(m.max)} ms, cuadros de más de 50 ms: ${m.lentos}`);
  ok(fin.ms >= 1300 && fin.ms <= 1800, `la transición dura ${fin.ms} ms (pedido: ~1400–1600)`);

  ok(page.url() === SALA2, 'la URL cambió a la Sala 2');
  ok((await tituloSala(page)).startsWith('Sala 2'), 'se ve la Sala 2');
  ok((await page.locator(A.trim()).count()) === 1, 'queda una sola sala en la página');
  ok((await page.title()).startsWith('Sala 2'), 'el título de la pestaña cambió: ' + (await page.title()));
  ok(await sinRecarga(page), 'no se recargó la página');
  ok((await page.locator('[data-pq-contador]').textContent()).trim() === '1', 'el carrito sigue con 1 producto');
  ok(await page.evaluate(() => document.activeElement.matches('.pq-sala__titulo')), 'el foco pasó al título de la Sala 2');
  ok((await page.locator('.pq-anuncio').textContent()).startsWith('Sala 2'), 'se anuncia "Sala 2…" para lectores de pantalla');

  // Agregar una pieza de la Sala 2
  await page.locator(A + '.pq-sala__ver[data-pieza=sofa2]').click();
  await page.waitForTimeout(400);
  await page.locator(A + '[data-pq-agregar]').click();
  await page.waitForFunction(() => document.querySelector('[data-pq-contador]').textContent.trim() === '2');
  ok(true, 'en la Sala 2 se agrega otra pieza: el carrito pasa a 2');
  await page.keyboard.press('Escape');

  // 2) Vuelta con teclado: Tab hasta la puerta de regreso y Enter
  let tabs = 0;
  while (tabs++ < 30 && !(await page.evaluate(() => document.activeElement.matches('.pq-sala__puerta')))) await page.keyboard.press('Tab');
  ok(tabs < 30, `con Tab se llega a la puerta de regreso (${tabs} tabs)`);
  await page.keyboard.press('Enter');
  await finTransicion(page);
  ok(page.url() === SALA1 && (await tituloSala(page)) === 'Sala de ejemplo', 'Enter en la puerta vuelve a la Sala 1');

  // 3) Atrás y Adelante del navegador
  await page.goBack();
  await finTransicion(page);
  ok(page.url() === SALA2 && (await tituloSala(page)).startsWith('Sala 2'), 'Atrás del navegador: vuelve a la Sala 2 con transición');
  await page.goBack();
  await finTransicion(page);
  ok(page.url() === SALA1 && (await tituloSala(page)) === 'Sala de ejemplo', 'Atrás otra vez: Sala 1');
  await page.goForward();
  await finTransicion(page);
  ok(page.url() === SALA2, 'Adelante: Sala 2');
  ok(await sinRecarga(page), 'todo el recorrido sin recargar la página');
  ok((await page.locator('[data-pq-contador]').textContent()).trim() === '2', 'el carrito conserva los 2 productos');

  // 4) Recargar abre la sala correcta
  await page.reload({ waitUntil: 'networkidle' });
  ok((await tituloSala(page)).startsWith('Sala 2'), 'al recargar en /sala-2 se abre directamente la Sala 2');
  ok(page.errores.length === 0, 'sin errores de consola ' + page.errores.join(' | '));
  await ctx.close();
}

// 5) Saltear con Esc
{
  const { ctx, page } = await nueva();
  await page.goto(SALA1, { waitUntil: 'networkidle' });
  await page.locator(A + '.pq-sala__puerta').hover();
  await page.waitForLoadState('networkidle');
  await page.locator(A + '.pq-sala__puerta').click();
  await page.waitForTimeout(120);
  await page.keyboard.press('Escape');
  const fin = await finTransicion(page);
  ok(fin.ms < 500 && page.url() === SALA2, `Esc saltea la transición (terminó en ${fin.ms} ms)`);
  await ctx.close();
}

// 6) Movimiento reducido: solo fundido
{
  const { ctx, page } = await nueva({ reducedMotion: 'reduce' });
  await page.goto(SALA1, { waitUntil: 'networkidle' });
  await page.locator(A + '.pq-sala__puerta').hover();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    window.__conZoom = false;
    const mirar = () => {
      if (document.getAnimations().some((a) => a.effect.getKeyframes().some((k) => k.transform && k.transform !== 'none'))) window.__conZoom = true;
      if (!window.__fin) requestAnimationFrame(mirar);
    };
    document.addEventListener('pq:transicion-inicio', () => requestAnimationFrame(mirar));
  });
  await page.locator(A + '.pq-sala__puerta').click();
  const fin = await finTransicion(page);
  ok(!(await page.evaluate(() => window.__conZoom)) && fin.ms < 400, `reducir movimiento: solo fundido, sin zoom (${fin.ms} ms)`);
  await ctx.close();
}

// 7) Sin JavaScript: la puerta es un enlace normal
{
  const { ctx, page } = await nueva({ javaScriptEnabled: false });
  await page.goto(SALA1);
  await page.locator(A + '.pq-sala__puerta').click();
  await page.waitForURL(SALA2);
  ok(page.url() === SALA2, 'sin JavaScript, la puerta lleva a la Sala 2 como enlace normal');
  await ctx.close();
}

// 8) Si falla la carga de la sala, navegación normal
{
  const { ctx, page } = await nueva();
  await page.route(/section_id=/, (r) => r.fulfill({ status: 500, body: 'error' }));
  await page.goto(SALA1, { waitUntil: 'networkidle' });
  await page.locator(A + '.pq-sala__puerta').click();
  await page.waitForURL(SALA2);
  await page.waitForLoadState('networkidle');
  ok(page.url() === SALA2 && (await page.evaluate(() => window.__cargas)) === 1 && (await tituloSala(page)).startsWith('Sala 2'), 'si falla la carga, navega normal a la Sala 2');
  await ctx.close();
}

// 9) Celular: la transición también anda con toque
{
  const { ctx, page } = await nueva({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(SALA1, { waitUntil: 'networkidle' });
  // En celular la sala se recorre de costado: llevamos la vista hasta la puerta.
  await page.locator(A + '.pq-sala__scroller').evaluate((s) => (s.scrollLeft = s.scrollWidth));
  await page.locator(A + '.pq-sala__puerta').tap();
  await finTransicion(page);
  ok(page.url() === SALA2, 'celular: tocar la puerta lleva a la Sala 2');
  await page.screenshot({ path: `${S}/celular-sala-2.png` });
  ok(page.errores.length === 0, 'celular: sin errores de consola ' + page.errores.join(' | '));
  await ctx.close();
}

// 10) Sin precarga (clic apenas carga la página): tiene que andar igual; se informa cómo le fue.
{
  const { ctx, page } = await nueva();
  await page.goto(SALA1, { waitUntil: 'domcontentloaded' });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__largas = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__largas.push(Math.round(e.duration)))).observe({ type: 'longtask' });
  });
  await page.locator(A + '.pq-sala__puerta').click();
  const fin = await finTransicion(page);
  ok(page.url() === SALA2, `sin precarga también cruza (${fin.ms} ms; tareas largas con CPU 4× más lenta: [${(await page.evaluate(() => window.__largas)).join(', ')}])`);
  await ctx.close();
}

await b.close();
console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo OK');
process.exit(fallas ? 1 : 0);
