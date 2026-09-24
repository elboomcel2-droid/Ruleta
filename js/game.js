/* ==========================================================
   Flujo del juego: compra, giros, resultados y ventanas
   ========================================================== */
/* ---------- Compra: teléfono y monto ---------- */
$("amount").addEventListener("input", e => {
  let v = e.target.value.replace(/[^\d.]/g,""); const i = v.indexOf(".");
  if(i >= 0) v = v.slice(0,i+1) + v.slice(i+1).replace(/\./g,"").slice(0,2);
  e.target.value = v; $("amountErr").textContent = "";
});
const fmtTel = t => t.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
$("phone").addEventListener("input", e => {
  const d = e.target.value.replace(/\D/g,"").slice(0,10);
  e.target.value = d.length > 6 ? `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}` : d.length > 3 ? `${d.slice(0,3)} ${d.slice(3)}` : d;
  $("amountErr").textContent = "";
});
$("amountForm").onsubmit = async e => {
  e.preventDefault();
  const tel = $("phone").value.replace(/\D/g,"");
  if(tel.length !== 10) return $("amountErr").textContent = "Escribe tu número de celular a 10 dígitos.";
  const amount = round2(parseFloat($("amount").value));
  if(!(amount > 0)) return $("amountErr").textContent = "Escribe el monto de tu compra.";
  const n = spinsFor(amount);
  if(n <= 0){ return $("amountErr").textContent = "Este monto no alcanza para girar."; }
  session = { id: Date.now(), tel, amount, total:n, left:n, results:[] };
  await DB.set("session", session);
  await histSave();
  $("amount").value = ""; $("phone").value = ""; render();
};


/* ---------- Giro y resultados ---------- */
function pick(){
  const P = cfg.prizes, total = P.reduce((a,p)=>a+Math.max(0,p.pct),0);
  let r = Math.random()*total;
  for(let i=0;i<P.length;i++){ r -= Math.max(0,P[i].pct); if(r < 0) return i; }
  return P.length-1;
}
function groupWins(wins){
  const m = new Map(); wins.forEach(w => m.set(w.name, (m.get(w.name)||0) + 1));
  return [...m].map(([n,c]) => `<li>${esc(n)}${c>1?`<span>×${c}</span>`:""}</li>`).join("");
}
async function spin(){
  if(spinning || !session || session.left <= 0) return;
  spinning = true; audio();
  const i = pick(), p = cfg.prizes[i];
  const result = { name:p.name, win:p.win };
  // Se guarda antes de la animación: si cierran la app a medio giro, el resultado ya quedó registrado
  session.left--; session.results.push(result);
  await DB.set("session", session);
  await histSave();
  render();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dur = reduce ? 1500 : 5200;
  const jitter = (Math.random()-.5)*SEG*.6, target = (360 - i*SEG) % 360;
  let next = rot - (((rot%360)+360)%360) + 360*(reduce?2:6) + target + jitter;
  if(next < rot + 360*(reduce?1:4)) next += 360;
  const g = $("rot");
  g.style.transition = `transform ${dur}ms cubic-bezier(.12,.62,.08,1)`;
  g.style.transform = `rotate(${next}deg)`; rot = next;
  $("wheelWrap").classList.add("spinning"); pointerLoop();
  setTimeout(() => finish(result), dur + 200);
}
function finish(res){
  spinning = false; $("wheelWrap").classList.remove("spinning");
  const ptr = $("pointer"); ptr.classList.remove("land"); void ptr.offsetWidth; ptr.classList.add("land");
  if(res.win){
    $("wheelWrap").classList.add("win"); setTimeout(()=>$("wheelWrap").classList.remove("win"),1800);
    [880,1175,1568].forEach((f,k)=>beep(f,.16,.06,k*.12)); confetti();
  } else beep(300,.25,.05);

  const left = session.left;
  let html = res.win
    ? `<h2>¡GANASTE!</h2><div class="prize">${esc(res.name)}</div>
       <p>Muestra esta pantalla al asesor en mostrador para recoger tu premio.</p>`
    : `<h2>¡CASI!</h2><div class="prize">${esc(res.name)}</div><p>Esta vez no hubo premio.</p>`;
  if(left > 0){
    html += `<button class="btn" data-close>Seguir girando (${left} ${left===1?"giro":"giros"} más)</button>`;
  } else {
    const wins = session.results.filter(r => r.win);
    if(session.total > 1){
      html += wins.length
        ? `<p style="margin-top:4px"><b style="color:var(--text)">Tus premios de esta compra</b></p><ul class="summary">${groupWins(wins)}</ul>`
        : `<p>Gracias por participar.</p>`;
    }
    html += `<button class="btn" data-close>Terminar</button>`;
  }
  $("resultCard").innerHTML = html;
  setTimeout(() => openModal("resultModal"), res.win ? 1100 : 500);
  render();
}
async function endSessionIfDone(){
  if(session && session.left <= 0 && !spinning){ session = null; await DB.del("session"); render(); }
}
function render(){
  const active = !!session && (session.left > 0 || spinning);
  $("amountForm").hidden = active; $("playBox").hidden = !active;
  if(!active) return;
  $("gotSpins").innerHTML = `¡Obtuviste <b>${session.total}</b> ${session.total===1?"giro":"giros"}!`;
  const n = session.left, btn = $("spinBtn");
  btn.disabled = spinning || n <= 0;
  btn.textContent = spinning ? "GIRANDO…" : "GIRAR LA RULETA →";
  $("status").innerHTML = `Te quedan <b>${n} de ${session.total} ${session.total===1?"giro":"giros"}</b>`;
}


/* ---------- Ventanas y acceso oculto a configuración ---------- */
function openModal(id){ $(id).classList.add("open"); }
function closeModals(){
  const wasResult = $("resultModal").classList.contains("open");
  document.querySelectorAll(".overlay.open").forEach(o=>o.classList.remove("open"));
  if(wasResult) endSessionIfDone();
}
document.addEventListener("click", e => { if(e.target.matches("[data-close]") || e.target.classList.contains("overlay")) closeModals(); });
document.addEventListener("keydown", e => { if(e.key==="Escape") closeModals(); });

// 1 toque = información · 5 toques seguidos = configuración
let taps = 0, tapTimer;
$("infoBtn").addEventListener("click", () => {
  taps++; clearTimeout(tapTimer);
  if(taps >= 5){ taps = 0; if(!spinning) openConfig(); return; }
  tapTimer = setTimeout(() => { if(taps === 1) openModal("infoModal"); taps = 0; }, 600);
});
