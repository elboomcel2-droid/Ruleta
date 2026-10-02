/* ==========================================================
   Control por teléfono (una participación cada X horas)
   y tickets ya usados (un ticket no se puede usar dos veces)
   ========================================================== */
// Los folios usados se guardan para siempre en el dispositivo: un ticket solo da giros una vez.

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

// Devuelve { t, tel } si el folio ya se usó, o null
async function ticketUsed(key){
  if(!key) return null;
  const m = (await DB.get("tickets_used")) || {}, v = m[key];
  if(!v) return null;
  return typeof v === "number" ? { t:v, tel:"" } : v;
}
async function markTicket(key, tel){
  if(!key) return;
  const m = (await DB.get("tickets_used")) || {};
  m[key] = { t:Date.now(), tel: tel || "" };
  await DB.set("tickets_used", m);
}
function usedMsg(u){
  const d = new Date(u.t).toLocaleString("es-MX",{ day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" });
  return `Este ticket ya se usó el ${d}${u.tel ? ` (cel. ${fmtTel(u.tel)})` : ""}.`;
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
