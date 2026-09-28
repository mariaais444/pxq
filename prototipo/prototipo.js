/* Solo para el prototipo: arma el mismo HTML que genera tema/sections/pq-sala.liquid, a partir de sala.data.js.
 * Las respuestas de Shopify las simula api-simulada.js.
 * Opciones por URL: ?vendido=punto  ?puntos=no */
(() => {
  const params = new URLSearchParams(location.search);
  const sala = window.PQ_SALA;

  const productos = window.PQ_PRODUCTOS_PRUEBA;

  // --- HTML de la sala (equivalente al Liquid) ---
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const srcset = (img) => Object.entries(img.src).map(([w, f]) => `sala/${f} ${w}w`).join(', ');
  const mayor = (img) => 'sala/' + img.src[Math.max(...Object.keys(img.src).map(Number))];
  const tam = `width="${sala.ancho}" height="${sala.alto}"`;
  const sizes = 'sizes="max(100vw, 820px)"';
  const capa = (img, clase, pieza) =>
    `<img class="pq-sala__capa ${clase}" data-pieza="${pieza}" src="${mayor(img)}" srcset="${srcset(img)}" ${sizes} ${tam} alt="" fetchpriority="low" decoding="async">`;

  const sombras = sala.piezas.filter((p) => p.sombra).map((p) => capa(p.sombra, 'pq-sala__sombra', p.pieza)).join('');
  const objetos = sala.piezas.map((p) => capa(p.capa, 'pq-sala__objeto', p.pieza)).join('');
  const zonas = sala.piezas
    .map((p) => {
      const pts = p.zona.puntos.map(([x, y]) => `${((x * sala.ancho) / 100).toFixed(1)},${((y * sala.alto) / 100).toFixed(1)}`).join(' ');
      const d = productos[p.pieza];
      return `<polygon class="pq-sala__zona" data-pq-abrir data-pieza="${p.pieza}" points="${pts}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${esc(d.titulo + ', ' + d.precio)}"></polygon>`;
    })
    .join('');
  const puntos = sala.piezas
    .map((p) => `<button type="button" class="pq-sala__punto" data-pq-abrir data-pieza="${p.pieza}" style="--x:${p.zona.punto[0]};--y:${p.zona.punto[1]}" tabindex="-1" aria-hidden="true"></button>`)
    .join('');
  const lista = sala.piezas
    .map((p) => {
      const d = productos[p.pieza];
      return `<li data-pieza="${p.pieza}"><a href="${d.url}">${esc(d.titulo)}</a><span>${d.precio}</span><span data-pq-estado data-pieza="${p.pieza}">Disponible</span><button type="button" class="pq-sala__ver" data-pq-abrir data-pieza="${p.pieza}" aria-haspopup="dialog">Ver ficha</button></li>`;
    })
    .join('');

  document.getElementById('sala').innerHTML = `
<section class="pq-sala" data-pq-sala data-vendido="${params.get('vendido') === 'punto' ? 'punto' : 'ocultar'}" data-puntos="${params.get('puntos') === 'no' ? 'no' : 'si'}" data-secciones-carrito="cart-icon-bubble" aria-label="${esc(sala.titulo)}">
  <div class="pq-sala__scroller">
    <div class="pq-sala__lienzo" style="--pq-ancho:${sala.ancho};--pq-alto:${sala.alto}">
      <img class="pq-sala__capa pq-sala__fondo" src="${mayor(sala.fondo)}" srcset="${srcset(sala.fondo)}" ${sizes} ${tam} alt="${esc(sala.titulo)}" fetchpriority="high">
      ${sombras}${objetos}
      <svg class="pq-sala__zonas" viewBox="0 0 ${sala.ancho} ${sala.alto}" preserveAspectRatio="none" aria-label="Piezas de la sala">${zonas}</svg>
      ${puntos}
    </div>
  </div>
  <p class="pq-sala__ayuda">Tocá un mueble u obra para ver su precio. También podés elegir desde la lista.</p>
  <nav class="pq-sala__puertas" aria-label="Otras salas"><ul><li><a href="#sala-vecina">Ir a la sala vecina →</a></li></ul></nav>
  <h2>Piezas en esta sala</h2>
  <ul class="pq-sala__lista">${lista}</ul>
  <dialog class="pq-ficha" data-pq-ficha aria-labelledby="pq-ficha-titulo">
    <button type="button" class="pq-ficha__cerrar" data-pq-cerrar aria-label="Cerrar">×</button>
    <img class="pq-ficha__imagen" data-pq-f="imagen" alt="" width="560" height="560">
    <h2 class="pq-ficha__titulo" id="pq-ficha-titulo" data-pq-f="titulo"></h2>
    <p class="pq-ficha__precio" data-pq-f="precio"></p>
    <p class="pq-ficha__estado" data-pq-f="estado"></p>
    <div class="pq-ficha__acciones">
      <button type="button" data-pq-agregar>Agregar al carrito</button>
      <button type="button" data-pq-comprar>Comprar ahora</button>
    </div>
    <p class="pq-ficha__mensaje" data-pq-f="mensaje" role="status" aria-live="polite"></p>
    <a data-pq-f="enlace" href="#">Ver ficha completa</a>
  </dialog>
  <script type="application/json" data-pq-productos>${JSON.stringify(productos).replace(/</g, '\\u003c')}</script>
</section>`;
})();
