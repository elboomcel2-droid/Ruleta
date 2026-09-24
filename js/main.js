/* ==========================================================
   Arranque de la app
   ========================================================== */
(async function init(){
  const saved = await DB.get("config");
  if(validCfg(saved)) cfg = saved;
  const s = await DB.get("session");
  if(s && s.left > 0) session = s;
  buildWheel(); render();
})();
$("spinBtn").onclick = spin;
if("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(()=>{}));

// Cuando termina de cargar la fuente se vuelve a acomodar el texto de la ruleta
if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if(!spinning) buildWheel(); });
