# Etapa 4: la sala dentro del tema

## Qué hay en `tema/`

Son solo los archivos nuevos. Se copian adentro de una copia del tema y no pisan nada del tema.

| Archivo | Qué hace |
|---|---|
| `sections/pq-sala.liquid` | Arma la sala con los datos del metaobjeto: fondo, sombras, piezas, zonas, puntos, puertas y lista de piezas. |
| `snippets/pq-ficha.liquid` | El panel de producto. Arranca vacío y el JS lo completa. |
| `assets/pq-sala.js` | Zonas, ficha, stock y carrito. Sin librerías, 11,5 KB sin minificar (el límite era 15 KB). |
| `assets/pq-sala.css` | Estilos. Es el mismo archivo que usa el prototipo. |
| `templates/metaobject/sala.json` | La plantilla que le da a cada sala su propia página. |

El prototipo (`prototipo/index.html`) ahora usa directamente `tema/assets/pq-sala.js` y `.css`. Hay una sola copia de cada archivo, así que no se desincronizan.

## Tema elegido: Horizon 4.2

Horizon es el tema gratuito actual de Shopify. Probé contra su código publicado (versión 4.2.0, septiembre de 2026).

**Cómo se conecta con su carrito.** Horizon no recarga secciones sueltas. Espera un aviso estándar de Shopify llamado "se actualizaron las líneas del carrito". Cuando agregás algo desde la sala:

1. Se llama a `cart/add.js` y en la misma llamada se pide el HTML nuevo del carrito lateral.
2. Se le manda a Horizon el mismo aviso que manda su propio botón de compra. Así Horizon actualiza el contador y el carrito lateral sin recargar la página.
3. Si el carrito lateral está configurado para abrirse solo, se abre **cuando cerrás la ficha**. Es lo mismo que hace Horizon con su "compra rápida".

**Si algún día cambiás de tema**, el JS se adapta solo:

- Con **Dawn**, usa el carrito lateral o el aviso de Dawn.
- Con **otro tema**, reemplaza las secciones cuyos IDs pongas en `data-secciones-carrito`.

## Qué se configura en el editor de temas

La sección se llama **"Sala p*q"** y tiene 4 opciones:

- **Sala:** solo se usa si ponés la sección en otra página, por ejemplo en la portada. En la página propia de cada sala se usa esa sala automáticamente.
- **Mostrar puntos sobre las piezas** (sí o no).
- **Piezas vendidas:** ocultar la pieza y su sombra, o dejarla con un punto rojo.
- **Texto de ayuda.**

## Decisiones que conviene saber

- **El orden de apilado lo manda el campo "Orden"**, no el orden en que cargues las piezas en el admin. Liquid no sabe ordenar por un campo, así que la sección arma una lista de textos del tipo "orden + posición" y los ordena. Lo probé cargando las piezas mezcladas y salen bien.
- **Cada pieza se identifica por su "handle"** en el admin, por ejemplo `sofa`. Aparece en el HTML como `data-pieza="sofa"`.
- **Imágenes:** Shopify genera los tamaños de 800, 1280 y 1600 px con el filtro `image_url`, y nunca agranda una imagen. Como las capas miden 1280, conviene subir el WebP de 1280 que genera el script de preparación. Pesa mucho menos que el PNG original y se ve igual.
- **Accesibilidad:** cada zona se lee como "Sofá, $ 1.350.000,00, disponible". El nombre sale del campo "Etiqueta accesible".
- **Precio:** usa el formato de moneda de la tienda (filtro `money`).

## Qué medí

| Prueba | Resultado |
|---|---|
| `shopify theme check` con Horizon 4.2 + los archivos de la sala | ✅ **0 errores.** Hay 6 avisos, todos de archivos propios de Horizon (`header.liquid` y `divider.liquid`). Ninguno es de los archivos `pq-`. |
| Theme check valida de verdad los *settings* | ✅ Le puse a propósito un tipo inválido y lo detectó. |
| Liquid renderizado con la sala de ejemplo (`npm run probar:seccion`) y probado en Chromium con la misma prueba del prototipo | ✅ **Todo OK:** 6 piezas, piezas superpuestas, vendido (los dos modos), stock al abrir, carrito, 422, teclado, lector de pantalla, celular centrado. |
| Peso en celular (pantalla 3x) | ✅ 114 KB (límite: 1,5 MB) |
| Carrito de Horizon | ✅ Con un simulador del aviso de Shopify: se manda desde la ficha, con el total del carrito y el HTML del carrito lateral. |

## Qué NO pude probar, y por qué

**El entorno donde trabajo no se puede conectar a tu tienda.** La red de este entorno bloquea `pxq-pruebas.myshopify.com` y también `cdn.shopify.com`. Por eso no corrí `shopify theme dev`.

Además, las variables de entorno tienen dos errores de tipeo. Las corregí por mi cuenta en cada comando, pero conviene arreglarlas:

- La variable de la tienda se llama `HOPIFY_FLAG_STORE`. Le falta la **S** del principio: tiene que ser `SHOPIFY_FLAG_STORE`. Además, el valor termina con un punto de más.
- `SHOPIFY_CLI_THEME_TOKEN` tiene texto antes de la contraseña. Tiene que contener **solo** el valor que empieza con `shptka_`.

`liquidjs` imita Liquid, pero no es Shopify. Estas cosas se confirman recién en la tienda:

1. Que `image_url` acepte directamente los archivos de los metaobjetos. Así lo dice la documentación de Shopify.
2. Que la lista de piezas se pueda leer por posición (`piezas[i]`).
3. Que `metaobject.url` dé la dirección `/pages/salas/<nombre>`.
4. El aviso real de carrito de Horizon, que se carga desde `cdn.shopify.com`.
5. Las consultas de `scripts/metaobjetos.graphql`.

**Prueba concreta, cuando la tienda esté accesible:**

```bash
shopify theme pull --theme <id de una copia NO publicada de Horizon> --path ../tema-pxq
node scripts/instalar-en-tema.mjs ../tema-pxq
cd ../tema-pxq && shopify theme check && shopify theme dev
```

Después, en la tienda:

1. Crear las definiciones.
2. Cargar la sala de ejemplo con 6 productos de prueba.
3. Abrir `/pages/salas/sala-ejemplo` y repetir los puntos de la tabla.
4. Medir LCP e INP con PageSpeed Insights.

`shopify theme dev` crea un tema de desarrollo oculto. Nunca toca el tema publicado.

## Comandos

```bash
npm install
npm run probar:seccion                         # renderiza la sección y escribe prototipo/seccion.html
python3 -m http.server 8765                    # desde la raíz del repo
node scripts/probar-prototipo.mjs http://localhost:8765/prototipo/seccion.html
node scripts/instalar-en-tema.mjs <carpeta-del-tema>
```
