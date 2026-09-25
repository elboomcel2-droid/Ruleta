/* ==========================================================
   Panel de configuración (5 toques en el ícono i)
   ========================================================== */
let draft;
function openConfig(){
  draft = structuredClone(cfg);
  $("cfgErr").textContent = "";
  $("perSpin").value = draft.perSpin; $("maxSpins").value = draft.maxSpins;
  $("cooldown").value = draft.cooldownHours; $("requireQR").checked = !!draft.requireQR;
  showTab("t-premios"); renderRows(); updatePreview();
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

// --- Reglas de giros ---
function updatePreview(){
  const per = draft.perSpin || 0, max = draft.maxSpins || 0, h = draft.cooldownHours || 0;
  if(!(per > 0) || !(max > 0)){ $("tierPreview").innerHTML = ""; return; }
  const g = n => `<b>${n} ${n===1?"giro":"giros"}</b>`;
  $("tierPreview").innerHTML = [
    `Menos de ${money(per)}: <b>sin giros</b>`,
    `${money(per)}: ${g(1)}`,
    max > 1 ? `${money(per*2)}: ${g(2)}` : "",
    `${money(per*max)} o más: ${g(max)} (máximo)`,
    h ? `Un mismo teléfono: <b>1 vez cada ${h} ${h===1?"hora":"horas"}</b>` : `Teléfonos: <b>sin límite de tiempo</b>`,
    draft.requireQR ? `Monto: <b>solo escaneando el ticket</b>` : `Monto: <b>escrito o escaneado</b>`
  ].filter(Boolean).map(t=>`<li>${t}</li>`).join("");
}
$("perSpin").addEventListener("input", e => { draft.perSpin = round2(parseFloat(e.target.value) || 0); updatePreview(); });
$("maxSpins").addEventListener("input", e => { draft.maxSpins = parseInt(e.target.value,10) || 0; updatePreview(); });
$("cooldown").addEventListener("input", e => { draft.cooldownHours = Math.max(0, parseFloat(e.target.value) || 0); updatePreview(); });
$("requireQR").addEventListener("change", e => { draft.requireQR = e.target.checked; updatePreview(); });
$("resetPhones").onclick = async () => {
  if(!confirm("¿Permitir que todos los teléfonos vuelvan a jugar ahora?")) return;
  await resetPhoneControl(); $("cfgErr").textContent = "Listo: todos los teléfonos pueden volver a jugar.";
};

// --- Guardar ---
$("saveCfg").onclick = async () => {
  const err = m => { $("cfgErr").textContent = m; };
  draft.prizes.forEach(p => p.name = p.name.trim());
  if(draft.prizes.some(p => !p.name)) { showTab("t-premios"); return err("Escribe el nombre de todos los premios."); }
  const bad = draft.prizes.find(p => p.win && MONEY_WORDS.test(p.name));
  if(bad){ showTab("t-premios"); return err(`"${bad.name}" parece descuento o dinero. Solo se permiten premios físicos.`); }
  if(Math.abs(totalPct()-100) >= 0.05){ showTab("t-premios"); return err("Los porcentajes deben sumar 100%."); }
  if(!(draft.perSpin > 0)){ showTab("t-giros"); return err("Escribe cuánto debe comprar el cliente por cada giro."); }
  if(!(draft.maxSpins >= 1)){ showTab("t-giros"); return err("El máximo de giros debe ser al menos 1."); }
  if(!(draft.cooldownHours >= 0)){ showTab("t-giros"); return err("Las horas de espera no pueden ser negativas."); }
  cfg = draft; await DB.set("config", cfg);
  buildWheel(); applyQRRule(); render(); closeModals();
};
