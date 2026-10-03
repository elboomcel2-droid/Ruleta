/* ==========================================================
   Confeti: dorado al ganar, gris (cayendo sin ánimo) al perder
   ========================================================== */
function confetti(mode){
  const lose = mode === "lose";
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv=$("confetti"), ctx=cv.getContext("2d"), dpr=Math.min(2,devicePixelRatio||1);
  const W=innerWidth, H=innerHeight;
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+"px"; cv.style.height=H+"px"; ctx.setTransform(dpr,0,0,dpr,0,0);
  const cols = lose ? ["#6b6b72","#8d8d95","#a8a8b0","#4b4b52","#c4c4ca"] : ["#F5B400","#FFD85C","#ffffff","#C98F00","#ff9f1c","#fff3c4"];
  const parts=[];
  const make=(x,y,vx,vy,delay=0)=>({x,y,vx,vy,delay,s:Math.random()*7+6,r:Math.random()*6.28,vr:(Math.random()-.5)*.3,
    t:Math.random()*6.28,vt:Math.random()*.15+.08,c:cols[Math.random()*cols.length|0],
    shape:Math.random()<.55?0:Math.random()<.5?1:2,drag:.975+Math.random()*.015});
  const count = W > 900 ? 150 : 110;
  if(lose){
    // Un "pfff" débil desde la ruleta y papelitos grises que caen despacio
    const wr = $("wheel").getBoundingClientRect(), cx = wr.left + wr.width/2, cy = wr.top + wr.height*.45;
    for(let k=0;k<70;k++){ const a = Math.random()*Math.PI*2, sp = Math.random()*3.5+1;
      parts.push(make(cx, cy, Math.cos(a)*sp, Math.sin(a)*sp - 2.5, Math.random()*4)); }
    for(let k=0;k<(W>900?110:70);k++) parts.push(make(Math.random()*W, -20-Math.random()*H*.5, (Math.random()-.5)*1, Math.random()*1+.5, 10+Math.random()*50));
  } else
  for(let k=0;k<count;k++){
    const a=(55+Math.random()*25)*Math.PI/180, sp=Math.random()*9+H*.022;
    parts.push(make(-10, H*.92, Math.cos(a)*sp, -Math.sin(a)*sp, Math.random()*6));
    parts.push(make(W+10, H*.92, -Math.cos(a)*sp, -Math.sin(a)*sp, Math.random()*6));
  }
  if(!lose) for(let k=0;k<(W>900?140:90);k++) parts.push(make(Math.random()*W, -20-Math.random()*H*.4, (Math.random()-.5)*2, Math.random()*2+1, 20+Math.random()*40));
  const G = lose ? .09 : .22, VMAX = lose ? 2.2 : 4.5, SWAY = lose ? .4 : .8;
  const DUR = lose ? 4200 : 4500, t0=performance.now();
  (function draw(now){
    const el=now-t0, alpha=el>DUR-1000?Math.max(0,(DUR-el)/1000):1;
    ctx.clearRect(0,0,W,H); ctx.globalAlpha=alpha;
    for(const p of parts){
      if(p.delay>0){ p.delay--; continue; }
      p.vy+=G; p.vx*=p.drag; p.vy*=p.drag; if(p.vy>VMAX) p.vy=VMAX;
      p.t+=p.vt; p.x+=p.vx+Math.sin(p.t)*SWAY; p.y+=p.vy; p.r+=p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.scale(1,Math.cos(p.t)); ctx.fillStyle=p.c;
      if(p.shape===0) ctx.fillRect(-p.s/2,-p.s/3,p.s,p.s*.66);
      else if(p.shape===1){ ctx.beginPath(); ctx.arc(0,0,p.s*.38,0,6.28); ctx.fill(); }
      else ctx.fillRect(-p.s*.9,-1.5,p.s*1.8,3);
      ctx.restore();
    }
    ctx.globalAlpha=1;
    if(el<DUR) requestAnimationFrame(draw); else ctx.clearRect(0,0,W,H);
  })(t0);
}
