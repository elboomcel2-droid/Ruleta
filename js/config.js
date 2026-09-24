/* ==========================================================
   CONFIGURACIÓN EDITABLE: premios por defecto, rangos de giros y límites.
   Se usan la primera vez o al restaurar; lo guardado en la app tiene prioridad.
   ========================================================== */
const MIN_P = 2, MAX_P = 12;
const MONEY_WORDS = /(%|\$|descuento|dcto|bono|off\b|dinero|efectivo|vale|cup[oó]n|pesos|reembolso|cashback|gratis)/i;

const DEFAULT_CFG = {
  prizes: [
    { name:"Gorra El Boom",    pct:12, win:true  },
    { name:"Playera El Boom",  pct:8,  win:true  },
    { name:"Termo El Boom",    pct:6,  win:true  },
    { name:"Sigue jugando",    pct:35, win:false },
    { name:"Llavero El Boom",  pct:15, win:true  },
    { name:"Kit de limpieza",  pct:8,  win:true  },
    { name:"Lámpara de mano",  pct:6,  win:true  },
    { name:"Premio sorpresa",  pct:10, win:true  }
  ],
  tiers: [ { from:0.01, spins:1 }, { from:2000.01, spins:5 }, { from:20000, spins:10 } ],
  maxSpins: 10
};
