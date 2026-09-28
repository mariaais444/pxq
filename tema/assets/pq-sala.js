/* p*q · salas por capas. Sin dependencias.
 * Busca cada [data-pq-sala] y le da vida: zonas clickeables, ficha, stock y carrito.
 * Mismo archivo para el prototipo y para assets/pq-sala.js del tema. */
(() => {
  'use strict';

  const raiz = () => (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';

  // Llamadas a Shopify. El prototipo las reemplaza definiendo window.PQSala.api antes de cargar este archivo.
  const api = {
    async producto(handle) {
      const r = await fetch(raiz() + 'products/' + encodeURIComponent(handle) + '.js', { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    },
    async agregar(cuerpo) {
      const r = await fetch(raiz() + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      return { ok: r.ok, status: r.status, datos: await r.json().catch(() => ({})) };
    },
    async carrito() {
      const r = await fetch(raiz() + 'cart.js', { headers: { Accept: 'application/json' } });
      return r.json();
    },
    irAlCheckout() {
      window.location.href = raiz() + 'checkout';
    },
  };
  window.PQSala = window.PQSala || {};
  window.PQSala.api = Object.assign(api, window.PQSala.api);

  const TEXTOS = {
    disponible: 'Disponible',
    vendido: 'Vendido',
    consultando: 'Consultando disponibilidad…',
    agregando: 'Agregando…',
    agregado: 'Listo, está en tu carrito.',
    error: 'No se pudo agregar. Probá de nuevo.',
  };

  class Sala {
    constructor(el) {
      this.el = el;
      this.productos = JSON.parse(el.querySelector('[data-pq-productos]').textContent);
      this.modo = el.dataset.vendido === 'punto' ? 'punto' : 'ocultar';
      this.secciones = (el.dataset.seccionesCarrito || '').split(',').map((s) => s.trim()).filter(Boolean);
      this.ficha = el.querySelector('[data-pq-ficha]');
      this.f = {};
      this.ficha.querySelectorAll('[data-pq-f]').forEach((n) => (this.f[n.dataset.pqF] = n));
      this.botones = [...this.ficha.querySelectorAll('[data-pq-agregar],[data-pq-comprar]')];

      for (const pieza in this.productos) this.estado(pieza, this.productos[pieza].disponible);

      el.addEventListener('click', (e) => this.alClic(e));
      el.addEventListener('keydown', (e) => {
        const t = e.target.closest('[data-pq-abrir]');
        if (t && t.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          this.abrir(t.dataset.pieza, t);
        }
      });
      const resaltar = (e, si) => {
        const t = e.target.closest && e.target.closest('.pq-sala__lienzo [data-pq-abrir]');
        if (t) this.resaltar(t.dataset.pieza, si);
      };
      el.addEventListener('pointerover', (e) => resaltar(e, true));
      el.addEventListener('pointerout', (e) => resaltar(e, false));
      el.addEventListener('focusin', (e) => resaltar(e, true));
      el.addEventListener('focusout', (e) => resaltar(e, false));
      this.ficha.addEventListener('close', () => {
        if (this.origen && this.origen.isConnected) this.origen.focus({ preventScroll: true });
        this.actual = null;
      });

      // En pantallas angostas la sala se desplaza de costado: arrancamos en el centro.
      const s = el.querySelector('.pq-sala__scroller');
      if (s && s.scrollWidth > s.clientWidth) s.scrollLeft = (s.scrollWidth - s.clientWidth) / 2;
    }

    piezas(pieza, selector = '') {
      return this.el.querySelectorAll(selector + '[data-pieza="' + CSS.escape(pieza) + '"]');
    }

    alClic(e) {
      const abrir = e.target.closest('[data-pq-abrir]');
      if (abrir) return this.abrir(abrir.dataset.pieza, abrir);
      if (e.target.closest('[data-pq-cerrar]')) return this.ficha.close();
      if (e.target.closest('[data-pq-agregar]')) return this.agregar(false);
      if (e.target.closest('[data-pq-comprar]')) return this.agregar(true);
      if (e.target === this.ficha) {
        // Clic en el fondo oscuro, fuera del panel.
        const r = this.ficha.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) this.ficha.close();
      }
    }

    // Marca cada elemento de la pieza como vendido o no; el CSS decide si se oculta o muestra punto rojo.
    estado(pieza, disponible) {
      const p = this.productos[pieza];
      p.disponible = disponible;
      const vendidoOculto = !disponible && this.modo === 'ocultar';
      const texto = disponible ? TEXTOS.disponible : TEXTOS.vendido;
      this.piezas(pieza).forEach((n) => {
        n.toggleAttribute('data-vendido', !disponible);
        if (n.matches('.pq-sala__zona')) {
          n.setAttribute('aria-label', (p.etiqueta || p.titulo) + ', ' + p.precio + ', ' + texto.toLowerCase());
          n.setAttribute('tabindex', vendidoOculto ? '-1' : '0');
          n.setAttribute('aria-hidden', vendidoOculto ? 'true' : 'false');
        }
      });
      this.piezas(pieza, '[data-pq-estado]').forEach((n) => (n.textContent = texto));
    }

    resaltar(pieza, si) {
      this.piezas(pieza, '.pq-sala__objeto').forEach((n) => n.classList.toggle('is-activa', si));
    }

    abrir(pieza, origen) {
      const p = this.productos[pieza];
      if (!p) return;
      this.actual = pieza;
      this.origen = origen;
      this.pintar(p, true);
      if (!this.ficha.open) this.ficha.showModal();

      window.PQSala.api
        .producto(p.handle)
        .then((d) => {
          const v = d.variants.find((x) => x.available) || d.variants[0];
          if (v) {
            p.variante = v.id;
            if (v.price !== p.precio_centavos && p.moneda) {
              p.precio_centavos = v.price;
              p.precio = new Intl.NumberFormat(document.documentElement.lang || 'es-AR', { style: 'currency', currency: p.moneda }).format(v.price / 100);
            }
          }
          this.estado(pieza, !!d.available);
        })
        .catch(() => {}) // Sin conexión: nos quedamos con los datos de la página.
        .then(() => {
          if (this.actual === pieza) this.pintar(p, false);
        });
    }

    pintar(p, consultando) {
      const f = this.f;
      if (f.imagen) {
        f.imagen.src = p.imagen || '';
        f.imagen.alt = p.imagen_alt || p.titulo;
        f.imagen.hidden = !p.imagen;
      }
      f.titulo.textContent = p.titulo;
      f.precio.textContent = p.precio;
      f.estado.textContent = consultando ? TEXTOS.consultando : p.disponible ? TEXTOS.disponible : TEXTOS.vendido;
      f.estado.toggleAttribute('data-vendido', !consultando && !p.disponible);
      if (f.enlace) f.enlace.href = p.url;
      if (consultando) f.mensaje.textContent = '';
      this.botones.forEach((b) => (b.disabled = consultando || !p.disponible));
    }

    async agregar(comprarAhora) {
      const pieza = this.actual;
      const p = this.productos[pieza];
      if (!p || !p.disponible) return;
      const cuerpo = { items: [{ id: p.variante, quantity: 1 }] };
      const carrito = comprarAhora ? null : carritoDelTema(this.secciones);
      if (carrito && carrito.secciones.length) {
        cuerpo.sections = carrito.secciones.join(',');
        cuerpo.sections_url = window.location.pathname;
      }
      this.botones.forEach((b) => (b.disabled = true));
      this.ficha.setAttribute('aria-busy', 'true');
      this.f.mensaje.removeAttribute('data-error');
      this.f.mensaje.textContent = TEXTOS.agregando;

      let r;
      try {
        r = await window.PQSala.api.agregar(cuerpo);
      } catch (e) {
        r = { ok: false, datos: {} };
      }
      this.ficha.removeAttribute('aria-busy');

      if (!r.ok) {
        this.f.mensaje.setAttribute('data-error', '');
        this.f.mensaje.textContent = r.datos.description || r.datos.message || TEXTOS.error;
        this.botones.forEach((b) => (b.disabled = !p.disponible));
        return;
      }
      if (comprarAhora) return window.PQSala.api.irAlCheckout();

      this.f.mensaje.textContent = TEXTOS.agregado;
      this.botones.forEach((b) => (b.disabled = !p.disponible));
      document.dispatchEvent(new CustomEvent('pq:carrito-actualizado', { detail: r.datos }));
      if (carrito) await carrito.avisar(r.datos, this.ficha, p.variante).catch(() => {});
    }
  }

  // Cada tema actualiza su carrito a su manera. Devolvemos qué secciones pedir y cómo avisarle.
  function carritoDelTema(extra) {
    // Horizon: escucha el evento estándar de Shopify (cart:lines-update) y sus listas de carrito
    // se re-dibujan con el HTML de las secciones que vienen en la respuesta.
    const listas = [...document.querySelectorAll('cart-items-component[data-section-id]')].map((n) => n.dataset.sectionId);
    if (listas.length || document.querySelector('cart-icon, cart-drawer-component')) {
      return {
        secciones: [...new Set(listas.concat(extra))],
        async avisar(datos, origen, variante) {
          const { CartLinesUpdateEvent } = await import('@shopify/events');
          const c = await window.PQSala.api.carrito();
          const diferida = CartLinesUpdateEvent.createPromise();
          // Se dispara desde la ficha: si el tema abre su carrito lateral, espera a que la cerremos.
          origen.dispatchEvent(
            new CartLinesUpdateEvent({
              action: 'add',
              context: 'product',
              lines: [{ merchandiseId: String(variante), quantity: 1 }],
              promise: diferida.promise,
            })
          );
          diferida.resolve({
            cart: CartLinesUpdateEvent.createCartFromAjaxResponse(c),
            detail: { items: c.items, itemCount: 1, sections: datos.sections, didError: false, source: 'pq-sala' },
          });
        },
      };
    }
    // Dawn y temas parecidos: el carrito lateral o el aviso saben re-dibujarse solos.
    const dawn = document.querySelector('cart-drawer, cart-notification');
    if (dawn && dawn.getSectionsToRender && dawn.renderContents) {
      return {
        secciones: [...new Set(dawn.getSectionsToRender().map((s) => s.id).concat(extra))],
        async avisar(datos, origen) {
          origen.close(); // el carrito de Dawn no es un diálogo: si no, quedaría tapado por la ficha
          dawn.classList.remove('is-empty');
          dawn.renderContents(Object.assign({}, datos.items && datos.items[0], { sections: datos.sections }));
        },
      };
    }
    // Otro tema: reemplazamos las secciones indicadas en data-secciones-carrito.
    return {
      secciones: extra,
      async avisar(datos) {
        for (const id in datos.sections || {}) {
          const destino = document.getElementById('shopify-section-' + id);
          if (!destino || !datos.sections[id]) continue;
          const doc = new DOMParser().parseFromString(datos.sections[id], 'text/html');
          destino.innerHTML = (doc.getElementById('shopify-section-' + id) || doc.body).innerHTML;
        }
      },
    };
  }

  const iniciar = () =>
    document.querySelectorAll('[data-pq-sala]:not([data-pq-iniciada])').forEach((el) => {
      el.setAttribute('data-pq-iniciada', '');
      new Sala(el);
    });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
  document.addEventListener('shopify:section:load', iniciar); // editor de temas
})();
