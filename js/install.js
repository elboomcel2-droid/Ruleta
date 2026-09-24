/* ==========================================================
   Instalación de la app (PWA)
   ========================================================== */
let installPrompt = null;
const isInstalled = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; updateInstallUI(); });
addEventListener("appinstalled", () => { installPrompt = null; updateInstallUI(); });
function updateInstallUI(){
  $("installBtn").hidden = isInstalled() || !installPrompt;
  $("cfgInstall").hidden = isInstalled();
}
async function doInstall(){
  if(installPrompt){ installPrompt.prompt(); await installPrompt.userChoice.catch(()=>{}); installPrompt = null; updateInstallUI(); return; }
  const ua = navigator.userAgent, ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1), android = /Android/.test(ua);
  $("installSteps").innerHTML = isInstalled() ? `<p>La app ya está instalada en este dispositivo.</p>` :
    ios ? `<ol class="steps"><li>Abre esta página en <b>Safari</b>.</li><li>Toca el botón <b>Compartir</b> (cuadro con flecha).</li><li>Elige <b>Agregar a inicio</b> y toca <b>Agregar</b>.</li></ol>` :
    android ? `<ol class="steps"><li>Abre esta página en <b>Chrome</b>.</li><li>Toca el menú <b>⋮</b> arriba a la derecha.</li><li>Elige <b>Instalar app</b> o <b>Agregar a pantalla principal</b>.</li></ol>` :
    `<ol class="steps"><li>Abre esta página en <b>Chrome</b> o <b>Edge</b>.</li><li>Haz clic en el ícono de <b>instalar</b> al final de la barra de direcciones.</li><li>Confirma con <b>Instalar</b>.</li></ol>`;
  $("installSteps").insertAdjacentHTML("beforeend", isInstalled() ? "" : `<p>La app debe estar publicada en una dirección <b style="color:var(--text)">https</b> (por ejemplo GitHub Pages) para poder instalarse.</p>`);
  closeModals(); openModal("installModal");
}
$("installBtn").onclick = doInstall;
$("cfgInstall").onclick = doInstall;
updateInstallUI();
