# p*q · salas por capas

Salas ilustradas que se recorren: tocás un mueble u obra y se abre su ficha para comprarlo. Pensado para Shopify, sin 3D ni frameworks.

- `prompt-claude-code.md`: el encargo completo.
- `docs/revision-y-plan.md`: qué se encontró, qué se hizo, qué se midió y qué falta decidir.
- `capas-ejemplo/`: sala de prueba separada en capas, más `sala.config.json` con el orden y los nombres.
- `scripts/preparar-sala.mjs`: convierte las capas a WebP y calcula las zonas clickeables.
- `prototipo/`: prueba local. Abrí `prototipo/index.html` en el navegador.

```bash
npm install
npm run preparar:ejemplo   # regenera prototipo/sala/
```
