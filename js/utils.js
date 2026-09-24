/* ==========================================================
   Utilidades generales
   ========================================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n);
const fDate = t => new Date(t).toLocaleString("es-MX",{day:"2-digit",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"});
const round2 = n => Math.round(n*100)/100;
