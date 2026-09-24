/* ==========================================================
   Confeti al ganar
   ========================================================== */
function confetti(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv=$("confetti"), ctx=cv.getContext("2d"), dpr=Math.min(2,devicePixelRatio||1);
  const W=innerWidth, H=innerHeight;
  cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+"px"; cv.style.height=H+"px"; ctx.setTransform(dpr,0,0,dpr,0,0);
  const cols=["#F5B400","#FFD85C","#ffffff","#C98F00","#ff9f1c","#fff3c4"];
  const parts=[];
  const make=(x,y,vx,vy,delay=0)=>({x,y,vx,vy,delay,s:Math.random()*7+6,r:Math.random()*6.28,vr:(Math.random()-.5)*.3,
    t:Math.random()*6.28,vt:Math.random()*.15+.08,c:cols[Math.random()*cols.length|0],
    shape:Math.random()<.55?0:Math.random()<.5?1:2,drag:.975+Math.random()*.015});
  const count = W > 900 ? 150 : 110;
  for(let k=0;k<count;k++){
    const a=(55+Math.random()*25)*Math.PI/180, sp=Math.random()*9+H*.022;
    parts.push(make(-10, H*.92, Math.cos(a)*sp, -Math.sin(a)*sp, Math.random()*6));
    parts.push(make(W+10, H*.92, -Math.cos(a)*sp, -Math.sin(a)*sp, Math.random()*6));
  }
  for(let k=0;k<(W>900?140:90);k++) parts.push(make(Math.random()*W, -20-Math.random()*H*.4, (Math.random()-.5)*2, Math.random()*2+1, 20+Math.random()*40));
  const DUR=4500, t0=performance.now();
  (function draw(now){
    const el=now-t0, alpha=el>DUR-1000?Math.max(0,(DUR-el)/1000):1;
    ctx.clearRect(0,0,W,H); ctx.globalAlpha=alpha;
    for(const p of parts){
      if(p.delay>0){ p.delay--; continue; }
      p.vy+=.22; p.vx*=p.drag; p.vy*=p.drag; if(p.vy>4.5) p.vy=4.5;
      p.t+=p.vt; p.x+=p.vx+Math.sin(p.t)*.8; p.y+=p.vy; p.r+=p.vr;
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
