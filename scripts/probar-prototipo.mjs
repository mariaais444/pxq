// Prueba automática del prototipo con Playwright (clics en las 6 piezas, teclado, stock, carrito, 422, peso en celular).
// Uso: python3 -m http.server 8765 (desde la raíz del repo) y en otra terminal:
//   node scripts/probar-prototipo.mjs [url]   (por defecto el prototipo; también sirve para prototipo/seccion.html)

import { chromium } from 'playwright';
const S = process.env.CAPTURAS || '.';
const URL = process.argv[2] || 'http://localhost:8765/prototipo/index.html';
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let fallas = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) fallas++; };

async function abrirPagina(q = '', vp = { width: 1280, height: 900 }) {
  const page = await b.newPage({ viewport: vp });
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await page.goto(URL + q, { waitUntil: 'networkidle' });
  page.errores = errores;
  return page;
}
async function clicLienzo(page, x, y) {
  const r = await page.locator('.pq-sala__lienzo').boundingBox();
  await page.mouse.click(r.x + (x / 1280) * r.width, r.y + (y / 800) * r.height);
}
const titulo = (page) => page.locator('[data-pq-f=titulo]').textContent();
const cerrar = async (page) => { await page.keyboard.press('Escape'); await page.waitForTimeout(50); };

// 1) Clic en cada pieza (modo punto para que la lámpara vendida siga visible)
{
  const page = await abrirPagina('?vendido=punto');
  const casos = [
    ['obra', 240, 420], ['aparador', 760, 560], ['lampara', 837, 500], ['sofa', 600, 570],
    ['sillon', 910, 600], ['mesa', 550, 640], ['mesa', 480, 640] /* superpuesta al sofá */, ['lampara', 838, 527] /* sobre el aparador */,
  ];
  for (const [pieza, x, y] of casos) {
    await clicLienzo(page, x, y);
    const abierto = await page.locator('dialog[open]').count();
    const t = abierto ? await titulo(page) : '(sin ficha)';
    ok(t.toLowerCase().startsWith(pieza === 'mesa' ? 'mesa' : pieza === 'sofa' ? 'sofá' : pieza === 'sillon' ? 'sillón' : pieza === 'lampara' ? 'lámpara' : pieza), `clic en (${x},${y}) abre ${pieza} → "${t}"`);
    await cerrar(page);
  }
  // Clic en pared vacía no abre nada
  await clicLienzo(page, 640, 300);
  ok((await page.locator('dialog[open]').count()) === 0, 'clic en la pared no abre ficha');
  // Punto rojo para la lámpara vendida
  const color = await page.locator('.pq-sala__punto[data-pieza=lampara]').evaluate((n) => getComputedStyle(n, '::before').backgroundColor);
  ok(color === 'rgb(198, 47, 34)', 'modo punto: la lámpara vendida muestra punto rojo (' + color + ')');
  const visible = await page.locator('.pq-sala__objeto[data-pieza=lampara]').evaluate((n) => getComputedStyle(n).visibility);
  ok(visible === 'visible', 'modo punto: la capa de la lámpara sigue visible');
  ok(page.errores.length === 0, 'sin errores de consola ' + page.errores.join(' | '));
  await page.close();
}

// 2) Modo ocultar, stock, carrito y 422
{
  const page = await abrirPagina();
  const vis = (sel) => page.locator(sel).evaluate((n) => getComputedStyle(n).visibility);
  ok((await vis('.pq-sala__objeto[data-pieza=lampara]')) === 'hidden', 'ocultar: capa de la lámpara oculta');
  ok((await page.locator('.pq-sala__sombra[data-pieza=lampara]').count()) === 0, 'la lámpara no tiene sombra (esperado)');
  ok((await page.locator('.pq-sala__zona[data-pieza=lampara]').getAttribute('tabindex')) === '-1', 'ocultar: la lámpara sale del orden de teclado');
  await clicLienzo(page, 837, 500);
  ok((await page.locator('dialog[open]').count()) === 0, 'ocultar: clic donde estaba la lámpara no abre nada');

  // Sillón: se vende entre que se armó la página y el clic
  await clicLienzo(page, 910, 600);
  ok((await page.locator('[data-pq-f=estado]').textContent()) === 'Consultando disponibilidad…', 'sillón: primero consulta stock');
  await page.waitForTimeout(400);
  ok((await page.locator('[data-pq-f=estado]').textContent()) === 'Vendido', 'sillón: la consulta lo marca vendido');
  ok(await page.locator('[data-pq-agregar]').isDisabled(), 'sillón: botones deshabilitados');
  await cerrar(page);
  ok((await vis('.pq-sala__objeto[data-pieza=sillon]')) === 'hidden' && (await vis('.pq-sala__sombra[data-pieza=sillon]')) === 'hidden', 'sillón: se ocultan capa y sombra');
  ok((await page.locator('li[data-pieza=sillon] [data-pq-estado]').textContent()) === 'Vendido', 'sillón: la lista dice Vendido');

  // Agregar el sofá: el contador se actualiza sin recargar
  await clicLienzo(page, 600, 570);
  await page.waitForTimeout(400);
  const t0 = Date.now();
  await page.locator('[data-pq-agregar]').click();
  await page.waitForFunction(() => document.querySelector('[data-contador]').textContent === '1');
  ok(true, `sofá agregado, contador en 1 sin recargar (${Date.now() - t0} ms con 300 ms de demora simulada)`);
  ok((await page.locator('[data-pq-f=mensaje]').textContent()).includes('carrito'), 'mensaje de confirmación en el panel');
  await cerrar(page);

  // Mesa dos veces → 422
  for (let i = 0; i < 2; i++) {
    await clicLienzo(page, 550, 640);
    await page.waitForTimeout(400);
    await page.locator('[data-pq-agregar]').click();
    await page.waitForTimeout(500);
    if (i === 1) {
      const m = await page.locator('[data-pq-f=mensaje]').textContent();
      ok(m.startsWith('Ya tenés') && (await page.locator('[data-pq-f=mensaje]').getAttribute('data-error')) !== null, '422 se muestra en el panel: "' + m + '"');
    }
    await cerrar(page);
  }
  ok((await page.locator('[data-contador]').textContent()) === '2', 'contador en 2');
  ok(page.errores.length === 0, 'sin errores de consola ' + page.errores.join(' | '));
  await page.close();
}

// 3) Teclado y lector de pantalla
{
  const page = await abrirPagina();
  const labels = await page.locator('.pq-sala__zona').evaluateAll((ns) => ns.map((n) => n.getAttribute('role') + ' | ' + n.getAttribute('aria-label')));
  console.log('      etiquetas: \n        ' + labels.join('\n        '));
  ok(labels.every((l) => l.startsWith('button | ') && /\$ [\d.]+,00/.test(l)), 'cada zona es botón con nombre y precio');
  await page.keyboard.press('Tab'); // primer elemento: link del carrito
  await page.keyboard.press('Tab');
  const foco = await page.evaluate(() => document.activeElement.dataset.pieza);
  ok(foco === 'obra', 'Tab llega a la primera pieza (' + foco + ')');
  const resaltada = await page.locator('.pq-sala__objeto[data-pieza=obra]').evaluate((n) => n.classList.contains('is-activa'));
  ok(resaltada, 'con foco, la capa se resalta');
  await page.keyboard.press('Enter');
  ok((await titulo(page)).startsWith('Obra'), 'Enter abre la obra');
  ok(await page.evaluate(() => document.activeElement.matches('[data-pq-cerrar]')), 'el foco pasa al panel (botón cerrar)');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
  ok(await page.evaluate(() => document.activeElement.dataset.pieza === 'obra'), 'Escape cierra y devuelve el foco a la pieza');
  await page.keyboard.press('Tab');
  await page.keyboard.press(' ');
  ok((await titulo(page)).startsWith('Aparador'), 'Espacio abre la siguiente pieza (aparador)');
  await page.close();
}

// 4) Celular: centrado, peso y capturas
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  let bytes = 0;
  const archivos = [];
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
  cdp.on('Network.responseReceived', (e) => archivos.push(e.response.url.split('/').pop()));
  await page.goto(URL, { waitUntil: 'networkidle' });
  const s = await page.locator('.pq-sala__scroller').evaluate((n) => ({ l: n.scrollLeft, max: n.scrollWidth - n.clientWidth, w: n.scrollWidth }));
  ok(Math.abs(s.l - s.max / 2) < 2 && s.w === 820, `celular: lienzo de ${s.w} px, centrado (scrollLeft ${s.l} de ${s.max})`);
  ok(bytes < 1.5 * 1024 * 1024, `peso total de la página en celular (DPR 3): ${(bytes / 1024).toFixed(0)} KB`);
  console.log('      archivos: ' + archivos.join(', '));
  const lcp = await page.evaluate(() => new Promise((r) => new PerformanceObserver((l) => { const e = l.getEntries().at(-1); r({ t: Math.round(e.startTime), el: e.element && e.element.className }); }).observe({ type: 'largest-contentful-paint', buffered: true })));
  console.log('      LCP local (sin throttling): ' + JSON.stringify(lcp));
  await page.screenshot({ path: S + '/celular-sala.png' });
  await page.locator('.pq-sala__punto[data-pieza=sofa]').tap();
  await page.waitForTimeout(500);
  await page.screenshot({ path: S + '/celular-ficha.png' });
  await ctx.close();
}
{
  const page = await abrirPagina();
  await page.locator('.pq-sala__zona[data-pieza=sofa]').hover({ position: { x: 150, y: 25 } }).catch(() => {});
  await clicLienzo(page, 600, 570);
  await page.waitForTimeout(500);
  await page.screenshot({ path: S + '/escritorio-ficha.png' });
  await cerrar(page);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: S + '/escritorio-sala.png', fullPage: true });
  await page.close();
}
await b.close();
console.log(fallas ? `\n${fallas} FALLAS` : '\nTodo OK');
process.exit(fallas ? 1 : 0);
