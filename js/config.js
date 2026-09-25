/* ==========================================================
   CONFIGURACIÓN EDITABLE: premios por defecto y reglas de giros.
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
  perSpin: 2000,        // cada $2,000 de compra = 1 giro
  maxSpins: 10,         // máximo de giros por compra
  cooldownHours: 3,     // horas que un mismo teléfono debe esperar para volver a jugar (0 = sin límite)
  requireQR: false      // true = el monto solo se captura escaneando el QR del ticket
};
