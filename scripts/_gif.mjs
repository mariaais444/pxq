import { chromium } from 'playwright';
import sharp from 'sharp';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 960, height: 600 } });
const page = await ctx.newPage();
const A = '[data-pq-sala]:not([data-pq-montada]) ';
await page.goto('http://localhost:8765/prototipo/salas/sala-ejemplo.html', { waitUntil: 'networkidle' });
await page.mouse.move(700, 330); await page.waitForTimeout(300);
await page.locator(A + '.pq-sala__puerta').hover(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(1200);
const cdp = await ctx.newCDPSession(page);
const cuadros = [];
cdp.on('Page.screencastFrame', async (f) => { cuadros.push({ t: f.metadata.timestamp, data: Buffer.from(f.data, 'base64') }); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
await page.waitForTimeout(400);
const t0 = Date.now() / 1000;
await page.locator(A + '.pq-sala__puerta').click();
await page.waitForTimeout(2200);
await cdp.send('Page.stopScreencast');
console.log('cuadros', cuadros.length);
// Remuestrear a 20 cuadros por segundo desde 300 ms antes del clic hasta 1,9 s después.
const salida = [];
for (let t = t0 - 0.3; t < t0 + 1.9; t += 0.05) {
  let mejor = cuadros[0];
  for (const c of cuadros) if (c.t <= t) mejor = c;
  salida.push(await sharp(mejor.data).resize(480).png().toBuffer());
}
await sharp(salida, { join: { animated: true } }).gif({ delay: 50, loop: 0, colours: 128 }).toFile('/tmp/claude-0/work/transicion-puerta.gif');
await b.close();
