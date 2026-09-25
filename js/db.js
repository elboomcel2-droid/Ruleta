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

function validCfg(c){ return c && Array.isArray(c.prizes) && c.prizes.length >= MIN_P; }
// Completa una configuración guardada con los valores nuevos que no tenía
function normalizeCfg(saved){
  const c = { ...structuredClone(DEFAULT_CFG), ...saved, prizes: saved.prizes };
  delete c.tiers;
  return c;
}
// Cada $perSpin = 1 giro, con un máximo de maxSpins
function spinsFor(amount){
  const per = cfg.perSpin || 2000;
  return Math.min(cfg.maxSpins, Math.floor((amount + 1e-6) / per));
}
