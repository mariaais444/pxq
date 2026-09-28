# p*q · salas por capas

Salas ilustradas que se recorren: tocás un mueble u obra y se abre su ficha para comprarlo. Pensado para Shopify, sin 3D ni frameworks.

- `prompt-claude-code.md`: el encargo completo.
- `docs/revision-y-plan.md`: qué se encontró, qué se hizo, qué se midió y qué falta decidir.
- `capas-ejemplo/`: sala de prueba separada en capas, más `sala.config.json` con el orden y los nombres.
- `scripts/preparar-sala.mjs`: convierte las capas a WebP y calcula las zonas clickeables.
- `prototipo/`: prueba local. Abrí `prototipo/index.html` en el navegador.
- `tema/`: los archivos que van dentro del tema de Shopify (sección, ficha, JS, CSS y plantilla). Ver `docs/etapa-4-tema.md`.
- `scripts/instalar-en-tema.mjs`: copia `tema/` dentro de una copia local del tema.
- `scripts/probar-seccion.mjs`: renderiza la sección de Liquid con datos de prueba, sin tienda.
- `scripts/metaobjetos.graphql`: definiciones de "Sala" y "Pieza en sala" para la Admin API.

```bash
npm install
npm run preparar:ejemplo   # regenera prototipo/sala/
npm run probar:seccion     # renderiza la sección de Liquid en prototipo/seccion.html
```
