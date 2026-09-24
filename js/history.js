/* ==========================================================
   Mini historial: últimos 10 registros (teléfono, tiros, premios)
   ========================================================== */
const HIST_MAX = 10;
const fShort = t => new Date(t).toLocaleString("es-MX",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});
async function histSave(){
  if(!session) return;
  let h = (await DB.get("mini_hist")) || [];
  const rec = { id:session.id, fecha:session.id, tel:session.tel, tiros:session.results.length, total:session.total,
                premios:session.results.filter(r=>r.win).map(r=>r.name) };
  h = [rec, ...h.filter(x => x.id !== rec.id)].sort((a,b)=>b.fecha-a.fecha).slice(0, HIST_MAX);
  await DB.set("mini_hist", h);
}
function premiosTxt(list){
  if(!list.length) return "Sin premio";
  const m = new Map(); list.forEach(n => m.set(n, (m.get(n)||0)+1));
  return [...m].map(([n,c]) => c>1 ? `${n} ×${c}` : n).join(", ");
}
async function renderHistory(){
  const h = (await DB.get("mini_hist")) || [];
  $("histHint").textContent = `${h.length} de ${HIST_MAX} registros. Al llegar a ${HIST_MAX}, el más antiguo se reemplaza.`;
  $("histBody").innerHTML = h.map(r=>`<tr><td>${fShort(r.fecha)}</td><td>${fmtTel(r.tel||"")}</td><td>${r.tiros===r.total?r.tiros:`${r.tiros} de ${r.total}`}</td><td class="prz">${esc(premiosTxt(r.premios))}</td></tr>`).join("")
    || `<tr><td colspan="4" style="color:var(--muted)">Todavía no hay registros.</td></tr>`;
  $("cancelSession").hidden = !(session && session.left > 0);
}
$("exportBtn").onclick = async () => {
  const h = ((await DB.get("mini_hist")) || []).slice().reverse();
  const rows = [["Fecha","Teléfono","Tiros","Premios"], ...h.map(r=>[new Date(r.fecha).toLocaleString("es-MX"), r.tel, r.tiros, premiosTxt(r.premios)])];
  const csv = "\ufeff" + rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
  a.download = `ruleta-historial-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
};
$("clearHist").onclick = async () => { if(confirm("¿Borrar el historial de este dispositivo?")){ await DB.set("mini_hist", []); renderHistory(); } };
$("cancelSession").onclick = async () => { if(confirm("¿Cancelar los giros pendientes de la compra actual?")){ session = null; await DB.del("session"); render(); renderHistory(); } };
