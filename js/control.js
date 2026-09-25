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
