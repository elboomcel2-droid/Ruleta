/* ==========================================================
   Control por teléfono (una participación cada X horas)
   y tickets ya usados (un ticket no se puede usar dos veces)
   ========================================================== */
const TICKET_KEEP_DAYS = 30;   // días que se recuerda un ticket usado

async function cooldownUntil(tel){
  const h = +cfg.cooldownHours || 0;
  if(!h) return 0;
  const m = (await DB.get("phone_last")) || {};
  const until = (m[tel] || 0) + h * 3600e3;
  return until > Date.now() ? until : 0;
}
async function markPlay(tel){
  const m = (await DB.get("phone_last")) || {}, now = Date.now();
  const keep = Math.max(+cfg.cooldownHours || 0, 1) * 3600e3;
  for(const k in m) if(now - m[k] > keep) delete m[k];     // limpia teléfonos que ya pueden volver a jugar
  m[tel] = now;
  await DB.set("phone_last", m);
}
async function resetPhoneControl(){ await DB.set("phone_last", {}); }

async function ticketUsed(key){
  if(!key) return false;
  const m = (await DB.get("tickets_used")) || {};
  return !!m[key];
}
async function markTicket(key){
  if(!key) return;
  const m = (await DB.get("tickets_used")) || {}, now = Date.now();
  for(const k in m) if(now - m[k] > TICKET_KEEP_DAYS * 864e5) delete m[k];
  m[key] = now;
  await DB.set("tickets_used", m);
}
const fHour = t => new Date(t).toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" });

/* ---------- Contraseña para escribir el monto a mano ---------- */
async function hashPass(p){
  const data = new TextEncoder().encode("elboom-ruleta:" + p);
  if(window.crypto && crypto.subtle){
    const h = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2,"0")).join("");
  }
  let h = 2166136261; for(const b of data){ h ^= b; h = Math.imul(h, 16777619) >>> 0; }   // respaldo sin https
  return "f" + h.toString(16);
}
async function checkPass(p){
  const target = cfg.manualPassHash || await hashPass(DEFAULT_MANUAL_PASS);
  return (await hashPass(p)) === target;
}
