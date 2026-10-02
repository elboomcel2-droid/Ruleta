/* ==========================================================
   Reporte PDF del historial (máximo 1 mes), fondo blanco para ahorrar tinta
   ========================================================== */
const REP_MAX_DAYS = 31;
const pad2 = n => String(n).padStart(2, "0");
const isoDay = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const parseDay = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const fDay = d => d.toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric" });

function setRange(kind){
  const now = new Date(); let a, b;
  if(kind === "month"){ a = new Date(now.getFullYear(), now.getMonth(), 1); b = now; }
  else if(kind === "prev"){ a = new Date(now.getFullYear(), now.getMonth()-1, 1); b = new Date(now.getFullYear(), now.getMonth(), 0); }
  else { b = now; a = new Date(now); a.setDate(a.getDate() - 29); }
  $("repFrom").value = isoDay(a); $("repTo").value = isoDay(b);
  document.querySelectorAll(".rep-chips button").forEach(x => x.classList.toggle("on", x.dataset.range === kind));
  $("repErr").textContent = "";
}
$("reportBtn").onclick = () => {
  const box = $("reportBox"); box.hidden = !box.hidden;
  if(!box.hidden){
    if(!$("repFrom").value) setRange("month");
    try{ $("repBranch").value = localStorage.getItem("elboom_branch") || ""; }catch(e){}
    box.scrollIntoView({ behavior:"smooth", block:"nearest" });
  }
};
document.querySelectorAll(".rep-chips button").forEach(b => b.onclick = () => setRange(b.dataset.range));
["repFrom","repTo"].forEach(id => $(id).addEventListener("change", () => {
  document.querySelectorAll(".rep-chips button").forEach(x => x.classList.remove("on")); $("repErr").textContent = "";
}));
$("repBranch").addEventListener("change", e => { try{ localStorage.setItem("elboom_branch", e.target.value); }catch(_){} });

// Logo en blanco (sin fondo amarillo) como imagen para el PDF
function logoData(){
  const img = $("printLogo");
  if(!img.complete || !img.naturalWidth) return null;
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0,0,c.width,c.height); x.drawImage(img,0,0);
  return { data: c.toDataURL("image/jpeg", .92), ratio: img.naturalHeight / img.naturalWidth };
}

$("repGo").onclick = async () => {
  const err = m => { $("repErr").textContent = m; };
  if(!$("repFrom").value || !$("repTo").value) return err("Elige las dos fechas.");
  const from = parseDay($("repFrom").value), to = parseDay($("repTo").value);
  if(to < from) return err("La fecha final no puede ser antes de la inicial.");
  const days = Math.round((to - from) / 864e5) + 1;
  if(days > REP_MAX_DAYS) return err(`El reporte puede ser de máximo ${REP_MAX_DAYS} días (elegiste ${days}).`);
  if(!window.jspdf) return err("No se pudo cargar el generador de PDF.");
  const end = new Date(to); end.setHours(23,59,59,999);
  const rows = (await DB.all()).filter(r => r.fecha >= from.getTime() && r.fecha <= end.getTime()).sort((a,b) => a.fecha - b.fecha);
  if(!rows.length) return err("No hay compras en ese periodo.");
  $("repGo").disabled = true; $("repGo").textContent = "Generando…";
  try{ buildPDF(rows, from, to, $("repBranch").value); err(""); }
  catch(e){ err("No se pudo generar el PDF."); console.error(e); }
  $("repGo").disabled = false; $("repGo").textContent = "Descargar PDF";
};

function buildPDF(rows, from, to, branch){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:"mm", format:"a4" });
  const W = 210, M = 14, GOLD = [245,180,0], INK = [20,20,22], GRAY = [105,105,112], LINE = [215,215,220];
  const pesos = n => "$" + Number(n||0).toLocaleString("es-MX", { minimumFractionDigits:2, maximumFractionDigits:2 });

  // ---- Totales ----
  const compras = rows.length;
  const monto = rows.reduce((a,r) => a + (+r.monto || 0), 0);
  const otorgados = rows.reduce((a,r) => a + (r.total || 0), 0);
  const usados = rows.reduce((a,r) => a + (r.tiros || 0), 0);
  const premiosN = rows.reduce((a,r) => a + (r.premios?.length || 0), 0);
  const clientes = new Set(rows.map(r => r.tel)).size;
  const aMano = rows.filter(r => r.manual).length;
  const porPremio = new Map();
  rows.forEach(r => (r.premios || []).forEach(p => porPremio.set(p, (porPremio.get(p) || 0) + 1)));

  // ---- Encabezado ----
  const logo = logoData();
  if(logo) doc.addImage(logo.data, "JPEG", M, 9, 44, 44 * logo.ratio);
  doc.setTextColor(...INK); doc.setFont("helvetica","bold"); doc.setFontSize(17);
  doc.text("REPORTE GIRA Y GANA", W - M, 16, { align:"right" });
  doc.setFont("helvetica","normal"); doc.setFontSize(9.5); doc.setTextColor(...GRAY);
  doc.text(`Periodo: ${fDay(from)} al ${fDay(to)}`, W - M, 22, { align:"right" });
  doc.text(`Sucursal: ${branch || "Sin especificar"}`, W - M, 26.5, { align:"right" });
  doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, W - M, 31, { align:"right" });
  doc.setDrawColor(...GOLD); doc.setLineWidth(1.1); doc.line(M, 36, W - M, 36);

  // ---- Resumen (recuadros solo con borde) ----
  const cards = [
    ["Compras", String(compras)], ["Clientes", String(clientes)], ["Monto de compras", pesos(monto)],
    ["Giros otorgados", String(otorgados)], ["Giros usados", String(usados)], ["Premios entregados", String(premiosN)]
  ];
  const cw = (W - 2*M - 2*4) / 3, ch = 17; let y = 42;
  cards.forEach((c, i) => {
    const x = M + (i % 3) * (cw + 4), yy = y + Math.floor(i / 3) * (ch + 4);
    doc.setDrawColor(...LINE); doc.setLineWidth(.3); doc.roundedRect(x, yy, cw, ch, 2, 2);
    doc.setDrawColor(...GOLD); doc.setLineWidth(1); doc.line(x + 3, yy + 3, x + 3, yy + ch - 3);
    doc.setTextColor(...GRAY); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.text(c[0].toUpperCase(), x + 6, yy + 6.5);
    doc.setTextColor(...INK); doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.text(c[1], x + 6, yy + 13.5);
  });
  y += 2*ch + 4 + 8;
  if(aMano){
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
    doc.text(`* ${aMano} compra(s) se capturaron a mano con contraseña.`, M, y - 2); y += 5;
  }

  const tableBase = {
    theme:"grid", margin:{ left:M, right:M, top:16, bottom:16 },
    styles:{ font:"helvetica", fontSize:8.5, textColor:INK, lineColor:LINE, lineWidth:.2, cellPadding:1.8, fillColor:[255,255,255] },
    headStyles:{ fillColor:[255,255,255], textColor:INK, fontStyle:"bold", lineColor:LINE },
    alternateRowStyles:{ fillColor:[255,255,255] },
    didDrawCell: d => { if(d.section === "head"){ doc.setDrawColor(...GOLD); doc.setLineWidth(.8); doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height); } }
  };
  const sectionTitle = (t, yy) => { doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...INK); doc.text(t, M, yy); };

  // ---- Premios entregados ----
  sectionTitle("Premios entregados", y);
  const prem = [...porPremio].sort((a,b) => b[1] - a[1]).map(([n,c]) => [n, String(c), usados ? (c/usados*100).toFixed(1) + "%" : "0%"]);
  prem.push(["Sin premio", String(usados - premiosN), usados ? ((usados-premiosN)/usados*100).toFixed(1) + "%" : "0%"]);
  doc.autoTable({ ...tableBase, startY: y + 3,
    head:[["Premio","Cantidad","% de giros"]], body: prem,
    foot:[["Total de giros usados", String(usados), "100%"]],
    footStyles:{ fillColor:[255,255,255], textColor:INK, fontStyle:"bold" },
    columnStyles:{ 1:{ halign:"right", cellWidth:28 }, 2:{ halign:"right", cellWidth:28 } } });

  // ---- Detalle de compras ----
  y = doc.lastAutoTable.finalY + 10;
  if(y > 260){ doc.addPage(); y = 20; }
  sectionTitle("Detalle de compras", y);
  const fmtDT = t => new Date(t).toLocaleString("es-MX", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false });
  doc.autoTable({ ...tableBase, startY: y + 3,
    head:[["Fecha","Teléfono","Folio","Monto","Tiros","Premios"]],
    body: rows.map(r => [fmtDT(r.fecha), fmtTel(r.tel || ""), (r.ticket || "—") + (r.manual ? " *" : ""), pesos(r.monto),
                         r.tiros === r.total ? String(r.tiros) : `${r.tiros} de ${r.total}`, premiosTxt(r.premios)]),
    columnStyles:{ 0:{ cellWidth:26 }, 1:{ cellWidth:26 }, 2:{ cellWidth:28 }, 3:{ halign:"right", cellWidth:24 }, 4:{ halign:"center", cellWidth:14 } } });

  // ---- Pie de página ----
  const pages = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pages; i++){
    doc.setPage(i);
    doc.setDrawColor(...LINE); doc.setLineWidth(.3); doc.line(M, 285, W - M, 285);
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...GRAY);
    doc.text("Gira y Gana · Refaccionaria El Boom Tractopartes", M, 289.5);
    doc.text(`Página ${i} de ${pages}`, W - M, 289.5, { align:"right" });
  }
  doc.save(`reporte-gira-y-gana_${isoDay(from)}_a_${isoDay(to)}.pdf`);
}
