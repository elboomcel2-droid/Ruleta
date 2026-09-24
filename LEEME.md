# Ruleta El Boom · Gira y Gana

## Uso
1. El cliente escribe su celular (10 dígitos) y el monto de su compra, y toca "Ver mis giros".
2. Solo ve cuántos giros obtuvo. Gira hasta terminarlos y al final ve el resumen de premios.

## Configuración (toca 5 veces seguidas el ícono (i))
- Premios: agregar/quitar y % de probabilidad (debe sumar 100%). Solo premios físicos.
- Giros por compra: "Desde $X dar N giros" y máximo por compra.
- Historial: últimos 10 registros (fecha, teléfono, tiros, premios). Al llegar a 10 se reemplaza el más antiguo.
  Exporta a CSV antes de que se reemplacen si necesitas conservarlos.
Todo se guarda en el dispositivo mientras se contrata un servidor.

## Publicar (necesario para poder instalar)
1. Crea un repositorio en GitHub y sube TODOS los archivos de esta carpeta (sin subcarpetas).
2. Settings → Pages → Source: "Deploy from a branch" → Branch: main / (root) → Save.
3. En 1–2 minutos queda en: https://TU-USUARIO.github.io/TU-REPO/

## Instalar
- Android (Chrome): abre la liga → botón "Instalar app" arriba, o menú ⋮ → "Instalar app".
- Laptop (Chrome o Edge): ícono de instalar en la barra de direcciones, o botón "Instalar app".
- iPhone/iPad (Safari): Compartir → "Agregar a inicio".
- APK (opcional): pwabuilder.com → pega la liga → Package for stores → Android.
Una vez instalada funciona sin internet.

## Actualizar
Sube los archivos nuevos y cambia el número de versión en sw.js (ruleta-elboom-local-v6 → v7).
