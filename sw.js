/* Service worker: permite instalar la app y usarla sin internet.
   Al cambiar archivos, sube el número de versión para que los dispositivos se actualicen. */
const CACHE = "ruleta-elboom-v8";
const SHELL = [
  "./", "./index.html", "./manifest.json", "./css/styles.css", "./img/logo.jpg",
  "./js/utils.js", "./js/config.js", "./js/db.js", "./js/control.js", "./js/scanner.js", "./js/vendor/jsQR.js", "./js/sound.js", "./js/confetti.js", "./js/wheel.js",
  "./js/history.js", "./js/game.js", "./js/admin.js", "./js/install.js", "./js/main.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable.png", "./icons/apple-touch-icon.png"
];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Red primero (siempre la versión más nueva); si no hay internet, usa la copia guardada.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request)));
});
