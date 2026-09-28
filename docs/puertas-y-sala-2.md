# Puertas entre salas y Sala 2

Qué se agregó, cómo cargarlo en la tienda, qué pedirle a la ilustradora y cómo correr todo en VS Code.

## Qué hay nuevo

- **Puertas:** cada sala puede tener puertas. Una puerta es un enlace de verdad a otra sala, con una etiqueta visible sobre la puerta (por ejemplo "Sala 2 · Objetos →").
- **Transición al cruzar:** dura alrededor de 1,5 segundos.
  1. La vista se acerca a la puerta. Los muebles se agrandan más rápido que las paredes, y eso da sensación de profundidad.
  2. La puerta se abre, si tiene capas de puerta.
  3. Todo se funde a un color claro.
  4. Aparece la sala siguiente, que entra desde el lado de su puerta.
- **La página no se recarga.** El carrito y todo lo demás siguen como estaban.
- Se saltea con un clic, un toque o Esc.
- Si la computadora o el teléfono tiene activado "reducir movimiento", solo hay un fundido.
- El botón Atrás del navegador hace la transición al revés.
- **Sala 2 provisoria:** son las capas de la Sala 1 espejadas, con las paredes más cálidas y 3 piezas. Es **provisoria** hasta que lleguen las ilustraciones reales.

## Cargar la Sala 2 y las puertas en la tienda

Necesitás dos archivos que te pasé por el chat:

- `imagenes-sala-2-y-puertas.zip`: 11 imágenes.
- `tema-horizon-con-salas-v3.zip`: el tema.

### Paso 1. Definición "Puerta"

*Settings → Custom data → Metaobject definitions → Add definition*

- **Name:** `Puerta`. El Type tiene que quedar `puerta_sala`.

| Field label | One/List | Tipo | Key | Obligatorio |
|---|---|---|---|---|
| Etiqueta | One | Single line text | `etiqueta` | sí |
| Destino | One | Metaobject → **Sala** | `destino` | sí |
| Zona | One | JSON | `zona` | sí |
| Capa cerrada | One | File (Media files only) | `capa_cerrada` | no |
| Capa abierta | One | File (Media files only) | `capa_abierta` | no |

- **Opciones:**
  - *Storefronts API access*: **activado**.
  - *Publish entries as web pages*: **apagado**.
- **Save.**

### Paso 2. Campo "Puertas" en "Sala"

Entrá a la definición **Sala** y agregá:

- **Puertas:** **List**, Metaobject → **Puerta**, Key `puertas`, no obligatorio.
- **Save.**

### Paso 3. Imágenes

Descomprimí `imagenes-sala-2-y-puertas.zip` y subí las 11 imágenes en *Content → Files*. Los nombres empiezan con `sala1-` o `sala2-`.

### Paso 4. Tres productos de prueba nuevos

Igual que antes, con stock 1 en una sola ubicación:

| Title | Price |
|---|---|
| Sofá 2 (prueba) | 900000 |
| Sillón 2 (prueba) | 300000 |
| Mesa baja (prueba) | 200000 |

### Paso 5. Las 3 piezas de la Sala 2

*Content → Metaobjects → Pieza en sala → Add entry*. Una por pieza, con **Active** y **Save** al terminar cada una.

### Sofá (provisorio)

| Campo | Qué poner |
|---|---|
| Producto | Sofá 2 (prueba) |
| Capa | `sala2-objeto_sofa2` |
| Sombra | `sala2-sombra_sofa2` |
| Orden | `10` |
| Etiqueta accesible | `Sofá` |

Zona:

```json
{"puntos":[[45.94,67.25],[49.3,67.25],[55.31,68],[59.69,69],[62.97,70.25],[63.83,70.88],[64.22,72.25],[65,72.5],[65.39,73],[65.39,77.88],[65.16,78.25],[64.38,78.63],[64.38,79.63],[63.05,79.75],[63.05,81.75],[61.95,81.75],[61.48,80.38],[60.47,80.38],[60.31,78.63],[58.36,78.37],[57.27,77.75],[56.88,78],[56.8,80.38],[55.63,80.38],[55.63,78.87],[55.39,78.75],[55.31,77.5],[51.56,77.75],[51.48,79.88],[50.23,79.88],[50.16,77.88],[47.81,78.13],[46.88,81],[45.7,81],[45.7,79.25],[46.02,78.13],[45.78,78],[45.31,77.13],[44.84,71],[44.84,67.75]],"punto":[55.16,65.5]}
```

### Sillón (provisorio)

| Campo | Qué poner |
|---|---|
| Producto | Sillón 2 (prueba) |
| Capa | `sala2-objeto_sillon2` |
| Sombra | `sala2-sombra_sillon2` |
| Orden | `20` |
| Etiqueta accesible | `Sillón` |

Zona:

```json
{"puntos":[[30,70.5],[31.48,70.5],[31.8,70.88],[31.88,74.5],[31.72,75.88],[32.89,75.88],[33.91,76.25],[33.98,79],[33.2,79.75],[33.44,81.75],[33.44,84.13],[32.19,84.13],[31.56,80.75],[30.78,81],[30.7,83.13],[29.61,83.13],[29.38,81.25],[27.11,81.75],[26.88,82],[26.8,82.5],[26.48,86.25],[25.23,86.25],[25.23,84.5],[24.61,84.38],[24.61,81.25],[23.75,80.38],[23.75,77.88],[24.06,77.25],[24.45,77.13],[24.06,76.88],[23.83,75.88],[23.67,74.63],[23.67,71.88],[24.3,71.38],[28.75,70.88]],"punto":[28.83,68.75]}
```

### Mesa baja (provisoria)

| Campo | Qué poner |
|---|---|
| Producto | Mesa baja (prueba) |
| Capa | `sala2-objeto_mesa2` |
| Sombra | `sala2-sombra_mesa2` |
| Orden | `30` |
| Etiqueta accesible | `Mesa baja` |

Zona:

```json
{"puntos":[[50,76.75],[62.81,76.75],[62.97,76.88],[64.3,79.13],[64.3,81.63],[63.67,81.63],[63.59,81.75],[63.59,88],[62.03,88],[61.95,87.75],[61.95,85.63],[61.88,85.5],[61.02,85.5],[60.94,85.38],[60.94,81.75],[60.86,81.63],[52.27,81.63],[52.19,81.75],[52.19,82.75],[52.11,82.88],[52.11,83.25],[52.19,83.38],[52.19,87.25],[52.11,87.38],[52.11,88],[50.63,88],[50.63,85.63],[50.55,85.5],[50.55,81.75],[50.47,81.63],[50.08,81.63],[50,81.38]],"punto":[61.88,79.25]}
```

### Paso 6. La Sala 2

*Content → Metaobjects → Sala → Add entry*

| Campo | Qué poner |
|---|---|
| Titulo | `Sala 2 · Objetos` |
| Fondo | `sala2-fondo` |
| Ancho | `1280` |
| Alto | `800` |
| Piezas | las 3 piezas del paso 5 |

- **Status:** Active.
- **Handle:** `sala-2`.
- **Save.** Todavía no le pongas puertas.

### Paso 7. Las dos puertas

*Content → Metaobjects → Puerta → Add entry*

**Puerta de ida (va en la Sala 1):**

| Campo | Qué poner |
|---|---|
| Etiqueta | `Sala 2 · Objetos` |
| Destino | Sala 2 · Objetos |
| Capa cerrada | `sala1-puerta_cerrada` |
| Capa abierta | `sala1-puerta_abierta` |

Zona:

```json
{"puntos":[[78.98,44.75],[84.69,42.75],[84.69,78.63],[78.98,78.63]],"punto":[81.84,39.25],"zoom":[81.84,60.69]}
```

**Puerta de regreso (va en la Sala 2):**

| Campo | Qué poner |
|---|---|
| Etiqueta | `Sala de ejemplo` |
| Destino | Sala de ejemplo |
| Capa cerrada | `sala2-puerta_cerrada` |
| Capa abierta | `sala2-puerta_abierta` |

Zona:

```json
{"puntos":[[15.23,42.75],[20.94,44.75],[20.94,78.63],[15.23,78.63]],"punto":[18.09,39.25],"zoom":[18.09,60.69]}
```

### Paso 8. Conectar las puertas con las salas

- Abrí **Sala de ejemplo** y, en **Puertas**, elegí la puerta **Sala 2 · Objetos**. **Save.**
- Abrí **Sala 2 · Objetos** y, en **Puertas**, elegí la puerta **Sala de ejemplo**. **Save.**

### Paso 9. Tema v3 y prueba

1. *Online Store → Draft themes → Import → Upload zip file* → `tema-horizon-con-salas-v3.zip`. **No lo publiques.**
2. En el tema nuevo, *⋯ → Preview*, y andá a `/pages/salas/sala-de-ejemplo`.
3. Probá:
   - tocar la etiqueta o la puerta;
   - volver con la puerta de la Sala 2;
   - volver con el botón Atrás del navegador;
   - agregar algo al carrito antes de cruzar y ver que el contador sigue igual;
   - recargar la página estando en la Sala 2: tiene que abrir la Sala 2.

Si la puerta te lleva a la otra sala **recargando la página** (se nota un parpadeo blanco y no hay animación), la transición no pudo traer la sala sin recargar. Mandame captura: es lo único que no pude verificar sin tu tienda.

## Qué pedirle a la ilustradora para cada puerta

1. **La puerta dibujada en dos capas:** una cerrada y otra abierta. Las dos del **tamaño completo del lienzo** (el mismo que el fondo, por ejemplo 1280 × 800) y con fondo transparente fuera de la puerta. Se nombran `30_puerta_<nombre>_cerrada.png` y `30_puerta_<nombre>_abierta.png`.
2. **Qué se ve a través de la puerta abierta:** un pedacito de la sala siguiente, con los mismos colores y la misma luz. Si no se puede, algo neutro y claro (una pared lisa clara), nunca negro.
3. **La sala siguiente dibujada con la misma grilla de perspectiva y la misma altura de ojo**, con la **puerta de regreso visible** en la pared por la que se entra. Por ejemplo, si a la Sala 2 se entra desde la Sala 1 por una puerta a la derecha, en la Sala 2 la puerta de regreso va en la pared izquierda.
4. **Opcional:** capas "de frente" (algo muy cerca de la cámara, como una planta o el borde de un mueble), que en la transición se agrandan más que el resto.

## Cuando lleguen las ilustraciones reales de la Sala 2

1. Reemplazá los PNG de `capas-sala-2/` por los reales, con los mismos nombres de siempre: `00_fondo.png`, `10_sombra_<pieza>.png`, `20_objeto_<pieza>.png` y `30_puerta_<nombre>_cerrada/abierta.png`.
2. En `capas-sala-2/sala.config.json`, ajustá el orden, las etiquetas y la puerta. Si hay capa cerrada, podés borrar los `puntos` de la puerta: el script calcula la zona solo.
3. Corré `npm run preparar:sala2`. **No hace falta tocar código** ni volver a correr `generar-sala-2-provisoria.mjs`.
4. En la tienda, reemplazá las imágenes y los valores de las piezas y la puerta.

## Cómo correrlo en VS Code

### La primera vez

1. Instalá **VS Code** (code.visualstudio.com) y **Node.js LTS** (nodejs.org). En Mac, si al usar Git te pide instalar las "herramientas de línea de comandos", aceptá.
2. Abrí VS Code → **Cmd + Shift + P** (en Windows, Ctrl + Shift + P) → escribí `Git: Clone` → pegá `https://github.com/mariaais444/pxq.git` → elegí una carpeta → **Open**.
3. Abajo a la izquierda aparece el nombre de la rama (por ejemplo `main`). Tocalo y elegí **origin/claude/optimistic-turing-hngetp**.
4. Abrí la terminal: menú **Terminal → New Terminal**.
5. Instalá lo que usa el proyecto:

   ```bash
   npm install
   ```

### Ver las salas en tu navegador

```bash
npm run probar:seccion   # arma las páginas de prueba de las salas
npm run servidor         # prende un servidor local
```

Abrí **http://localhost:8765/prototipo/salas/sala-ejemplo.html**. Son las dos salas con la puerta, productos de prueba y carrito simulado. Para cortar el servidor, apretá **Ctrl + C** en la terminal.

Si cambiás algo del tema (`tema/…`) o de las capas, volvé a correr `npm run probar:seccion` y recargá el navegador.

### Otras tareas

| Qué | Comando |
|---|---|
| Rehacer la Sala 2 provisoria | `npm run sala2:provisoria` |
| Preparar la Sala 2 con capas reales | `npm run preparar:sala2` |
| Pruebas automáticas (con el servidor prendido, en otra terminal). La primera vez: `npx playwright install chromium` | `npm run probar:puertas` |
| Probar contra tu tienda de desarrollo (opcional; necesita Shopify CLI: `npm install -g @shopify/cli`) | `shopify theme dev --store pxq-pruebas.myshopify.com` |

## Qué medí (Chromium, en mi entorno)

| Criterio | Resultado |
|---|---|
| Transición fluida con la CPU 4× más lenta | ✅ Sin tareas largas en la página. Hay 2–3 cuadros de más de 50 ms, por dibujar sin placa de video (ver abajo). |
| Precargada, el clic arranca la transición | ✅ En 10–15 ms (pedido: < 100 ms) |
| Duración | ✅ ~1,6 s |
| Ida y vuelta con clic, teclado (Tab + Enter) y Atrás / Adelante | ✅ |
| El carrito se conserva sin recargar | ✅ 1 → cruzar → 1 → agregar → 2 → ida y vuelta → 2 |
| Reducir movimiento | ✅ Solo fundido, ~250 ms, sin zoom |
| Sin JavaScript o si falla la carga | ✅ La puerta navega como enlace normal |
| La URL cambia y al recargar abre la sala correcta | ✅ |
| Foco y aviso para lectores de pantalla | ✅ El foco pasa al título y se anuncia la sala |
| Esc saltea | ✅ Termina en ~130 ms |
| `shopify theme check` | ✅ 0 errores |

**Sin verificar, y por qué:**

- **En tu tienda.** Este entorno no puede conectarse a Shopify. Lo que falta confirmar es que Shopify devuelva la sala de destino con `?section_id=` en la página de un metaobjeto. Si no, la puerta igual funciona, pero recargando la página. Prueba: el paso 9 de arriba.
- **Android real.** Solo pude simularlo en Chromium, y sin placa de video: el dibujado es por software, más lento que en un teléfono. Los cuadros lentos que medí vienen de ahí, no del código de la página. Prueba: abrir la vista previa en un Android de gama media y cruzar la puerta 3 o 4 veces.
- **Sin precarga** (clic apenas abre la página): anda igual, pero hay una tarea de ~80 ms al armar la sala nueva. En la práctica, casi siempre hay precarga: se hace al pasar el mouse por la puerta, al llegar con Tab o tras 3 segundos sin actividad.

**Para ajustar el efecto:** al principio de `tema/assets/pq-sala-puertas.js` están los tiempos y los aumentos. Por ejemplo, `ESCALA_FONDO = 2.2` y `ESCALA_OBJETOS = 2.6`. Con valores más altos se siente más que se "entra" por la puerta.
