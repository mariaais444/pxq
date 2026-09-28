# Cargar la sala de ejemplo en la tienda, paso a paso

Guía para `pxq-pruebas`. No hace falta programar ni instalar nada. El admin está en inglés, así que los nombres de los botones van en inglés.

Vas a necesitar dos archivos que te pasé por el chat:

- `imagenes-sala-ejemplo.zip`: las 11 imágenes de la sala (fondo, 6 piezas y 4 sombras).
- `tema-horizon-con-salas.zip`: el tema Horizon con la sala ya agregada.

---

## Paso 1. Definición "Pieza en sala"

*Settings → Custom data → Metaobject definitions → Add definition*

- **Name:** `Pieza en sala`. El Type tiene que quedar `pieza_en_sala`.
- **Campos**, todos en **One**. La **Key** aparece al abrir la ⌄ de cada fila:

| Field label | Tipo | Media files only | Key | Obligatorio (\*) |
|---|---|---|---|---|
| Producto | Product | – | `producto` | sí |
| Capa | File | sí | `capa` | sí |
| Sombra | File | sí | `sombra` | **no** |
| Orden | Integer | – | `orden` | sí |
| Zona | JSON | – | `zona` | sí |
| Etiqueta accesible | Single line text | – | `etiqueta` | sí |

- **Opciones:**
  - *Storefronts API access*: **activado**.
  - *Publish entries as web pages*: **apagado**.
- **Save.**

## Paso 2. Definición "Sala"

*Add definition* otra vez.

- **Name:** `Sala`. El Type tiene que quedar `sala`.

| Field label | One/List | Tipo | Key | Obligatorio |
|---|---|---|---|---|
| Título | One | Single line text | `titulo` | sí |
| Fondo | One | File (Media files only) | `fondo` | sí |
| Ancho | One | Integer | `ancho` | sí |
| Alto | One | Integer | `alto` | sí |
| Piezas | **List** | Metaobject → Pieza en sala | `piezas` | sí |
| Descripción SEO | One | Multi-line text | `descripcion_seo` | no |

- **Opciones:**
  - *Storefronts API access*: **activado**.
  - *Publish entries as web pages*: **activado**. Si pide un prefijo de URL, poné `salas`.
- **Save.**
- Volvé a entrar a "Sala" y agregá un campo más: **Salas vecinas**, **List**, tipo Metaobject → Sala, Key `salas_vecinas`, no obligatorio. **Save.**

## Paso 3. Productos de prueba

*Products → Add product*. Creá estos 6 productos:

| Título | Precio |
|---|---|
| Obra (prueba) | 480000 |
| Aparador (prueba) | 620000 |
| Lámpara (prueba) | 95000 |
| Sofá (prueba) | 1350000 |
| Sillón (prueba) | 410000 |
| Mesa ratona (prueba) | 280000 |

En cada uno:

- **Inventory:** cantidad `1`.
- **Imagen:** podés usar la misma capa de la pieza. Es opcional.
- **Status:** *Active*.
- **Publishing:** que esté en *Online Store*.

Para probar el modo "vendido", dejá la Lámpara con cantidad `0`.

## Paso 4. Subir las imágenes

1. Descomprimí `imagenes-sala-ejemplo.zip` (doble clic).
2. En *Content → Files → Upload files*, elegí las 11 imágenes.
3. **No les cambies el nombre.** Así las encontrás en el paso siguiente.

## Paso 5. Cargar las 6 piezas

*Content → Metaobjects → Pieza en sala → Add entry*. Una por pieza.

Para **Capa** y **Sombra**, tocá *Select file* y buscá el archivo por nombre. En **Zona**, pegá el bloque completo, desde la primera `{` hasta la última `}`. Al terminar cada pieza, *Status: Active* y **Save**.

### Obra

| Campo | Qué poner |
|---|---|
| Producto | Obra (prueba) |
| Capa | `objeto_obra-1280.webp` |
| Sombra | dejar vacío |
| Orden | `10` |
| Etiqueta accesible | `Obra` |

Zona (copiá todo el bloque):

```json
{"puntos":[[14.38,40.5],[15.7,40.5],[22.97,43.75],[22.97,62.63],[19.77,63.13],[19.69,63.25],[19.06,63.25],[18.98,63.38],[18.36,63.38],[18.28,63.5],[17.66,63.5],[17.58,63.63],[16.95,63.63],[16.88,63.75],[16.25,63.75],[16.17,63.88],[14.3,63.88],[14.3,40.63]],"punto":[18.67,38.75]}
```

### Aparador

| Campo | Qué poner |
|---|---|
| Producto | Aparador (prueba) |
| Capa | `objeto_aparador-1280.webp` |
| Sombra | `sombra_aparador-1280.webp` |
| Orden | `20` |
| Etiqueta accesible | `Aparador` |

Zona (copiá todo el bloque):

```json
{"puntos":[[55.47,65.25],[68.75,65.25],[68.83,65.38],[69.45,65.63],[69.45,74],[68.98,74],[68.91,74.13],[68.91,75.63],[67.58,75.63],[67.5,75.5],[67.5,75.13],[67.42,75],[66.95,75],[66.95,74.25],[66.8,74],[57.58,74],[57.5,74.13],[57.5,75.5],[57.42,75.63],[56.09,75.63],[56.09,75.13],[55.94,75],[55.94,74.25],[55.78,74],[55.7,74],[55.7,73.88],[55.47,73.38]],"punto":[62.5,63.5]}
```

### Lámpara

| Campo | Qué poner |
|---|---|
| Producto | Lámpara (prueba) |
| Capa | `objeto_lampara-1280.webp` |
| Sombra | dejar vacío |
| Orden | `30` |
| Etiqueta accesible | `Lámpara` |

Zona (copiá todo el bloque):

```json
{"puntos":[[63.83,60.12],[66.72,60.12],[66.8,60.25],[66.95,60.25],[66.95,64.5],[66.64,64.5],[66.56,64.63],[66.56,66],[66.33,66.63],[66.33,67.13],[64.45,67.13],[64.45,66.63],[64.22,66.25],[64.22,66],[64.14,65.87],[64.14,64.63],[64.06,64.5],[63.83,64.5]],"punto":[65.39,58.38]}
```

### Sofá

| Campo | Qué poner |
|---|---|
| Producto | Sofá (prueba) |
| Capa | `objeto_sofa-1280.webp` |
| Sombra | `sombra_sofa-1280.webp` |
| Orden | `40` |
| Etiqueta accesible | `Sofá` |

Zona (copiá todo el bloque):

```json
{"puntos":[[50.63,67.25],[53.98,67.25],[55.08,67.75],[55.08,71],[54.61,77.13],[53.91,78.13],[54.22,79.25],[54.22,81],[53.05,81],[52.11,78.13],[49.77,77.88],[49.69,79.88],[48.44,79.88],[48.36,77.75],[44.61,77.5],[44.53,78.75],[44.3,78.87],[44.3,80.38],[43.13,80.38],[43.05,78],[42.66,77.75],[41.56,78.37],[39.61,78.63],[39.45,80.38],[38.44,80.38],[37.97,81.75],[36.88,81.75],[36.88,79.75],[35.55,79.63],[35.55,78.63],[34.53,77.88],[34.53,73],[34.92,72.5],[35.7,72.25],[35.94,71.13],[36.56,70.5],[41.56,68.63]],"punto":[44.84,65.5]}
```

### Sillón

| Campo | Qué poner |
|---|---|
| Producto | Sillón (prueba) |
| Capa | `objeto_sillon-1280.webp` |
| Sombra | `sombra_sillon-1280.webp` |
| Orden | `50` |
| Etiqueta accesible | `Sillón` |

Zona (copiá todo el bloque):

```json
{"puntos":[[68.44,70.5],[69.92,70.5],[71.17,70.88],[75.63,71.38],[76.25,71.88],[76.25,74.63],[76.09,75.88],[75.86,76.88],[75.47,77.13],[75.86,77.25],[76.17,77.88],[76.17,80.38],[75.31,81.25],[75.31,84.38],[74.69,84.5],[74.69,86.25],[73.44,86.25],[73.13,82.5],[73.05,82],[72.81,81.75],[70.55,81.25],[70.31,83.13],[69.22,83.13],[69.14,81],[68.36,80.75],[67.73,84.13],[66.48,84.13],[66.48,81.75],[66.72,79.75],[65.94,79],[65.94,76.63],[66.02,76.25],[66.33,76],[68.28,75.75],[68.05,74.5],[68.05,71.88],[68.13,70.88]],"punto":[71.09,68.75]}
```

### Mesa ratona

| Campo | Qué poner |
|---|---|
| Producto | Mesa ratona (prueba) |
| Capa | `objeto_mesa-1280.webp` |
| Sombra | `sombra_mesa-1280.webp` |
| Orden | `60` |
| Etiqueta accesible | `Mesa ratona` |

Zona (copiá todo el bloque):

```json
{"puntos":[[37.11,76.75],[49.92,76.75],[49.92,81.38],[49.84,81.63],[49.45,81.63],[49.38,81.75],[49.38,85.5],[49.3,85.63],[49.3,88],[47.81,88],[47.81,87.38],[47.73,87.25],[47.73,83.38],[47.81,83.25],[47.81,82.88],[47.73,82.75],[47.73,81.75],[47.66,81.63],[39.06,81.63],[38.98,81.75],[38.98,85.38],[38.91,85.5],[38.05,85.5],[37.97,85.63],[37.97,87.75],[37.89,88],[36.33,88],[36.33,81.75],[36.25,81.63],[35.63,81.63],[35.63,79.13],[36.56,77.63],[36.56,77.5],[36.95,76.88]],"punto":[48.36,79.25]}
```

## Paso 6. Cargar la sala

*Content → Metaobjects → Sala → Add entry*

| Campo | Qué poner |
|---|---|
| Título | `Sala de ejemplo` |
| Fondo | `fondo-1280.webp` |
| Ancho | `1280` |
| Alto | `800` |
| Piezas | las 6 piezas del paso 5, en cualquier orden |
| Salas vecinas | vacío por ahora |

- **Handle:** `sala-ejemplo`. Suele estar abajo o en *⋯*.
- **Status:** *Active*.
- **Save.**

## Paso 7. Subir el tema con la sala (sin publicarlo)

1. *Online Store → Themes*. Bajá hasta **Theme library**.
2. *Add theme → Upload zip file* y elegí `tema-horizon-con-salas.zip`. Queda en la biblioteca **sin publicar**. **No toques "Publish".**
3. En ese tema, tocá *⋯ → Preview*.
4. En la barra de direcciones de esa vista previa, borrá lo que haya después de `.myshopify.com` y escribí `/pages/salas/sala-ejemplo`. Si Shopify usó otra dirección, la ves en la entrada de la sala, en *Web page*.

Si todo salió bien, vas a ver la sala. Tocá las piezas, abrí la ficha y probá *Agregar al carrito*.

## Si algo no aparece

| Qué pasa | Qué revisar |
|---|---|
| Página en blanco o "página no encontrada" | En la definición "Sala", que *Publish entries as web pages* esté activado y la entrada en *Active*. |
| La sala aparece pero sin piezas | Las Key de "Pieza en sala": tienen que ser exactamente las de la tabla del paso 1. |
| Faltan algunas piezas | Que la pieza tenga producto y que el producto esté publicado en *Online Store*. |
| Una pieza no se puede tocar | Que la Zona se haya pegado completa. |

Mandame captura de lo que veas y lo revisamos juntos.
