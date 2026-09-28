# Prompt para Claude Code: salas por capas de p*q en Shopify

> Copiá todo lo que está debajo de la línea y pegalo en Claude Code, abierto en la carpeta del tema de Shopify (o en una carpeta vacía si todavía no hay tema). Junto con este archivo va la carpeta `capas-ejemplo/` con una sala de prueba ya separada en capas.

---

## Contexto

Estoy construyendo la tienda online de **p*q**, una galería y tienda chica de arte, muebles y objetos contemporáneos, en **Shopify**. Quiero que la web tenga **salas ilustradas que se recorren**: la persona ve una habitación dibujada, toca un mueble u obra y se abre su ficha con precio, disponibilidad y botón para agregar al carrito. La referencia conceptual es drakerelated.com. No hay que copiar su estética, solo la lógica.

Ya se decidió **cómo se arma cada sala**. No lo cambies sin consultarme:

- Cada sala es una **pila de imágenes 2D**, no 3D. No uses Three.js, WebGL, CSS 3D ni React.
- Las capas son:
  - `00_fondo`: la sala vacía y completa, sin transparencia.
  - `10_sombra_<pieza>`: una sombra por pieza, transparente.
  - `20_objeto_<pieza>`: un mueble u obra por capa, transparente.
- **Todas las capas tienen exactamente el mismo tamaño** (el lienzo completo de la sala) y ya vienen dibujadas en su lugar. **Nunca se posiciona una pieza con código.** Se apilan con `position:absolute; inset:0; width:100%; height:100%`.
- El orden de apilado va de atrás hacia adelante: fondo, sombras y después objetos, según el orden que indique cada sala.
- Cuando una pieza se vende, se ocultan su capa y su sombra. Como el fondo está completo, no queda un hueco.

En `capas-ejemplo/` hay una sala de 1280 × 800 con 6 piezas (sofa, sillon, mesa, aparador, lampara, obra) y 4 sombras. Usala para desarrollar y probar.

## Cómo quiero trabajar

- **Antes de programar**, revisá la carpeta y decime qué encontraste: si ya hay un tema, cuál es (Horizon, Dawn u otro), su versión y cómo está hecho el carrito. Después proponeme un plan corto por etapas y esperá mi OK.
- Explicame las decisiones en lenguaje simple. Yo no sé Shopify y estoy aprendiendo.
- Si algo no lo podés verificar, decilo y proponé una prueba concreta. No asumas.
- No toques el checkout ni los pagos. La tienda es de Argentina y **Shopify Payments no funciona en Argentina**, así que se va a usar un proveedor externo como Mercado Pago. Eso se configura desde el admin y no es parte de este trabajo.
- Trabajá siempre sobre una **copia no publicada del tema**. Nunca publiques ni hagas `theme push` al tema en vivo sin preguntarme.

## Arquitectura pedida

### 1. Sección propia dentro del tema (Online Store 2.0)

- `sections/pq-sala.liquid`: arma la sala a partir de los datos de un metaobjeto.
- `snippets/pq-ficha.liquid`: el panel de producto.
- `assets/pq-sala.js`: JavaScript sin frameworks, que no pase de 15 KB sin minificar.
- `assets/pq-sala.css`
- `templates/metaobject/sala.json`: plantilla para que **cada sala tenga su propia URL**, usando la función de metaobjetos publicados como páginas web.
- La sección tiene que poder agregarse desde el editor de temas y tener *settings* simples: mostrar puntos (sí/no), qué hacer con lo vendido (ocultar o punto rojo) y el texto de ayuda.

### 2. Datos en metaobjetos, editables desde el admin sin tocar código

Proponé las definiciones exactas y un script o instrucciones paso a paso para crearlas. La idea es esta:

- **Sala** (`sala`): título, `fondo` (imagen), `ancho` y `alto` del lienzo, `piezas` (lista de referencias a "Pieza en sala"), `salas_vecinas` (lista de referencias a otras salas, para las puertas) y descripción para SEO. Tiene que tener activado "publicar como páginas web".
- **Pieza en sala** (`pieza_en_sala`): `producto` (referencia a producto), `capa` (imagen), `sombra` (imagen, opcional), `orden` (entero), `zona` (JSON con el contorno clickeable) y `etiqueta` accesible.

### 3. Zona clickeable calculada antes de subir (importante)

En el prototipo, el mueble tocado se detectaba leyendo los píxeles transparentes de cada imagen con `canvas.getImageData`. **En Shopify no hagas eso**: las imágenes se sirven desde `cdn.shopify.com`, que es otro dominio, y el navegador puede bloquear esa lectura. No pude verificar qué cabeceras manda ese CDN.

Hacé un **script de preparación en Node** (`scripts/preparar-sala.mjs`, usando `sharp`) que, para cada capa:

1. Convierta el PNG a WebP en dos anchos, 1600 px y 800 px.
2. Calcule el contorno de la parte no transparente, lo simplifique a unos 40 puntos como máximo y lo guarde en porcentajes del lienzo.
3. Calcule la posición del punto indicador: centro horizontal, justo arriba de la pieza.
4. Genere un `sala.json` con todo eso, listo para cargar en los metaobjetos.

En la web, cada zona es un `<polygon>` dentro de un `<svg>` con el mismo `viewBox` que el lienzo. Cada polígono es un botón accesible: `role="button"`, `tabindex="0"`, `aria-label` con nombre, precio y estado, y se activa con Enter o Espacio. Al pasar el mouse se resalta la capa, por ejemplo con `filter: drop-shadow`.

### 4. Ficha y carrito

- Al tocar una pieza se abre un panel: lateral en escritorio y hoja desde abajo en celular. Muestra imagen del producto, nombre, precio con el formato de moneda de la tienda, disponibilidad y los botones "Agregar al carrito" y "Comprar ahora".
- Los datos del producto salen de Liquid al renderizar la sección. Al abrir el panel, confirmá el stock actual con `GET {{ routes.root_url }}products/<handle>.js`.
- Para agregar al carrito usá la **Cart Ajax API**: `POST window.Shopify.routes.root + 'cart/add.js'` con `{ items: [{ id: variantId, quantity: 1 }] }`. Si el tema ya tiene un carrito lateral, actualizalo con el parámetro `sections` (renderizado de secciones incluido en la misma llamada) en lugar de recargar la página. Si responde 422 (sin stock), mostrá el mensaje dentro del panel.
- "Comprar ahora" agrega el producto y lleva a `/checkout`.
- Si el producto no está disponible, ocultá su capa y su sombra o mostrá un punto rojo, según el *setting*.

### 5. Celular, carga y accesibilidad

- En celular la sala ocupa el ancho de la pantalla con un mínimo de 820 px y se desplaza horizontalmente. Al entrar, se centra.
- Debajo de la sala va siempre una **lista de piezas** en HTML común (nombre, precio, estado y enlace), para quien quiere comprar rápido, para lectores de pantalla y para los buscadores.
- Carga: el fondo primero y con `srcset` (se generan los tamaños con el filtro `image_url` de Shopify). Las capas de objetos van después. Poné `width` y `height` en todas las imágenes para que no salten al cargar.
- Si el usuario pidió reducir movimiento en su sistema, no uses animaciones.
- Las puertas a otras salas son enlaces normales a la URL de la sala vecina.

### 6. Prototipo local primero

Antes de tocar Shopify, armá `prototipo/index.html` con las capas de `capas-ejemplo/` y el `sala.json` generado por el script, con datos de producto falsos. Tiene que funcionar abriéndolo en el navegador. Ahí validamos la experiencia antes de pasarla al tema.

## Etapas

1. **Revisión y plan.** Mirá la carpeta, proponé las definiciones de metaobjetos y esperá mi OK.
2. **Script de preparación** probado con `capas-ejemplo/`.
3. **Prototipo local** funcionando.
4. **Sección, snippet, assets y plantilla en el tema.** Probá con `shopify theme dev` sobre una tienda de desarrollo, que es gratuita con una cuenta de Shopify Partners. Pasá `shopify theme check` sin errores.
5. **Instrucciones para cargar una sala desde el admin**, paso a paso, en español y en lenguaje simple.
6. **Opcional, preguntame antes:** un script que suba las imágenes y cree los metaobjetos con la Admin API. Necesita una app personalizada con permisos de archivos y metaobjetos.

## Criterios para dar el trabajo por terminado

Medí y reportá cada uno:

- La sala de ejemplo funciona en Chrome, Safari y en un Android de gama media real, o emulado con 4G lenta en Chrome DevTools.
- **LCP ≤ 2,5 s** en celular con 4G, medido con Lighthouse o PageSpeed Insights.
- **Peso total de la sala ≤ 1,5 MB** en celular.
- **INP ≤ 200 ms** al tocar una pieza.
- Tocar cada pieza abre la ficha correcta. Probalo con las 6 piezas, incluidas las que se superponen: el sofá detrás de la mesa y la lámpara arriba del aparador.
- Agregar al carrito funciona y el contador del tema se actualiza sin recargar.
- Un producto sin stock se oculta junto con su sombra, o muestra punto rojo, según el *setting*.
- Todo se puede usar con teclado y el lector de pantalla lee el nombre y el precio de cada pieza.
- `shopify theme check` sin errores.
- Existe una guía para cargar una sala nueva sin programar.

## Qué no hacer

- No uses 3D, React, Three.js ni librerías de animación.
- No posiciones piezas con coordenadas. Todas las capas tienen el tamaño completo del lienzo.
- No leas píxeles de imágenes del CDN en el navegador.
- No modifiques el checkout, los pagos ni temas publicados.
- No inventes datos de productos reales. Para probar usá productos de prueba.
