/* ==========================================================
   Lectura del QR del ticket para obtener el monto de la compra
   ========================================================== */
let scannedTicket = null;      // { amount, key } del último ticket leído
let manualUnlocked = false;    // true = el personal autorizó escribir el monto a mano (solo para esta compra)
let scanStream = null, scanRAF = 0, scanBusy = false;

/* Interpreta el contenido del QR. Soporta:
   0) Ticket del cajero El Boom: NVAL-00175023446.79
   1) Factura CFDI del SAT: ...?id=UUID&re=..&rr=..&tt=0000000220.230000
   2) URL con parámetros total / monto / importe y folio / id
   3) JSON: {"total":220.23,"folio":"A123"}
   4) Texto con "TOTAL: 220.23"
   5) Solo el número: 220.23
   Si el QR de tus tickets trae otro formato, ajusta esta función. */
// ---------- Formato de los tickets del cajero El Boom ----------
// Ejemplo: NVAL-00175023446.79  →  serie "NVAL", folio "0017502", monto 3446.79
// Tolera lo que cambian algunas pistolas según el idioma del teclado:
// el guion puede llegar como ' / ? _ o no llegar, el punto como coma, y espacios o caracteres extra.
// Si el folio de tus tickets cambia de largo, ajusta FOLIO_DIGITS.
const FOLIO_DIGITS = 7;
const BOOM_TICKET = new RegExp(`([A-Z]{2,8})[^A-Z0-9]?(\\d{${FOLIO_DIGITS}})(\\d{1,8})[^A-Z0-9](\\d{2})(?!\\d)`, "i");
function parseBoomTicket(text){
  const m = String(text).replace(/\s+/g, "").toUpperCase().match(BOOM_TICKET);
  if(!m) return null;
  const amount = parseFloat(`${m[3]}.${m[4]}`);
  const folio = `${m[1]}-${m[2]}`;
  return amount > 0 ? { amount: round2(amount), key: folio, folio } : null;
}

function parseTicketQR(raw){
  const text = String(raw || "").trim();
  const boom = parseBoomTicket(text);          // primero el formato del cajero
  if(boom) return boom;
  let amount = NaN, key = null;
  try{
    const p = new URL(text).searchParams, get = n => p.get(n) || p.get(n.toUpperCase());
    const tt = get("tt") || get("total") || get("monto") || get("importe");
    if(tt) amount = parseFloat(tt.replace(/[^\d.]/g, ""));
    key = get("id") || get("uuid") || get("folio") || get("ticket");
  }catch(e){}
  if(isNaN(amount)){
    try{ const j = JSON.parse(text); amount = parseFloat(j.total ?? j.monto ?? j.importe ?? j.tt); key = key || j.folio || j.id || j.uuid || j.ticket; }catch(e){}
  }
  if(isNaN(amount)){
    const m = text.match(/(?:\btotal\b|\btt\b|\bimporte\b|\bmonto\b)\s*[:=]?\s*\$?\s*([\d,]+(?:\.\d{1,6})?)/i);
    if(m) amount = parseFloat(m[1].replace(/,/g, ""));
  }
  if(isNaN(amount) && /^\$?\s*[\d,]+(\.\d+)?$/.test(text)) amount = parseFloat(text.replace(/[$,\s]/g, ""));
  if(!(amount > 0)) return null;
  if(!key){ const f = text.match(/(?:folio|ticket|venta|id)\s*[:=#]?\s*([A-Za-z0-9-]{3,})/i); key = f ? f[1] : text; }
  return { amount: round2(amount), key: String(key).toUpperCase().slice(0, 120) };
}

function scanMsg(t, bad){ const m = $("scanMsg"); m.textContent = t; m.className = "scan-msg" + (bad ? " bad" : ""); }

// Cámara a usar: "environment" = trasera, "user" = frontal. Se recuerda la última elegida.
let camFacing = "environment";
try{ camFacing = localStorage.getItem("elboom_cam") || "environment"; }catch(e){}

async function openScanner(){
  openModal("scanModal");
  await startCamera();
}
async function startCamera(){
  stopScanner();
  scanMsg("Buscando el código QR…");
  if(!navigator.mediaDevices?.getUserMedia){ scanMsg("Este navegador no permite usar la cámara. Usa una foto del ticket.", true); return; }
  try{
    scanStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:camFacing }, width:{ ideal:1280 } }, audio:false });
    const v = $("scanVideo"); v.srcObject = scanStream; await v.play();
    // La frontal se ve como espejo para que sea fácil acomodar el ticket (la lectura no cambia)
    const real = scanStream.getVideoTracks()[0]?.getSettings?.().facingMode;
    v.classList.toggle("mirror", (real || camFacing) === "user");
    // Solo se muestra el botón de cambiar si el equipo tiene más de una cámara
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput");
    $("camSwitch").hidden = cams.length < 2;
    $("camSwitch").lastChild.textContent = camFacing === "user" ? " Usar cámara trasera" : " Usar cámara frontal";
    loopScan();
  }catch(e){
    scanMsg(location.protocol !== "https:" && location.hostname !== "localhost"
      ? "La cámara solo funciona cuando la app está publicada en https. Usa una foto del ticket."
      : "No se pudo abrir la cámara. Revisa el permiso de cámara o usa una foto del ticket.", true);
  }
}
async function switchCamera(){
  camFacing = camFacing === "user" ? "environment" : "user";
  try{ localStorage.setItem("elboom_cam", camFacing); }catch(e){}
  await startCamera();
}
function stopScanner(){
  cancelAnimationFrame(scanRAF); scanRAF = 0;
  if(scanStream){ scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  const v = $("scanVideo"); if(v) v.srcObject = null;
}

// Lee un cuadro (video o foto). Usa el lector del navegador si existe; si no, jsQR.
let detector = null;
if("BarcodeDetector" in window){ try{ detector = new BarcodeDetector({ formats:["qr_code"] }); }catch(e){ detector = null; } }
const _qc = document.createElement("canvas"), _qx = _qc.getContext("2d", { willReadFrequently:true });
async function decodeFrom(source, w, h){
  if(detector){
    try{ const r = await detector.detect(source); if(r.length) return r[0].rawValue; }catch(e){}
  }
  if(!window.jsQR) return null;
  const scale = Math.min(1, 900 / Math.max(w, h));
  _qc.width = Math.round(w*scale); _qc.height = Math.round(h*scale);
  _qx.drawImage(source, 0, 0, _qc.width, _qc.height);
  const img = _qx.getImageData(0, 0, _qc.width, _qc.height);
  const r = jsQR(img.data, img.width, img.height, { inversionAttempts:"attemptBoth" });
  return r ? r.data : null;
}
function loopScan(){
  const v = $("scanVideo");
  scanRAF = requestAnimationFrame(async () => {
    if(!scanStream) return;
    if(!scanBusy && v.readyState >= 2){
      scanBusy = true;
      const txt = await decodeFrom(v, v.videoWidth, v.videoHeight);
      scanBusy = false;
      if(txt){ await handleQR(txt); if(!scanStream) return; }
    }
    loopScan();
  });
}
async function handleQR(txt){
  const t = parseTicketQR(txt);
  if(!t){ scanMsg("Este QR no trae el monto de la compra. Prueba con otro código del ticket.", true); return; }
  const u = await ticketUsed(t.key);
  if(u){ scanMsg(usedMsg(u), true); return; }
  stopScanner();
  acceptTicket(t);
  closeModals();
}
// Acepta un ticket leído (cámara, foto o pistola): llena y bloquea el monto
function acceptTicket(t){
  scannedTicket = t;
  $("ticketCode").value = t.folio || t.key; $("ticketCode").readOnly = true;
  $("amount").value = t.amount.toFixed(2);
  $("amount").readOnly = true;
  manualUnlocked = false; $("manualOk").hidden = true;
  $("scanOk").firstChild.textContent = t.folio ? `✓ Ticket ${t.folio} leído ` : "✓ Monto leído del ticket ";
  $("scanOk").hidden = false; $("amountErr").textContent = "";
  $("manualBtn").hidden = true;
  beep(1320, .08, .06);
}
// Regresa el monto a su estado normal: bloqueado hasta escanear o autorizar con contraseña
function clearScan(){
  scannedTicket = null; manualUnlocked = false; pendingCode = null;
  $("ticketCode").value = ""; $("ticketCode").readOnly = false; $("amount").value = "";
  $("scanOk").hidden = true; $("manualOk").hidden = true;
  applyQRRule();
}
function applyQRRule(){
  if(!cfg.allowManual) manualUnlocked = false;
  $("amount").readOnly = !manualUnlocked;
  $("amount").placeholder = manualUnlocked ? "0.00" : "Se llena con el ticket";
  $("manualBtn").hidden = !cfg.allowManual || manualUnlocked || !!scannedTicket;
  // Solo escaneo: no se abre el teclado en pantalla al tocar el campo Ticket (la pistola sigue funcionando)
  $("ticketCode").setAttribute("inputmode", cfg.allowManual ? "text" : "none");
  $("ticketCode").placeholder = cfg.allowManual ? "Escanea el ticket" : "Escanea el ticket con la pistola o QR";
}
const ONLY_SCAN_MSG = "Solo se acepta escaneando el ticket con la pistola o con la cámara (botón QR).";

/* ---------- Autorizar monto manual con contraseña ---------- */
let passFails = 0, passLockUntil = 0, pendingCode = null;
const PASS_HINT = "Solo personal autorizado. Escribe la contraseña para capturar el monto sin QR.";
function openPass(hint){
  $("passInput").value = ""; $("passErr").textContent = "";
  $("passHint").textContent = typeof hint === "string" ? hint : PASS_HINT;
  openModal("passModal"); setTimeout(() => $("passInput").focus(), 50);
}
$("manualBtn").onclick = () => { pendingCode = null; openPass(); };
$("amount").addEventListener("click", () => { if($("amount").readOnly && !scannedTicket) $("amountErr").textContent = cfg.allowManual ? "Escanea el ticket. Para escribirlo a mano pide autorización." : ONLY_SCAN_MSG; });
$("passForm").onsubmit = async e => {
  e.preventDefault();
  if(!cfg.allowManual){ closeModals(); return; }
  if(Date.now() < passLockUntil){ $("passErr").textContent = `Demasiados intentos. Espera ${Math.ceil((passLockUntil-Date.now())/1000)} segundos.`; return; }
  if(await checkPass($("passInput").value)){
    passFails = 0; closeModals();
    if(pendingCode){                         // código de ticket escrito a mano: se acepta con autorización
      const t = parseTicketQR(pendingCode); pendingCode = null;
      const u = t && await ticketUsed(t.key);
      if(!t) return; if(u){ $("amountErr").textContent = usedMsg(u); clearScan(); return; }
      t.typed = true; acceptTicket(t); return;
    }
    scannedTicket = null; $("scanOk").hidden = true;
    manualUnlocked = true; $("manualOk").hidden = false; applyQRRule();
    $("amount").value = ""; $("amount").focus(); $("amountErr").textContent = "";
  } else {
    passFails++; $("passInput").value = "";
    if(passFails >= 5){ passFails = 0; passLockUntil = Date.now() + 60e3; $("passErr").textContent = "Contraseña incorrecta. Bloqueado 1 minuto."; }
    else $("passErr").textContent = `Contraseña incorrecta (${passFails} de 5).`;
  }
};
$("manualOk").querySelector("button").onclick = () => { $("amount").value = ""; clearScan(); };

$("scanBtn").onclick = openScanner;
$("camSwitch").onclick = switchCamera;
$("scanOk").querySelector("button").onclick = () => { clearScan(); $("amount").value = ""; };
$("scanFile").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = "";
  if(!f) return;
  scanMsg("Leyendo la foto…");
  try{
    const bmp = await createImageBitmap(f);
    const txt = await decodeFrom(bmp, bmp.width, bmp.height);
    if(txt) await handleQR(txt); else scanMsg("No se encontró un QR en la foto. Toma la foto más cerca y con buena luz.", true);
  }catch(err){ scanMsg("No se pudo leer la foto.", true); }
});

/* ---------- Pistola escáner (lector de código que escribe como teclado) ----------
   La pistola "teclea" el contenido del QR muy rápido (y casi siempre termina con Enter).
   Se mide la velocidad con los cambios del campo, así funciona igual en Android, iPad, Windows o Mac.
   Una persona tecleando es mucho más lenta; eso se trata como captura a mano. */
const GUN_MAX_AVG_MS = 90;          // promedio máximo entre caracteres de una pistola (a mano suele ser > 150 ms)
const tc = $("ticketCode");
let burst = { start:0, last:0, len:0 }, pasted = false, tcTimer = 0;
const typedByGun = b => !pasted && b.len >= 8 && (b.len <= 1 || (b.last - b.start) / Math.max(1, b.len - 1) <= GUN_MAX_AVG_MS);

async function submitTicketCode(b){
  clearTimeout(tcTimer);
  const code = tc.value.trim(), info = b || burst;
  if(!code || tc.readOnly) return;
  const t = parseTicketQR(code);
  if(!t){
    $("amountErr").textContent = `No se reconoce el código del ticket. Se leyó: "${code.slice(0,40)}"`;
    tc.value = ""; burst = { start:0, last:0, len:0 }; return;
  }
  const u = await ticketUsed(t.key);
  if(u){ $("amountErr").textContent = usedMsg(u); tc.value = ""; return; }
  if(!typedByGun(info)){
    if(!cfg.allowManual){ tc.value = ""; $("amountErr").textContent = ONLY_SCAN_MSG; pasted = false; return; }
    pendingCode = code; pasted = false; openPass("El código del ticket se escribió a mano. Para aceptarlo, escribe la contraseña."); return;
  }
  acceptTicket(t);
}
// Pegar un código no cuenta como escaneo
tc.addEventListener("paste", e => { if(!cfg.allowManual){ e.preventDefault(); $("amountErr").textContent = ONLY_SCAN_MSG; } else pasted = true; });
tc.addEventListener("keydown", e => { if(e.key === "Enter" || e.keyCode === 13){ e.preventDefault(); submitTicketCode(); } });
tc.addEventListener("input", () => {
  $("amountErr").textContent = "";
  const now = performance.now(), len = tc.value.length;
  if(!len){ burst = { start:0, last:0, len:0 }; pasted = false; return; }
  if(!burst.len || now - burst.last > 400) burst = { start:now, last:now, len };   // empieza una lectura nueva
  else { burst.last = now; burst.len = len; }
  clearTimeout(tcTimer);                                   // pistolas configuradas sin Enter
  tcTimer = setTimeout(() => { if(tc.value) submitTicketCode(); }, 350);
});

// Si la pistola dispara con el cursor en el campo del celular, se pasa al campo Ticket
$("phone").addEventListener("beforeinput", e => {
  if(e.data && /[A-Za-z]/.test(e.data) && !tc.readOnly){
    e.preventDefault(); tc.focus(); tc.value = e.data;
    burst = { start:performance.now(), last:performance.now(), len:e.data.length };
  }
});
// Si la pistola dispara sin ningún campo seleccionado, también se captura
let gunBuf = "", gunStart = 0, gunLast = 0;
document.addEventListener("keydown", e => {
  const a = document.activeElement;
  if(a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) return;
  if(document.querySelector(".overlay.open") || !$("playBox").hidden || tc.readOnly) return;
  const now = performance.now();
  if(gunBuf && now - gunLast > 400) gunBuf = "";
  if(e.key === "Enter"){
    if(gunBuf.length >= 8){ e.preventDefault(); tc.value = gunBuf; submitTicketCode({ start:gunStart, last:gunLast, len:gunBuf.length }); }
    gunBuf = ""; return;
  }
  if(e.key && e.key.length === 1){ if(!gunBuf) gunStart = now; gunBuf += e.key; gunLast = now; }
});
// Con "solo escaneo", el campo Ticket queda listo para la pistola cuando no se está usando otro campo
function focusTicket(){
  if(cfg.allowManual || tc.readOnly || !$("playBox").hidden || document.querySelector(".overlay.open")) return;
  const a = document.activeElement;
  if(!a || a === document.body) tc.focus({ preventScroll:true });
}
document.addEventListener("click", () => setTimeout(focusTicket, 0));
