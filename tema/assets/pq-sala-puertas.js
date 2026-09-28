/* p*q · Puertas entre salas. Sin dependencias, sin 3D.
 * Al cruzar una puerta: se acerca a la puerta agrandando las capas (el fondo menos que los objetos, para
 * que se note la profundidad), la puerta se abre si tiene capas, y la sala siguiente entra desde el lado de
 * su puerta. No recarga la página: trae la sala con la Section Rendering API y cambia la URL con pushState.
 * Si algo falla, navega normal: la puerta es un enlace de verdad. */
(() => {
  'use strict';

  const T = { acercar: 700, abrir: 150, velo: 450, entrar: 600, acomodar: 900, reducido: 200, limite: 3000 };
  const ESCALA_FONDO = 2.2;
  const ESCALA_OBJETOS = 2.6;
  const ENTRADA = { escala: 1.12, corrimiento: 3 }; // la sala nueva arranca agrandada y corrida (en %)
  const movReducido = matchMedia('(prefers-reduced-motion: reduce)');
  const cache = new Map();
  const montadas = new Map(); // salas ya armadas en la página, ocultas, listas para aparecer
  let enCurso = false;
  let pendiente = false;

  const salaActual = () => document.querySelector('[data-pq-sala]:not([data-pq-montada])');
  const absoluta = (u) => new URL(u, location.href).href;
  const ruta = (u) => new URL(u, location.href).pathname.replace(/\/$/, '');
  const hrefDe = (a) => a.getAttribute('href');
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const zoomDe = (a) => (a && a.dataset.zoom ? a.dataset.zoom.split(',').map(Number) : [50, 50]);
  const puertaHacia = (sala, url) => sala && [...sala.querySelectorAll('[data-pq-puerta]')].find((a) => ruta(hrefDe(a)) === ruta(url));

  // --- Precarga: HTML de la sala destino e imágenes de sus capas ---
  function precargarImagen(img) {
    return new Promise((listo) => {
      const i = new Image();
      if (img.getAttribute('sizes')) i.sizes = img.getAttribute('sizes');
      if (img.getAttribute('srcset')) i.srcset = img.getAttribute('srcset');
      i.src = img.getAttribute('src');
      (i.decode ? i.decode() : Promise.reject()).then(listo, () => (i.complete ? listo() : (i.onload = i.onerror = listo)));
    });
  }

  function pedir(url) {
    url = absoluta(url);
    if (cache.has(url)) return cache.get(url);
    const u = new URL(url);
    const actual = salaActual();
    if (actual && actual.dataset.seccion) u.searchParams.set('section_id', actual.dataset.seccion);
    const promesa = fetch(u, { headers: { Accept: 'text/html' } })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(async (html) => {
        const nueva = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-pq-sala]');
        if (!nueva) throw new Error('La respuesta no trae una sala');
        await Promise.all([...nueva.querySelectorAll('.pq-sala__lienzo img')].map(precargarImagen));
        return nueva;
      });
    promesa.catch(() => cache.delete(url));
    cache.set(url, promesa);
    return promesa;
  }

  // Arma la sala destino en la página, oculta y sin tapar nada, para que al cruzar solo haya que mostrarla.
  function montar(url) {
    url = absoluta(url);
    if (montadas.has(url)) return montadas.get(url);
    const promesa = pedir(url).then((original) => {
      const vieja = salaActual();
      const nodo = document.importNode(original, true);
      nodo.setAttribute('data-pq-montada', '');
      nodo.inert = true; // fuera del teclado y de los lectores de pantalla mientras espera
      // Casi transparente (no oculta): así el navegador ya la pinta y al cruzar solo tiene que mostrarla.
      Object.assign(nodo.style, { position: 'absolute', left: '0', right: '0', top: vieja.offsetTop + 'px', zIndex: '-1', opacity: '0.001', pointerEvents: 'none' });
      vieja.after(nodo);
      window.PQSala.iniciar();
      return nodo;
    });
    promesa.catch(() => montadas.delete(url));
    montadas.set(url, promesa);
    return promesa;
  }
  const montarEnReposo = (url) =>
    pedir(url)
      .then(() => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 800 }) : setTimeout(r, 50))))
      .then(() => !enCurso && montar(url))
      .catch(() => {});
  function desmontarTodas() {
    montadas.forEach((p) => p.then((n) => n.isConnected && n.hasAttribute('data-pq-montada') && n.remove(), () => {}));
    montadas.clear();
  }

  // --- Transición ---
  async function cruzar(puerta, url, desdeHistorial) {
    if (enCurso) return;
    const vieja = salaActual();
    if (!vieja) return (location.href = url);
    enCurso = true;
    document.dispatchEvent(new CustomEvent('pq:transicion-inicio', { detail: { url } }));

    const inicio = performance.now();
    const carga = montar(url);
    const anims = [];
    const alSaltar = [];
    let saltar = false;
    const saltear = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      saltar = true;
      anims.forEach((a) => a.finish());
      alSaltar.splice(0).forEach((f) => f());
    };
    const pausa = (ms) =>
      new Promise((listo) => {
        const t = setTimeout(listo, saltar ? 0 : ms);
        alSaltar.push(() => (clearTimeout(t), listo()));
      });
    addEventListener('keydown', saltear, true);
    addEventListener('pointerdown', saltear, true);
    const animar = (el, frames, op) => {
      const a = el.animate(frames, { fill: 'forwards', ...op, duration: saltar ? 0 : op.duration });
      anims.push(a);
      return a;
    };

    let velo = null;
    try {
      if (scrollY > 0) scrollTo(0, 0);
      const reducido = movReducido.matches;
      if (!reducido) velo = fase1(vieja, puerta, animar);
      // La fase 2 arranca a los 600 ms, o cuando termine de cargar (máximo 3 s desde el clic).
      await pausa(reducido ? 0 : T.entrar);
      const limite = esperar(Math.max(0, T.limite - (performance.now() - inicio))).then(() => {
        throw new Error('La sala tardó demasiado');
      });
      limite.catch(() => {});
      const nueva = await Promise.race([carga, limite]);
      await fase2(vieja, nueva, animar, reducido);

      vieja.remove();
      if (velo) velo.remove();
      desmontarTodas(); // las otras salas armadas quedaron ubicadas según la sala anterior
      if (!desdeHistorial) history.pushState({ pqSala: absoluta(url) }, '', url);
      anunciar(nueva);
    } catch (e) {
      location.href = url; // si falla la carga o algo más, navegación normal
      return;
    } finally {
      removeEventListener('keydown', saltear, true);
      removeEventListener('pointerdown', saltear, true);
      enCurso = false;
    }
    document.dispatchEvent(new CustomEvent('pq:transicion-fin', { detail: { url, ms: Math.round(performance.now() - inicio) } }));
    if (pendiente) {
      pendiente = false;
      irA(location.href);
    }
  }

  // Fase 1: acercarse a la puerta. Solo transform y opacity.
  function fase1(sala, puerta, animar) {
    const [x, y] = zoomDe(puerta);
    const origen = x + '% ' + y + '%';
    const lienzo = sala.querySelector('.pq-sala__lienzo');
    const acercar = (sel, escala) =>
      lienzo.querySelectorAll(sel).forEach((el) => {
        el.style.transformOrigin = origen;
        el.style.willChange = 'transform';
        animar(el, [{ transform: 'scale(1)' }, { transform: 'scale(' + escala + ')' }], { duration: T.acercar, easing: 'cubic-bezier(.5,0,.8,.3)' });
      });
    acercar('.pq-sala__fondo, .pq-sala__puerta-capa', ESCALA_FONDO);
    acercar('.pq-sala__sombra, .pq-sala__objeto', ESCALA_OBJETOS);
    acercar('.pq-sala__frente', ESCALA_OBJETOS + 0.4);
    // Lo que flota encima (zonas, puntos, etiquetas, ayuda) se va enseguida.
    sala.querySelectorAll('.pq-sala__zonas, .pq-sala__punto, .pq-sala__puerta, .pq-sala__ayuda, .pq-sala__puertas').forEach((el) =>
      animar(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 150 })
    );
    const id = puerta && puerta.dataset.pqPuerta;
    const abierta = id && lienzo.querySelector('.pq-sala__puerta-abierta[data-puerta="' + CSS.escape(id) + '"]');
    if (abierta) animar(abierta, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: T.abrir });
    const velo = document.createElement('div');
    velo.className = 'pq-velo';
    document.body.appendChild(velo);
    animar(velo, [{ opacity: 0 }, { opacity: 0.9 }], { duration: T.acercar - T.velo, delay: T.velo, easing: 'ease-in' });
    return velo;
  }

  // Fase 2: la sala nueva aparece encima con un fundido, agrandada y corrida hacia su puerta de entrada,
  // y se acomoda con un movimiento que frena al final.
  async function fase2(vieja, nueva, animar, reducido) {
    nueva.removeAttribute('data-pq-montada');
    nueva.inert = false;
    Object.assign(nueva.style, { top: vieja.offsetTop + 'px', zIndex: '9', pointerEvents: '' });
    const entrada = puertaHacia(nueva, vieja.dataset.url || location.href);
    const [x, y] = zoomDe(entrada);
    const lado = entrada ? (x < 50 ? -1 : 1) : 0;
    const lienzo = nueva.querySelector('.pq-sala__lienzo');
    const esperas = [animar(nueva, [{ opacity: 0 }, { opacity: 1 }], { duration: reducido ? T.reducido : 350, easing: 'ease-out' }).finished];
    if (!reducido) {
      lienzo.style.transformOrigin = x + '% ' + y + '%';
      esperas.push(
        animar(
          lienzo,
          [{ transform: 'translateX(' + lado * ENTRADA.corrimiento + '%) scale(' + ENTRADA.escala + ')' }, { transform: 'none' }],
          { duration: T.acomodar, easing: 'cubic-bezier(.16,1,.3,1)' }
        ).finished
      );
    }
    await Promise.all(esperas);
    nueva.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    nueva.removeAttribute('style');
    lienzo.style.transformOrigin = '';
  }

  // Después: título, barra, foco en el título de la sala nueva y aviso para lectores de pantalla.
  function anunciar(sala) {
    const titulo = sala.dataset.titulo || '';
    const barra = document.querySelector('.pq-barra__sala');
    if (barra) {
      document.title = document.title.replace(barra.textContent.trim(), titulo);
      barra.textContent = titulo;
    }
    const h1 = sala.querySelector('.pq-sala__titulo');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
    let aviso = document.querySelector('.pq-anuncio');
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.className = 'pq-anuncio';
      aviso.setAttribute('aria-live', 'polite');
      document.body.appendChild(aviso);
    }
    aviso.textContent = titulo;
  }

  function irA(url) {
    const sala = salaActual();
    if (!sala || ruta(url) === ruta(sala.dataset.url || location.href)) return;
    cruzar(puertaHacia(sala, url), url, true);
  }

  // --- Eventos ---
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-pq-puerta]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    cruzar(a, hrefDe(a), false);
  });
  // Al acercarse a una puerta: se precarga la sala destino y se preparan las capas para el zoom,
  // así el clic no tiene que hacer ese trabajo.
  const preparar = (si) => {
    const sala = salaActual();
    if (sala) sala.querySelectorAll('.pq-sala__lienzo .pq-sala__capa').forEach((el) => (el.style.willChange = si ? 'transform' : ''));
  };
  const alAcercarse = (e) => {
    const a = e.target.closest && e.target.closest('[data-pq-puerta]');
    if (!a) return;
    montarEnReposo(hrefDe(a));
    preparar(true);
  };
  const alAlejarse = (e) => {
    const a = e.target.closest && e.target.closest('[data-pq-puerta]');
    if (a && !enCurso && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-pq-puerta]'))) preparar(false);
  };
  document.addEventListener('pointerover', alAcercarse);
  document.addEventListener('focusin', alAcercarse);
  document.addEventListener('pointerout', alAlejarse);
  document.addEventListener('focusout', alAlejarse);

  // Precarga en reposo: tras unos segundos sin actividad, trae todas las salas vecinas.
  let reposo;
  const reiniciarReposo = () => {
    clearTimeout(reposo);
    reposo = setTimeout(() => {
      const sala = salaActual();
      if (sala) sala.querySelectorAll('[data-pq-puerta]').forEach((a) => montarEnReposo(hrefDe(a)));
    }, 3000);
  };
  ['pointermove', 'keydown', 'scroll'].forEach((t) => addEventListener(t, reiniciarReposo, { passive: true }));
  reiniciarReposo();

  // Atrás y Adelante del navegador: la misma transición, por la puerta que lleva a esa sala.
  if (!history.state || !history.state.pqSala) history.replaceState({ ...history.state, pqSala: location.href }, '');
  addEventListener('popstate', (e) => {
    if (!e.state || !e.state.pqSala) return;
    if (enCurso) pendiente = true;
    else irA(e.state.pqSala);
  });
})();
