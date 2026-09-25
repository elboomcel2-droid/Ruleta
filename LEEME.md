# Ruleta El Boom · Gira y Gana

## Estructura
```
index.html          Estructura de la pantalla (textos, formularios, ventanas)
css/styles.css      Diseño: colores (en :root), tamaños y versiones celular/tablet/laptop
js/config.js        ← LO MÁS EDITADO: premios por defecto, reglas de giros, palabras prohibidas
js/control.js       Control de 1 participación cada X horas por teléfono y tickets ya usados
js/scanner.js       Lectura del QR del ticket (función parseTicketQR)
js/vendor/jsQR.js   Lector de QR para navegadores sin lector propio
js/wheel.js         Dibujo de la ruleta, acomodo automático del texto (objeto TXT) y flecha
js/game.js          Flujo: teléfono + monto, giros, resultados, ventanas
js/admin.js         Panel de configuración (5 toques en el ícono i)
js/history.js       Mini historial (HIST_MAX = 10)
js/db.js            Base de datos del dispositivo (IndexedDB)
js/sound.js         Sonidos
js/confetti.js      Confeti
js/install.js       Botón e instrucciones para instalar
js/main.js          Arranque
js/utils.js         Funciones de apoyo
img/logo.jpg        Logo del encabezado (reemplázalo con el mismo nombre)
icons/              Íconos de la app instalada
manifest.json       Nombre e íconos de la app instalada
sw.js               Uso sin internet (sube la versión CACHE al cambiar archivos)
```

## Cambios comunes
- Premios iniciales: `js/config.js` → `DEFAULT_CFG.prizes`. (Si la app ya guardó premios, usa "Restaurar premios originales" en la configuración.)
- Reglas iniciales: `js/config.js` → `perSpin` (compra por giro), `maxSpins`, `cooldownHours`, `requireQR`.
- Formato del QR del ticket: `js/scanner.js` → `parseTicketQR`. Hoy lee facturas CFDI (parámetro tt), URLs con total/monto, JSON, texto "TOTAL: 123.45" o solo el número.
- Colores: `css/styles.css` → `:root` (`--gold`, `--bg`, etc.).
- Texto de la ruleta: `js/wheel.js` → `TXT` (tamaño máximo/mínimo, márgenes). Se elige solo entre texto horizontal o radial.
- Textos de pantalla: `index.html`.

## Publicar e instalar
1. Sube TODO (con las carpetas) a un repositorio de GitHub.
2. Settings → Pages → Branch: main / (root).
3. Abre https://TU-USUARIO.github.io/TU-REPO/ y toca "Instalar app".
   - iPhone/iPad: Safari → Compartir → Agregar a inicio.
4. Después de cualquier cambio sube los archivos y cambia `CACHE = "ruleta-elboom-v7"` a v8, v9…

Nota: abrir index.html con doble clic sirve para ver cambios, pero para instalar debe estar en https.

Nota: la cámara solo funciona con la app publicada en https (GitHub Pages sirve). Si no hay cámara, se puede usar una foto del ticket.
