/* ==========================================================
   Panel de configuración (5 toques en el ícono i)
   ========================================================== */
let draft;
function openConfig(){
  draft = structuredClone(cfg);
  $("cfgErr").textContent = "";
  $("maxSpins").value = draft.maxSpins;
  showTab("t-premios"); renderRows(); renderTiers();
  openModal("cfgModal");
}
function showTab(id){
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === id));
  ["t-premios","t-giros","t-hist"].forEach(t => $(t).hidden = t !== id);
  $("saveCfg").hidden = id === "t-hist";
  if(id === "t-hist") renderHistory();
}
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => showTab(b.dataset.tab));

// --- Premios ---
function renderRows(){
  $("rows").innerHTML = draft.prizes.map((p,i)=>`
    <div class="prow" data-i="${i}">
      <input data-k="name" value="${esc(p.name)}" placeholder="Nombre del premio" maxlength="22" aria-label="Premio ${i+1}">
      <div class="unit" data-u="%"><input data-k="pct" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${p.pct}" aria-label="Probabilidad"></div>
      <button class="del" data-del aria-label="Quitar premio" ${draft.prizes.length<=MIN_P?"disabled":""}>✕</button>
    </div>
    <div class="pmeta">
      <span class="swatch" style="background:${segColor(i,draft.prizes.length).fill}"></span>
      <label><input type="checkbox" data-i="${i}" data-k="win" ${p.win?"":"checked"}> Sin premio (ej. Sigue jugando)</label>
    </div>`).join("");
  $("addRow").hidden = draft.prizes.length >= MAX_P;
  updateTotal();
}
function totalPct(){ return Math.round(draft.prizes.reduce((a,p)=>a+(+p.pct||0),0)*10)/10; }
function updateTotal(){
  const t = totalPct(), ok = Math.abs(t-100) < 0.05;
  $("totalTxt").textContent = `Total: ${t}%` + (ok ? "" : t < 100 ? ` (faltan ${Math.round((100-t)*10)/10}%)` : ` (sobran ${Math.round((t-100)*10)/10}%)`);
  $("total").className = "total " + (ok ? "ok" : "bad");
  $("fixBtn").hidden = ok || t === 0;
}
$("rows").addEventListener("input", e => {
  const el = e.target, i = +(el.closest("[data-i]")?.dataset.i);
  if(el.dataset.k === "name") draft.prizes[i].name = el.value;
  if(el.dataset.k === "pct"){ draft.prizes[i].pct = Math.max(0, parseFloat(el.value) || 0); updateTotal(); }
  if(el.dataset.k === "win") draft.prizes[i].win = !el.checked;
});
$("rows").addEventListener("click", e => {
  if(!e.target.matches("[data-del]")) return;
  draft.prizes.splice(+e.target.closest(".prow").dataset.i, 1); renderRows();
});
$("addRow").onclick = () => {
  draft.prizes.push({ name:"", pct:0, win:true }); renderRows();
  const r = $("rows").querySelectorAll(".prow"); r[r.length-1].querySelector("input").focus();
};
$("fixBtn").onclick = () => {
  const t = totalPct(); if(!t) return;
  draft.prizes.forEach(p => p.pct = Math.round((+p.pct||0)/t*1000)/10);
  const diff = Math.round((100 - totalPct())*10)/10;
  if(diff){ const m = draft.prizes.reduce((a,p,i,arr)=>p.pct>arr[a].pct?i:a,0); draft.prizes[m].pct = Math.round((draft.prizes[m].pct+diff)*10)/10; }
  renderRows();
};
$("resetCfg").onclick = () => { if(confirm("¿Restaurar los 8 premios originales?")){ draft.prizes = structuredClone(DEFAULT_CFG.prizes); renderRows(); } };

// --- Giros por compra ---
function renderTiers(){
  $("tierRows").innerHTML = draft.tiers.map((t,i)=>`
    <div class="trow" data-i="${i}">
      <span>Desde</span>
      <div class="unit pre" data-u="$"><input data-k="from" type="number" min="0" step="0.01" inputmode="decimal" value="${t.from}" aria-label="Monto desde"></div>
      <span>dar</span>
      <div class="unit" data-u="giros"><input data-k="spins" type="number" min="1" inputmode="numeric" value="${t.spins}" aria-label="Giros"></div>
      <button class="del" data-del aria-label="Quitar rango" ${draft.tiers.length<=1?"disabled":""}>✕</button>
    </div>`).join("");
  updatePreview();
}
function updatePreview(){
  const valid = draft.tiers.filter(t => t.from >= 0 && t.spins > 0);
  $("tierPreview").innerHTML = valid.length ? tierLabels(valid, draft.maxSpins||1).map(t=>`<li>${t}</li>`).join("") : "";
}
$("tierRows").addEventListener("input", e => {
  const el = e.target, i = +el.closest("[data-i]").dataset.i;
  if(el.dataset.k === "from") draft.tiers[i].from = round2(parseFloat(el.value) || 0);
  if(el.dataset.k === "spins") draft.tiers[i].spins = parseInt(el.value,10) || 0;
  updatePreview();
});
$("tierRows").addEventListener("click", e => {
  if(!e.target.matches("[data-del]")) return;
  draft.tiers.splice(+e.target.closest(".trow").dataset.i, 1); renderTiers();
});
$("addTier").onclick = () => {
  const last = [...draft.tiers].sort((a,b)=>a.from-b.from).pop();
  draft.tiers.push({ from: last ? last.from + 10000 : 0.01, spins: last ? last.spins + 1 : 1 }); renderTiers();
};
$("maxSpins").addEventListener("input", e => { draft.maxSpins = parseInt(e.target.value,10) || 0; updatePreview(); });

// --- Guardar ---
$("saveCfg").onclick = async () => {
  const err = m => { $("cfgErr").textContent = m; };
  draft.prizes.forEach(p => p.name = p.name.trim());
  if(draft.prizes.some(p => !p.name)) { showTab("t-premios"); return err("Escribe el nombre de todos los premios."); }
  const bad = draft.prizes.find(p => p.win && MONEY_WORDS.test(p.name));
  if(bad){ showTab("t-premios"); return err(`"${bad.name}" parece descuento o dinero. Solo se permiten premios físicos.`); }
  if(Math.abs(totalPct()-100) >= 0.05){ showTab("t-premios"); return err("Los porcentajes deben sumar 100%."); }
  if(draft.tiers.some(t => !(t.from > 0) || !(t.spins > 0))){ showTab("t-giros"); return err("Cada rango necesita un monto mayor a $0 y al menos 1 giro."); }
  if(new Set(draft.tiers.map(t=>t.from)).size !== draft.tiers.length){ showTab("t-giros"); return err("Hay dos rangos con el mismo monto."); }
  if(!(draft.maxSpins >= 1)){ showTab("t-giros"); return err("El máximo de giros debe ser al menos 1."); }
  draft.tiers.sort((a,b)=>a.from-b.from);
  cfg = draft; await DB.set("config", cfg);
  buildWheel(); render(); closeModals();
};
