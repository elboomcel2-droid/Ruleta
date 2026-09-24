/* ==========================================================
   Ruleta: dibujo, acomodo del texto y movimiento de la flecha
   ========================================================== */
const C = 200, R = 170, PEG_R = 180;
let N, SEG, rot, spinning = false;

// ---------- Ajustes del texto de los premios (en unidades del dibujo, la ruleta mide 400) ----------
const TXT = {
  rIn: 52,          // no acercarse más al centro que esto (el centro "EL BOOM" mide 46)
  rOut: 163,        // no pasar de aquí hacia el borde (las varillas están en 180)
  maxFs: 17,        // tamaño máximo de letra
  minFs: 7,         // tamaño mínimo antes de comprimir
  lineH: 1.1,       // separación entre renglones
  cap: .74,         // alto de las mayúsculas respecto al tamaño de letra
  pad: 5,           // margen contra las líneas divisorias
  maxLines: 3,
  font: `900 {fs}px Montserrat, "Arial Black", Arial, sans-serif`
};

function pt(r,deg){ const t=deg*Math.PI/180; return [(C+r*Math.sin(t)).toFixed(2),(C-r*Math.cos(t)).toFixed(2)]; }
function segColor(i, n){
  if(n % 2 === 1 && i === n-1) return { fill:"#8a6a00", txt:"#fff" };
  return i % 2 === 0 ? { fill:"var(--gold)", txt:"#111" } : { fill:"var(--seg-dark)", txt:"#fff" };
}

// Mide el ancho real del texto con la misma fuente de la ruleta
const _measure = document.createElement("canvas").getContext("2d");
function textW(str, fs){ _measure.font = TXT.font.replace("{fs}", fs); return _measure.measureText(str).width; }

// Ancho disponible dentro del gajo a una distancia r del centro
function availW(r){
  const half = Math.min(SEG, 150) / 2 * Math.PI / 180;
  const byWedge = 2 * r * Math.sin(half);
  const byRim = 2 * Math.sqrt(Math.max(0, TXT.rOut*TXT.rOut - r*r));
  return Math.max(0, Math.min(byWedge, byRim) - TXT.pad*2);
}
// Todas las formas de repartir las palabras en k renglones
function splits(words, k){
  if(k === 1) return [[words.join(" ")]];
  const out = [];
  for(let i=1; i<=words.length-k+1; i++) for(const rest of splits(words.slice(i), k-1)) out.push([words.slice(0,i).join(" "), ...rest]);
  return out;
}
// Base (radio) de cada renglón: el primero va hacia el borde
function baselines(n, fs, top){ return Array.from({length:n}, (_,j) => top - fs*TXT.cap - j*fs*TXT.lineH); }
function fits(lines, fs, top = TXT.rOut){
  const b = baselines(lines.length, fs, top);
  if(b[b.length-1] < TXT.rIn) return false;
  return lines.every((l,j) => textW(l, fs) <= availW(b[j]));   // se mide en la parte más angosta del renglón
}
// ---- Modo "horizontal": el texto cruza el gajo (bueno con pocos premios) ----
function bestFs(lines, fitFn){
  if(!fitFn(lines, TXT.minFs)) return 0;
  let lo = TXT.minFs, hi = TXT.maxFs;
  if(fitFn(lines, hi)) return hi;
  while(hi - lo > .2){ const m = (lo+hi)/2; fitFn(lines, m) ? lo = m : hi = m; }
  return lo;
}
// ---- Modo "radial": el texto va del centro hacia el borde (bueno con muchos premios) ----
function fitsRadial(lines, fs){
  const len = Math.max(...lines.map(l => textW(l, fs)));
  if(len > TXT.rOut - TXT.rIn) return false;
  const inner = TXT.rOut - len;                                   // punto más angosto que ocupa el texto
  const thick = fs*TXT.cap + (lines.length-1)*fs*TXT.lineH;
  return thick <= availW(inner);
}
// Elige renglones y tamaño para que el texto quepa lo más grande posible
function layoutText(name, mode){
  const words = String(name).toUpperCase().trim().split(/\s+/).filter(Boolean);
  const fitFn = mode === "radial" ? fitsRadial : fits;
  const maxL = mode === "radial" ? 2 : TXT.maxLines;
  let best = null;
  for(let k=1; k<=Math.min(maxL, words.length); k++){
    for(const lines of splits(words, k)){
      const fs = bestFs(lines, fitFn);
      if(fs && (!best || fs > best.fs + .6)) best = { lines, fs };   // con tamaño parecido gana el de menos renglones
    }
  }
  return best || { lines:[words.join(" ")], fs:TXT.minFs, squeeze:true };
}
// Horizontal: coloca el bloque lo más centrado posible dentro del gajo sin que se salga
function placeText(lay){
  const n = lay.lines.length, h = lay.fs*TXT.cap + (n-1)*lay.fs*TXT.lineH;
  const spare = TXT.rOut - TXT.rIn - h;
  if(lay.squeeze) return baselines(n, lay.fs, TXT.rOut);
  for(const f of [.5, .35, .2, .1, 0]){
    const top = TXT.rOut - spare*f;
    if(fits(lay.lines, lay.fs, top)) return baselines(n, lay.fs, top);
  }
  return baselines(n, lay.fs, TXT.rOut);
}
// Dibuja el texto de un gajo según el modo elegido
function segmentText(lay, mode, color){
  const fam = TXT.font.split("px ")[1], fs = lay.fs.toFixed(2);
  let t = "";
  if(mode === "radial"){
    const n = lay.lines.length, ax = 200, ay = 200 - TXT.rOut;
    t += `<text text-anchor="end" transform="rotate(-90 ${ax} ${ay})" font-family='${fam}' font-weight="900" font-size="${fs}" fill="${color}">`;
    lay.lines.forEach((l,j) => {
      const dy = (j - (n-1)/2) * lay.fs*TXT.lineH + lay.fs*TXT.cap/2;
      const tooLong = textW(l, lay.fs) > TXT.rOut - TXT.rIn;
      t += `<tspan x="${ax}" y="${(ay + dy).toFixed(2)}"${tooLong ? ` textLength="${TXT.rOut - TXT.rIn}" lengthAdjust="spacingAndGlyphs"` : ""}>${esc(l)}</tspan>`;
    });
    return t + `</text>`;
  }
  const base = placeText(lay);
  t += `<text text-anchor="middle" font-family='${fam}' font-weight="900" font-size="${fs}" fill="${color}">`;
  lay.lines.forEach((l,j) => {
    const w = availW(base[j]), tooWide = textW(l, lay.fs) > w;
    t += `<tspan x="200" y="${(200 - base[j]).toFixed(2)}"${tooWide ? ` textLength="${w.toFixed(1)}" lengthAdjust="spacingAndGlyphs"` : ""}>${esc(l)}</tspan>`;
  });
  return t + `</text>`;
}

function buildWheel(){
  const P = cfg.prizes; N = P.length; SEG = 360/N;
  // Se prueban los dos acomodos y se usa el que deja la letra más grande
  const tryMode = m => { const l = P.map(p => layoutText(p.name, m)); return { m, l, min: Math.min(...l.map(x => x.fs)) }; };
  const h = tryMode("horizontal"), r = tryMode("radial");
  const { m: mode, l: lays } = r.min > h.min * 1.1 ? r : h;
  // mismo tamaño de letra para todos, salvo que alguno necesite ser más chico
  const common = Math.min(...lays.map(l => l.fs)) * 1.25;
  lays.forEach(l => { if(l.fs > common){ l.fs = common; } });

  let s = `<defs><radialGradient id="pegG" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#cfcfd6"/><stop offset="1" stop-color="#4a4a52"/></radialGradient></defs>
    <circle cx="200" cy="200" r="199" fill="var(--gold)"/><circle cx="200" cy="200" r="190" fill="#000"/><g id="rot">`;
  P.forEach((p,i)=>{
    const a=i*SEG, [x1,y1]=pt(R,a-SEG/2), [x2,y2]=pt(R,a+SEG/2), col=segColor(i,N);
    s += N === 1 ? `<circle cx="200" cy="200" r="${R}" fill="${col.fill}"/>`
       : `<path d="M200 200 L${x1} ${y1} A${R} ${R} 0 ${SEG>180?1:0} 1 ${x2} ${y2}Z" fill="${col.fill}" stroke="#000" stroke-width="3"/>`;
    s += `<g transform="rotate(${a} 200 200)">${segmentText(lays[i], mode, col.txt)}</g>`;
  });
  // varillas en cada división: son las que empujan la flecha
  for(let k=0;k<N;k++){ const [x,y]=pt(PEG_R, k*SEG - SEG/2);
    s += `<circle cx="${x}" cy="${y}" r="6.5" fill="url(#pegG)" stroke="#000" stroke-width="1.4"/>`; }
  s += `</g>`;
  const dots = Math.max(16, N*2);
  for(let k=0;k<dots;k++){ const [x,y]=pt(194.5,k*360/dots); s += `<circle class="light ${k%2?'odd':'even'}" cx="${x}" cy="${y}" r="2.4"/>`; }
  s += `<circle cx="200" cy="200" r="40" fill="#111" stroke="var(--gold)" stroke-width="6"/>
        <text x="200" y="193" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="900" font-style="italic" font-size="13" fill="#fff">EL</text>
        <text x="200" y="213" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="900" font-style="italic" font-size="19" fill="var(--gold)">BOOM</text>`;
  $("wheel").innerHTML = s;
  rot = SEG/2; $("rot").style.transform = `rotate(${rot}deg)`;
  pAng = 0; pVel = 0; $("pointer").style.transform = "";
  $("prizeList").innerHTML = P.filter(p=>p.win).map(p=>`<li>${esc(p.name)}</li>`).join("");
}

/* ---------- Flecha ---------- */
function currentAngle(){
  const m = getComputedStyle($("rot")).transform; if(!m || m==="none") return 0;
  const v = m.match(/matrix\(([^)]+)\)/); if(!v) return 0;
  const [a,b] = v[1].split(",").map(Number); return Math.atan2(b,a)*180/Math.PI;
}
// La flecha se mueve según la posición real de las varillas:
// cuando una varilla se acerca la empuja, al pasar la suelta y regresa con efecto resorte.
let pAng = 0, pVel = 0, physRun = false;
function pointerLoop(){
  if(physRun) return; physRun = true;
  const ptr = $("pointer");
  let last = currentAngle(), un = last;
  (function step(){
    const th = currentAngle();
    let d = th - last; d = ((d + 540) % 360) - 180; last = th; un += d;
    const c = Math.min(SEG*.22, 12), maxD = 26;                 // zona de contacto y desvío máximo (grados)
    const phi = (((un - SEG/2) % SEG) + SEG) % SEG;             // 0 = varilla justo bajo la flecha
    const toPeg = SEG - phi;                                     // grados que faltan para la siguiente varilla
    const passed = Math.floor((un - SEG/2)/SEG) - Math.floor((un - d - SEG/2)/SEG);
    let push = toPeg < c ? maxD * (1 - toPeg/c) : 0;
    if(d > c*.9) push = maxD * (.55 + Math.random()*.25);         // muy rápido: la flecha vibra pegada
    if(push >= pAng){ pAng = push; pVel = 0; }
    else { pVel += -.28*pAng - .2*pVel; pAng += pVel; }
    if(passed > 0) tickSound(Math.min(1, d/7));
    ptr.style.transform = `rotate(${(-pAng).toFixed(2)}deg)`;
    const settled = !spinning && Math.abs(d) < .001 && Math.abs(pVel) < .03 && Math.abs(pAng - push) < .03;
    if(settled){ physRun = false; return; }
    requestAnimationFrame(step);
  })();
}