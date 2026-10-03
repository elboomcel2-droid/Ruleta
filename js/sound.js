/* ==========================================================
   Sonidos: clic de varillas y fanfarria
   ========================================================== */
let ac, noiseBuf;
function audio(){
  ac = ac || new (window.AudioContext||window.webkitAudioContext)();
  if(ac.state === "suspended") ac.resume();
  return ac;
}
function beep(f=1600,d=.03,v=.05,t=0){
  try{ const a=audio(), o=a.createOscillator(), g=a.createGain(), st=a.currentTime+t;
    o.frequency.value=f; o.type="square"; g.gain.setValueAtTime(v,st); g.gain.exponentialRampToValueAtTime(.0001,st+d);
    o.connect(g).connect(a.destination); o.start(st); o.stop(st+d);
  }catch(e){}
}
// "Clac" de la varilla rozando la flecha: ruido corto filtrado + golpe grave. Más fuerte entre más rápido gira.
function tickSound(intensity){
  try{
    const a = audio(), t = a.currentTime;
    if(!noiseBuf){
      noiseBuf = a.createBuffer(1, Math.floor(a.sampleRate*.03), a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 3);
    }
    const src = a.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = .9 + Math.random()*.25;
    const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2000 + intensity*1400; bp.Q.value = 1.3;
    const g = a.createGain(); g.gain.value = .22 + .5*intensity;
    src.connect(bp).connect(g).connect(a.destination); src.start(t);
    const o = a.createOscillator(), og = a.createGain(); o.type = "triangle";
    o.frequency.setValueAtTime(950, t); o.frequency.exponentialRampToValueAtTime(260, t+.035);
    og.gain.setValueAtTime(.07 + .12*intensity, t); og.gain.exponentialRampToValueAtTime(.0001, t+.045);
    o.connect(og).connect(a.destination); o.start(t); o.stop(t+.05);
  }catch(e){}
}

// "Wah wah wah waaa": trombón triste al perder
function loseSound(){
  try{
    const a = audio(), t0 = a.currentTime + .02;
    const out = a.createGain(); out.gain.value = .22;
    const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100; lp.Q.value = 4;
    lp.connect(out).connect(a.destination);
    const notes = [[293.7,.32],[277.2,.32],[261.6,.32],[246.9,1.15]];   // Re, Do#, Do, Si (bajando)
    let t = t0;
    notes.forEach(([f,d], i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(f*1.02, t); o.frequency.exponentialRampToValueAtTime(f, t+.08);
      if(i === notes.length-1){                                      // última nota con vibrato y caída
        const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 6;
        lfo.connect(lg).connect(o.frequency); lfo.start(t+.15); lfo.stop(t+d);
        o.frequency.setValueAtTime(f, t+.7); o.frequency.exponentialRampToValueAtTime(f*.88, t+d);
      }
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(1, t+.04);
      g.gain.setValueAtTime(1, t+d-.08); g.gain.exponentialRampToValueAtTime(.0001, t+d);
      o.connect(g).connect(lp); o.start(t); o.stop(t+d+.02);
      t += d + .04;
    });
  }catch(e){}
}
