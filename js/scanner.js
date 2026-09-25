/* ==========================================================
   Lectura del QR del ticket para obtener el monto de la compra
   ========================================================== */
let scannedTicket = null;      // { amount, key } del último ticket leído
let scanStream = null, scanRAF = 0, scanBusy = false;

/* Interpreta el contenido del QR. Soporta:
   1) Factura CFDI del SAT: ...?id=UUID&re=..&rr=..&tt=0000000220.230000
   2) URL con parámetros total / monto / importe y folio / id
   3) JSON: {"total":220.23,"folio":"A123"}
   4) Texto con "TOTAL: 220.23"
   5) Solo el número: 220.23
   Si el QR de tus tickets trae otro formato, ajusta esta función. */
function parseTicketQR(raw){
  const text = String(raw || "").trim();
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

async function openScanner(){
  scanMsg("Buscando el código QR…");
  openModal("scanModal");
  if(!navigator.mediaDevices?.getUserMedia){ scanMsg("Este navegador no permite usar la cámara. Usa una foto del ticket.", true); return; }
  try{
    scanStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:"environment" }, width:{ ideal:1280 } }, audio:false });
    const v = $("scanVideo"); v.srcObject = scanStream; await v.play();
    loopScan();
  }catch(e){
    scanMsg(location.protocol !== "https:" && location.hostname !== "localhost"
      ? "La cámara solo funciona cuando la app está publicada en https. Usa una foto del ticket."
      : "No se pudo abrir la cámara. Revisa el permiso de cámara o usa una foto del ticket.", true);
  }
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
  if(await ticketUsed(t.key)){ scanMsg("Este ticket ya se usó para girar.", true); return; }
  stopScanner();
  scannedTicket = t;
  $("amount").value = t.amount.toFixed(2);
  $("amount").readOnly = true;
  $("scanOk").hidden = false; $("amountErr").textContent = "";
  beep(1320, .08, .06);
  closeModals();
}
function clearScan(){
  scannedTicket = null; $("scanOk").hidden = true;
  $("amount").readOnly = !!cfg.requireQR;
}
// Aplica la regla "pedir QR": si está activa no se puede escribir el monto
function applyQRRule(){
  $("amount").readOnly = !!cfg.requireQR || !!scannedTicket;
  $("amount").placeholder = cfg.requireQR ? "Escanea el ticket" : "0.00";
}

$("scanBtn").onclick = openScanner;
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
