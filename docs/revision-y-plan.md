# Salas por capas de p*q: revisión, avance y plan

Documento de la **etapa 1** del prompt (`prompt-claude-code.md`), más el resultado de las etapas 2 y 3, que se hacen en local y no tocan Shopify.

## 1. Qué encontré en la carpeta

- **No hay tema de Shopify.** El repo tenía solo el prompt y las 11 capas PNG, sueltas en la raíz. No hay Horizon, Dawn ni carrito que revisar todavía.
- Moví las capas a `capas-ejemplo/`, como dice el prompt.
- Las capas cumplen la regla: todas miden **1280 × 800**, el fondo es opaco y el resto es transparente.
- Hay 6 objetos (`obra`, `aparador`, `lampara`, `sofa`, `sillon`, `mesa`) y 4 sombras. **La lámpara y la obra no tienen sombra.** Está bien, el script lo soporta.
- Detalle técnico: cada PNG pesa entre 700 y 900 KB aunque sea casi todo transparente. Es porque debajo de lo transparente quedaron colores "escondidos" que igual ocupan lugar. Al pasar a WebP se descartan, y **la sala completa baja de ~7,6 MB a ~96 KB**.

## 2. Lo que ya está hecho (etapas 2 y 3)

### Script de preparación: `scripts/preparar-sala.mjs`

```bash
npm install
node scripts/preparar-sala.mjs capas-ejemplo prototipo/sala
```

Para cada capa:

1. Genera WebP en 1600 y 800 px. **No agranda:** como el lienzo mide 1280, la versión grande sale en 1280. Estirar a 1600 pesaría más sin verse mejor.
2. Calcula el contorno de lo visible, lo agranda 6 px para que sea fácil de tocar y lo simplifica a 40 puntos como máximo, guardado en porcentajes.
3. Calcula el punto indicador: centrado y un poco arriba de la pieza.
4. Escribe `sala.json` (y `sala.data.js`, que es lo mismo pero se puede abrir sin servidor).

El orden de adelante hacia atrás y los nombres salen de `capas-ejemplo/sala.config.json`. Si falta, el script pone adelante las piezas que están más abajo en el dibujo y avisa.

### Prototipo: `prototipo/index.html`

Se abre con doble clic. Usa productos **de prueba** (no reales) y simula las respuestas de Shopify. Tiene tres casos preparados:

- La **lámpara** ya está vendida.
- El **sillón** figura disponible, pero al abrirlo se confirma que se vendió.
- La **mesa** se puede agregar una sola vez. La segunda vez responde 422, como hace Shopify cuando no hay más stock.

`pq-sala.js` y `pq-sala.css` están escritos para copiarse al tema **tal cual**. El prototipo arma el mismo HTML que va a generar la sección de Liquid.

### Qué medí (Chromium, prueba automática `scripts/probar-prototipo.mjs`)

| Criterio | Resultado |
|---|---|
| Tocar cada una de las 6 piezas abre su ficha | ✅ Incluye la mesa delante del sofá y la lámpara arriba del aparador |
| Clic en la pared no abre nada | ✅ |
| Vendido → ocultar capa y sombra / punto rojo | ✅ Los dos modos |
| Stock confirmado al abrir (caso sillón) | ✅ Pasa a "Vendido", se desactivan los botones y se oculta la capa |
| Agregar al carrito actualiza el contador sin recargar | ✅ Carrito simulado |
| Error 422 dentro del panel | ✅ |
| Teclado: Tab, Enter, Espacio, Escape y el foco vuelve a la pieza | ✅ |
| Lector de pantalla: cada zona es "botón" con nombre, precio y estado | ✅ Revisé los atributos; no lo probé con VoiceOver ni TalkBack |
| Celular: lienzo de 820 px centrado al entrar | ✅ |
| Peso total de la página en celular (pantalla 3x) | ✅ **114 KB** (límite: 1,5 MB) |
| JS sin minificar ≤ 15 KB | ✅ ~9 KB |

**Todavía sin medir, y por qué:**

- **Safari y Android real:** solo tengo Chromium. Prueba propuesta: abrir el prototipo en un iPhone y en un Android de gama media, y tocar las 6 piezas.
- **LCP ≤ 2,5 s e INP ≤ 200 ms:** hay que medirlos en la tienda real con PageSpeed Insights. En el prototipo local el LCP dio 76 ms sin simular 4G, un número que no sirve para decidir. Con 114 KB en total, no espero problemas.
- **`shopify theme check`:** todavía no hay tema.

### Algo para que decidas

El punto de la **mesa** queda dibujado encima del sofá, porque "justo arriba de la pieza" cae sobre el sofá. Funciona bien: tocarlo abre la mesa. Pero visualmente puede confundir. Opciones:

1. Dejarlo así.
2. Agregar en `sala.config.json` un ajuste manual del punto por pieza.
3. Para piezas tapadas, poner el punto en el centro de la pieza.

## 3. Definiciones de metaobjetos propuestas (esperan tu OK)

### Pieza en sala (`pieza_en_sala`)

| Campo | Clave | Tipo en Shopify | Obligatorio |
|---|---|---|---|
| Producto | `producto` | Producto (referencia) | Sí |
| Capa | `capa` | Archivo, solo imágenes | Sí |
| Sombra | `sombra` | Archivo, solo imágenes | No |
| Orden | `orden` | Número entero | Sí |
| Zona | `zona` | JSON | Sí |
| Etiqueta accesible | `etiqueta` | Texto de una línea | Sí |

El campo `zona` se copia de `sala.json` con este formato. Todos los números son porcentajes del lienzo.

```json
{ "puntos": [[14.77, 41.25], [22.5, 42.0]], "punto": [18.2, 38.75] }
```

### Sala (`sala`)

| Campo | Clave | Tipo en Shopify | Obligatorio |
|---|---|---|---|
| Título | `titulo` | Texto de una línea | Sí |
| Fondo | `fondo` | Archivo, solo imágenes | Sí |
| Ancho del lienzo | `ancho` | Número entero | Sí |
| Alto del lienzo | `alto` | Número entero | Sí |
| Piezas | `piezas` | Lista de metaobjetos "Pieza en sala" | Sí |
| Salas vecinas | `salas_vecinas` | Lista de metaobjetos "Sala" | No |
| Descripción para SEO | `descripcion_seo` | Texto de varias líneas | No |

Opciones de la definición "Sala":

- **Publicar como páginas web** activado, con prefijo de URL `salas`.
- Estado activo o borrador activado, para preparar una sala sin mostrarla.
- Título y descripción SEO tomados de `titulo` y `descripcion_seo`.

Con esto, cada sala tendría una dirección del tipo `/pages/salas/<nombre>`. **Hay que confirmarlo en la tienda de desarrollo.**

Para crearlas hay dos caminos. Los dos se van a detallar en la etapa 5:

- **Desde el admin**, sin código: *Configuración → Datos personalizados → Metaobjetos → Agregar definición*. Primero "Pieza en sala" y después "Sala". El campo `salas_vecinas` se agrega al final, porque apunta a la misma definición.
- **Con una consulta GraphQL** (`metaobjectDefinitionCreate`) desde la app GraphiQL de Shopify. La escribo en la etapa 4 y la pruebo en la tienda de desarrollo antes de pasártela, porque no pude verificarla acá.

## 4. Plan de las etapas que faltan

**Etapa 4: tema.** Necesito que me digas:

- Qué tema vas a usar. Recomiendo **Horizon**, que es el tema gratuito actual de Shopify, o Dawn.
- Una **tienda de desarrollo** (gratis con Shopify Partners) donde correr `shopify theme dev`.

Lo que haría:

- `sections/pq-sala.liquid`, `snippets/pq-ficha.liquid`, `templates/metaobject/sala.json`, y `assets/pq-sala.js` y `.css` copiados del prototipo.
- *Settings* de la sección: mostrar puntos, qué hacer con lo vendido y texto de ayuda.
- Revisar cómo el tema elegido arma su carrito lateral, para pasar los IDs correctos en `data-secciones-carrito`. Por ejemplo, en Dawn son `cart-drawer` y `cart-icon-bubble`. En Horizon hay que mirarlo.
- Siempre en una **copia no publicada** del tema. Nunca en el tema en vivo.
- `shopify theme check` sin errores.

**Etapa 5:** guía en español, paso a paso, para cargar una sala nueva desde el admin.

**Etapa 6 (opcional, te pregunto antes):** script que sube las imágenes y crea los metaobjetos con la Admin API.

Checkout y pagos quedan afuera. Mercado Pago se configura desde el admin.
