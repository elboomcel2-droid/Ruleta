/* ==========================================================
   Historial de compras (se guarda en la base de datos del dispositivo)
   Cada compra: fecha, teléfono, monto, ticket, tiros y premios.
   ========================================================== */
const HIST_MAX = 50000;   // tope de seguridad; al pasarlo se borran los más antiguos
const HIST_SHOW = 100;    // renglones que se muestran en pantalla (el CSV lleva todos)
const fShort = t => new Date(t).toLocaleString("es-MX",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});

async function histSave(){
  if(!session) return;
  await DB.put({ id:session.id, fecha:session.id, tel:session.tel, monto:session.amount, ticket:session.ticket || null,
                 manual:!!session.manual, tiros:session.results.length, total:session.total,
                 premios:session.results.filter(r=>r.win).map(r=>r.name) });
}
// Pasa los registros del historial anterior (máx. 10) a la base nueva, una sola vez
async function histMigrate(){
  const old = await DB.get("mini_hist");
  if(Array.isArray(old) && old.length){ for(const r of old) await DB.put(r); }
  if(old) await DB.del("mini_hist");
  const n = await DB.count();
  if(n > HIST_MAX){
    const all = (await DB.all()).sort((a,b)=>a.fecha-b.fecha).slice(HIST_MAX);
    await DB.clear(); for(const r of all) await DB.put(r);
  }
}
function premiosTxt(list){
  if(!list || !list.length) return "Sin premio";
  const m = new Map(); list.forEach(n => m.set(n, (m.get(n)||0)+1));
  return [...m].map(([n,c]) => c>1 ? `${n} ×${c}` : n).join(", ");
}
async function renderHistory(){
  const q = ($("histSearch").value || "").replace(/\D/g,"");
  const all = (await DB.all()).sort((a,b)=>b.fecha-a.fecha);
  const list = q ? all.filter(r => (r.tel||"").includes(q)) : all;
  const premios = all.reduce((a,r)=>a+(r.premios?.length||0),0), manual = all.filter(r=>r.manual).length;
  $("stats").innerHTML = `<div><b>${all.length}</b><small>Compras</small></div><div><b>${premios}</b><small>Premios</small></div><div><b>${manual}</b><small>A mano</small></div>`;
  $("histHint").textContent = q
    ? `${list.length} compra(s) del número ${fmtTel(q.padEnd(10,"·")).trim()}`
    : list.length > HIST_SHOW ? `Se muestran las ${HIST_SHOW} más recientes. El CSV lleva todas.` : "";
  $("histBody").innerHTML = list.slice(0, HIST_SHOW).map(r=>`<tr>
      <td>${fShort(r.fecha)}</td>
      <td>${fmtTel(r.tel||"")}${r.manual?`<br><small class="tag-manual">Monto a mano</small>`:""}</td>
      <td>${r.tiros===r.total?r.tiros:`${r.tiros} de ${r.total}`}</td>
      <td class="prz">${esc(premiosTxt(r.premios))}</td></tr>`).join("")
    || `<tr><td colspan="4" style="color:var(--muted)">${q ? "No hay compras con ese número." : "Todavía no hay registros."}</td></tr>`;
  $("cancelSession").hidden = !(session && session.left > 0);
}
$("histSearch").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g,"").slice(0,10); renderHistory(); });
$("exportBtn").onclick = async () => {
  const all = (await DB.all()).sort((a,b)=>a.fecha-b.fecha);
  const rows = [["Fecha","Teléfono","Monto","Ticket","Monto capturado","Tiros","Premios"],
    ...all.map(r=>[new Date(r.fecha).toLocaleString("es-MX"), r.tel, r.monto ?? "", r.ticket || "", r.manual?"A mano (con contraseña)":"QR del ticket", r.tiros, premiosTxt(r.premios)])];
  const csv = "\ufeff" + rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
  a.download = `ruleta-historial-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
};
$("clearHist").onclick = async () => {
  if(!confirm("¿Borrar TODO el historial de este dispositivo? Exporta el CSV antes si lo necesitas.")) return;
  if(!confirm("Esta acción no se puede deshacer. ¿Continuar?")) return;
  await DB.clear(); renderHistory();
};
$("cancelSession").onclick = async () => { if(confirm("¿Cancelar los giros pendientes de la compra actual?")){ session = null; await DB.del("session"); render(); renderHistory(); } };
