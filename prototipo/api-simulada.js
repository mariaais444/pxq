/* Solo para pruebas locales: simula las respuestas de Shopify (stock y carrito) con productos de prueba.
 * La usan prototipo/index.html y la página de prueba de la sección (scripts/probar-seccion.mjs). */
(() => {
  const sala = window.PQ_SALA;

  // Productos de prueba. No son productos reales.
  // - lampara: ya vendida cuando se "renderizó" la página.
  // - sillon: la página dice disponible, pero al confirmar stock resulta vendido.
  // - mesa: se puede agregar una vez; la segunda responde 422, como Shopify con stock 1.
  const pesos = (n) => '$ ' + n.toLocaleString('es-AR') + ',00';
  const base = {
    obra: 480000,
    aparador: 620000,
    lampara: 95000,
    sofa: 1350000,
    sillon: 410000,
    mesa: 280000,
  };
  const productos = {};
  let variante = 1000;
  for (const p of sala.piezas) {
    const precio = base[p.pieza] || 100000;
    productos[p.pieza] = {
      handle: 'prueba-' + p.pieza,
      titulo: p.etiqueta + ' (producto de prueba)',
      precio: pesos(precio),
      precio_centavos: precio * 100,
      moneda: 'ARS',
      disponible: p.pieza !== 'lampara',
      variante: ++variante,
      url: '#producto-' + p.pieza,
      imagen: 'productos/' + p.pieza + '.webp',
      imagen_alt: p.etiqueta + ' (producto de prueba)',
    };
  }
  const stockReal = { lampara: 0, sillon: 0 };
  const carrito = new Map();
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  window.PQ_PRODUCTOS_PRUEBA = productos;
  window.PQSala = {
    api: {
      async producto(handle) {
        await espera(250);
        const pieza = handle.replace('prueba-', '');
        const p = productos[pieza];
        const disponible = (stockReal[pieza] ?? 1) > 0;
        return { handle, available: disponible, variants: [{ id: p.variante, available: disponible, price: p.precio_centavos }] };
      },
      async agregar(cuerpo) {
        await espera(300);
        const { id } = cuerpo.items[0];
        const p = Object.values(productos).find((x) => x.variante === id);
        if (carrito.has(id)) {
          return { ok: false, status: 422, datos: { status: 422, message: 'Cart Error', description: `Ya tenés todas las unidades de ${p.titulo} en tu carrito.` } };
        }
        carrito.set(id, 1);
        const datos = { items: [{ id, quantity: 1, title: p.titulo }] };
        if (cuerpo.sections) {
          datos.sections = {};
          for (const s of cuerpo.sections.split(',')) {
            if (s === 'cart-icon-bubble') {
              datos.sections[s] = `<div id="shopify-section-cart-icon-bubble"><a href="#carrito">Carrito (<span data-contador>${carrito.size}</span>)</a></div>`;
            }
          }
        }
        return { ok: true, status: 200, datos };
      },
      async carrito() {
        return { item_count: carrito.size, items: [...carrito.keys()].map((id) => ({ id, quantity: 1 })) };
      },
      irAlCheckout() {
        alert('Acá iría a /checkout. En el prototipo no hay checkout.');
      },
    },
  };
})();
