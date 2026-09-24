/* ==========================================================
   Base de datos local (IndexedDB) y estado de la app
   ========================================================== */
const DB = (() => {
  let dbp, mem = { kv:{}, giros:[] }, ok = "indexedDB" in window;
  function open(){
    return dbp ||= new Promise((res, rej) => {
      const r = indexedDB.open("elboom_ruleta", 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("kv"); d.createObjectStore("giros", { keyPath:"id", autoIncrement:true }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  function tx(store, mode, fn){
    return open().then(d => new Promise((res, rej) => {
      const t = d.transaction(store, mode), req = fn(t.objectStore(store));
      t.oncomplete = () => res(req ? req.result : undefined); t.onerror = () => rej(t.error);
    }));
  }
  const safe = (p, fb) => ok ? p().catch(e => { ok = false; return fb(); }) : Promise.resolve(fb());
  return {
    get: k => safe(() => tx("kv","readonly", s => s.get(k)), () => mem.kv[k]),
    set: (k,v) => safe(() => tx("kv","readwrite", s => s.put(v,k)), () => { mem.kv[k] = v; }),
    del: k => safe(() => tx("kv","readwrite", s => s.delete(k)), () => { delete mem.kv[k]; }),
    add: v => safe(() => tx("giros","readwrite", s => s.add(v)), () => { mem.giros.push(v); }),
    all: () => safe(() => tx("giros","readonly", s => s.getAll()), () => mem.giros.slice()),
    clear: () => safe(() => tx("giros","readwrite", s => s.clear()), () => { mem.giros = []; })
  };
})();

let cfg = structuredClone(DEFAULT_CFG);
let session = null;   // { id, amount, total, left, results:[] }

function validCfg(c){ return c && Array.isArray(c.prizes) && c.prizes.length >= MIN_P && Array.isArray(c.tiers) && c.tiers.length; }
function spinsFor(amount){
  const t = [...cfg.tiers].sort((a,b)=>a.from-b.from).filter(t => amount >= t.from).pop();
  return t ? Math.min(t.spins, cfg.maxSpins) : 0;
}
function tierLabels(tiers, max){
  const t = [...tiers].sort((a,b)=>a.from-b.from);
  return t.map((x,i) => {
    const n = Math.min(x.spins, max), g = `<b>${n} ${n===1?"giro":"giros"}</b>`;
    const next = t[i+1];
    if(!next) return `${money(x.from)} o más: ${g}`;
    const to = money(round2(next.from - 0.01));
    return x.from <= 1 ? `Hasta ${to}: ${g}` : `${money(x.from)} a ${to}: ${g}`;
  });
}
