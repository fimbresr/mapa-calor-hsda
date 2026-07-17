(function(){
'use strict';

var LEVELS={N1:'Nivel 1',N2:'Nivel 2',N3:'Nivel 3',N4:'Nivel 4'};
var FREQ={Critico:'Quincenal',Alto:'Mensual',Medio:'Trimestral',Bajo:'Semestral'};
var CLAS_COLORS={Critico:'#dc2626',Alto:'#ea580c',Medio:'#ca8a04',Bajo:'#65a30d'};
var CLAS_BG={Critico:'rgba(239,68,68,0.12)',Alto:'rgba(249,115,22,0.10)',Medio:'rgba(250,204,21,0.10)',Bajo:'rgba(132,204,22,0.10)'};

function isHotspot(a){return a.bio.aerosoles>=4 && a.bio.interrelacion>=4;}

function recalcBio(a){
  var s=a.bio;
  var x=s.ocupacion*0.10+s.contacto_paciente*0.15+s.sangre_fluidos*0.15+s.procedimientos*0.10+s.rpbi*0.15+s.muestras_biologicas*0.10+s.aerosoles*0.10+s.interrelacion*0.10+s.incidentes*0.10-(s.controles-1)*0.10;
  x=Math.max(1,Math.min(5,Math.round(x*100)/100));
  s.indice=x;
  s.clasificacion=x>=4?'Critico':x>=3?'Alto':x>=2?'Medio':'Bajo';
  return s;
}

function getAgents(a,n){
  var agents=a.reconocimiento?a.reconocimiento.agentes_biologicos||[]:[];
  var out=[];
  for(var i=0;i<n&&i<agents.length;i++){
    out.push(agents[i].agente||agents[i].nombre||'');
  }
  return out.filter(Boolean);
}

function getEPP(a){
  if(a.control&&a.control.epp) return a.control.epp;
  return [];
}

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function captureSVGAsPNG(callback){
  var el=document.querySelector('#svgwrap svg');
  if(!el){callback(null);return;}
  var clone=el.cloneNode(true);
  clone.setAttribute('width','3264');
  clone.setAttribute('height','2112');
  if(!clone.getAttribute('viewBox')) clone.setAttribute('viewBox','0 0 1632 1056');
  var xml=new XMLSerializer().serializeToString(clone);
  var img=new Image();
  img.onload=function(){
    var cv=document.createElement('canvas');
    cv.width=3264;cv.height=2112;
    var ctx=cv.getContext('2d');
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,cv.width,cv.height);
    ctx.drawImage(img,0,0,cv.width,cv.height);
    callback(cv.toDataURL('image/png'));
  };
  img.onerror=function(){callback(null);};
  img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(xml)));
}

function buildRows(list){
  var sorted=list.slice().sort(function(x,y){return y.bio.indice-x.bio.indice;});
  var r='';
  sorted.forEach(function(a){
    var s=a.bio;
    var cls=s.clasificacion;
    var hot=isHotspot(a);
    var ag=getAgents(a,2);
    var epp=getEPP(a).slice(0,2);
    var ev=a.evaluacion||{};
    var pts=ev.puntos_muestreo?ev.puntos_muestreo.length:0;
    r+='<tr>';
    r+='<td>'+esc(a.area_id)+'</td>';
    r+='<td>'+esc(a.nombre_area)+'</td>';
    r+='<td class="c">GR'+a.gr+'</td>';
    r+='<td class="c" style="font-weight:700">'+s.indice.toFixed(2)+'</td>';
    r+='<td class="c" style="background:'+CLAS_BG[cls]+';color:'+CLAS_COLORS[cls]+';font-weight:700">'+cls+(hot?' ◆':'')+'</td>';
    r+='<td class="c">'+pts+'</td>';
    r+='<td class="c">'+FREQ[cls]+'</td>';
    r+='<td>'+esc(ag.join(', ')||'—')+'</td>';
    r+='<td>'+esc(epp.join(', ')||'—')+'</td>';
    r+='</tr>';
  });
  return r;
}

function exportPlanoEjecutivo(level){
  var areas=AREAS.filter(function(a){return a.nivel===level;});
  if(!areas.length){alert('No hay áreas para '+level);return;}
  areas.forEach(recalcBio);

  var levelName=LEVELS[level]||level;
  var today=new Date().toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'});
  var cnt={Critico:0,Alto:0,Medio:0,Bajo:0};
  areas.forEach(function(a){cnt[a.bio.clasificacion]++;});
  var isPreliminar=areas.some(function(a){return a.estatus==='Preliminar';});
  var badge=isPreliminar?'PRELIMINAR':'VALIDADO';
  var hotCount=areas.filter(isHotspot).length;

  captureSVGAsPNG(function(png){
    var planoHTML=png
      ? '<img src="'+png+'" style="width:100%;height:100%;object-fit:contain">'
      : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:16px;text-align:center;padding:2cm">No se pudo capturar el plano.<br>Active los marcadores y la nube de riesgo antes de exportar.</div>';

    var html='<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Plano Ejecutivo — '+esc(levelName)+' — HSDA</title>';
    html+='<style>';
    html+='@page{size:90cm 60cm landscape;margin:0.8cm}';
    html+='*{box-sizing:border-box;margin:0;padding:0}';
    html+='body{font-family:"Segoe UI",Arial,sans-serif;color:#1a1a1a;background:#fff}';
    html+='.page{width:90cm;height:60cm;position:relative;overflow:hidden}';

    // HEADER
    html+='.hdr{position:absolute;top:0;left:0;right:0;height:2.8cm;background:#0f2a56;color:#fff;padding:0.4cm 0.8cm;display:flex;align-items:center;justify-content:space-between}';
    html+='.hdr h1{font-size:16px;font-weight:700;letter-spacing:.02em}';
    html+='.hdr .sub{font-size:10px;opacity:.85;margin-top:2px}';
    html+='.hdr .legal{font-size:8px;opacity:.6;margin-top:1px}';
    html+='.hdr .right{text-align:right;font-size:10px}';
    html+='.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:700}';
    html+='.badge-p{background:#f59e0b;color:#1a1a1a}';
    html+='.badge-v{background:#22c55e;color:#fff}';

    // PLANO (left)
    html+='.plano{position:absolute;top:3.1cm;left:0.5cm;width:55cm;height:50.5cm;border:1px solid #cbd5e1;border-radius:4px;overflow:hidden;background:#fff}';

    // RIGHT COLUMN
    html+='.right{position:absolute;top:3.1cm;left:56.3cm;right:0.5cm;height:50.5cm;overflow:hidden}';

    // KPIs
    html+='.kpi{display:flex;gap:4px;margin-bottom:0.3cm}';
    html+='.kpi div{flex:1;text-align:center;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:4px 2px}';
    html+='.kpi b{display:block;font-size:14px;color:#0f2a56}';
    html+='.kpi span{font-size:7px;color:#64748b;text-transform:uppercase}';

    // LEGENDS
    html+='.leg{display:grid;grid-template-columns:1fr 1fr;gap:0.2cm;margin-bottom:0.3cm}';
    html+='.leg-box{border:1px solid #e2e8f0;border-radius:4px;padding:0.2cm 0.3cm;background:#f8fafc}';
    html+='.leg-box h3{font-size:8px;color:#0f2a56;text-transform:uppercase;letter-spacing:.04em;margin-bottom:0.1cm;border-bottom:1px solid #e2e8f0;padding-bottom:0.08cm}';
    html+='.leg-row{display:flex;align-items:center;gap:5px;margin:1.5px 0;font-size:8px}';
    html+='.sw{width:12px;height:12px;border-radius:2px;border:1px solid rgba(0,0,0,.12);flex-shrink:0}';
    html+='.formula{font-size:7px;color:#64748b;background:#f1f5f9;padding:2px 5px;border-radius:2px;margin-top:3px;font-family:monospace}';

    // TABLE
    html+='.tbl-wrap{height:28cm;overflow-y:auto;border:1px solid #e2e8f0;border-radius:4px}';
    html+='.tbl{width:100%;border-collapse:collapse;font-size:7.5px}';
    html+='.tbl th{background:#0f2a56;color:#fff;font-size:7px;font-weight:600;text-transform:uppercase;padding:3px 4px;text-align:left;position:sticky;top:0;white-space:nowrap}';
    html+='.tbl td{padding:2px 4px;border-bottom:1px solid #f1f5f9;vertical-align:top}';
    html+='.tbl tr:nth-child(even){background:#f8fafc}';
    html+='.c{text-align:center}';

    // MEDIA TABLE (bottom)
    html+='.media{position:absolute;bottom:3.1cm;left:0.5cm;right:0.5cm;height:5.2cm}';
    html+='.media-tbl{width:100%;border-collapse:collapse;font-size:8px}';
    html+='.media-tbl th{background:#1e3a6e;color:#fff;font-size:7.5px;font-weight:600;padding:3px 5px;text-align:left}';
    html+='.media-tbl td{padding:2px 5px;border-bottom:1px solid #e2e8f0}';
    html+='.media-tbl tr:nth-child(even){background:#f0f4f8}';

    // FOOTER
    html+='.ftr{position:absolute;bottom:0;left:0;right:0;height:2.8cm;background:#f1f5f9;border-top:2px solid #0f2a56;padding:0.3cm 0.8cm;display:flex;align-items:center;justify-content:space-between}';
    html+='.ftr .left-f{font-size:8px;color:#64748b;max-width:55%}';
    html+='.sigs{display:flex;gap:2cm}';
    html+='.sig{text-align:center;font-size:8px}';
    html+='.sig-line{width:5cm;border-bottom:1px solid #1a1a1a;margin-top:0.5cm;margin-bottom:2px}';

    html+='@media print{.page{page-break-after:always}}';
    html+='</style></head><body><div class="page">';

    // HEADER
    html+='<div class="hdr"><div>';
    html+='<h1>MAPA DE CALOR HOSPITALARIO — EXPOSICIÓN OCUPACIONAL</h1>';
    html+='<div class="sub">Hospital San Diego de Alcalá · '+esc(levelName)+' · Estudio de Contaminantes Biológicos</div>';
    html+='<div class="legal">Fundamento: Art. 132 LFT · Art. 41 RFSST · OMS Manual de Bioseguridad 3ª ed. · NOM-048-SSA1-1993</div>';
    html+='</div><div class="right">';
    html+='<div>Generado: '+today+'</div>';
    html+='<span class="badge '+(isPreliminar?'badge-p':'badge-v')+'">'+badge+'</span>';
    html+='</div></div>';

    // PLANO
    html+='<div class="plano">'+planoHTML+'</div>';

    // RIGHT COLUMN
    html+='<div class="right">';

    // KPIs
    html+='<div class="kpi">';
    html+='<div><b>'+areas.length+'</b><span>Total áreas</span></div>';
    html+='<div><b>'+cnt.Critico+'</b><span>Crítico</span></div>';
    html+='<div><b>'+cnt.Alto+'</b><span>Alto</span></div>';
    html+='<div><b>'+cnt.Medio+'</b><span>Medio</span></div>';
    html+='<div><b>'+cnt.Bajo+'</b><span>Bajo</span></div>';
    html+='<div><b>'+hotCount+'</b><span>Hotspots</span></div>';
    html+='</div>';

    // LEGENDS
    html+='<div class="leg">';

    // Risk legend
    html+='<div class="leg-box"><h3>Leyenda de Riesgo</h3>';
    html+='<div class="leg-row"><span class="sw" style="background:#dc2626"></span>Crítico (4.0–5.0)</div>';
    html+='<div class="leg-row"><span class="sw" style="background:#ea580c"></span>Alto (3.0–3.9)</div>';
    html+='<div class="leg-row"><span class="sw" style="background:#ca8a04"></span>Medio (2.0–2.9)</div>';
    html+='<div class="leg-row"><span class="sw" style="background:#65a30d"></span>Bajo (1.0–1.9)</div>';
    html+='<div class="formula">índice = ocup·0.15 + interrel·0.15 + biol·0.20 + infec·0.15 + quím·0.15 + fís·0.10 + incid·0.10 − (ctrl−1)·0.10</div>';
    html+='</div>';

    // Sampling legend
    html+='<div class="leg-box"><h3>Puntos de Muestreo</h3>';
    html+='<div class="leg-row"><span style="font-size:12px">○</span> Aire (volumétrico)</div>';
    html+='<div class="leg-row"><span style="font-size:12px">□</span> Superficie (RODAC/hisopo)</div>';
    html+='<div class="leg-row"><span style="font-size:12px">▽</span> Agua/biofilm</div>';
    html+='<div style="margin-top:2px;font-size:7px;color:#64748b">Colores por placa:</div>';
    html+='<div class="leg-row"><span class="sw" style="background:#3b82f6"></span>TSA</div>';
    html+='<div class="leg-row"><span class="sw" style="background:#8b5cf6"></span>Sabouraud</div>';
    html+='<div class="leg-row"><span class="sw" style="background:#f97316"></span>MacConkey</div>';
    html+='<div class="leg-row"><span class="sw" style="background:#ef4444"></span>BCYE</div>';
    html+='</div>';

    // GR legend
    html+='<div class="leg-box"><h3>Grupos de Riesgo (OMS)</h3>';
    html+='<div style="font-size:8px"><div style="margin:1px 0"><b>GR1:</b> Riesgo escaso/nulo</div>';
    html+='<div style="margin:1px 0"><b>GR2:</b> Riesgo moderado</div>';
    html+='<div style="margin:1px 0"><b>GR3:</b> Riesgo individual elevado</div>';
    html+='<div style="margin:1px 0"><b>GR4:</b> Riesgo individual y poblacional elevado</div></div></div>';

    // Nomenclature
    html+='<div class="leg-box"><h3>Nomenclatura</h3>';
    html+='<div style="font-size:8px"><div style="margin:1px 0"><b>ID:</b> NIVEL-NN</div>';
    html+='<div style="margin:1px 0"><b>◆ Hotspot:</b> aerosoles≥4 AND interrelación≥4</div>';
    html+='<div style="margin:1px 0"><b>Frecuencia:</b> Crítico→Quincenal · Alto→Mensual · Medio→Trimestral · Bajo→Semestral</div></div></div>';

    html+='</div>'; // leg grid

    // TABLE
    html+='<div class="tbl-wrap"><table class="tbl"><thead><tr>';
    html+='<th>ID</th><th>Área</th><th>GR</th><th>Índice</th><th>Clasif.</th><th>Puntos</th><th>Frec.</th><th>Agentes</th><th>EPP</th>';
    html+='</tr></thead><tbody>'+buildRows(areas)+'</tbody></table></div>';

    html+='</div>'; // right

    // CULTURE MEDIA
    html+='<div class="media"><table class="media-tbl">';
    html+='<thead><tr><th style="width:10%">Medio</th><th style="width:45%">Uso</th><th style="width:25%">Incubación</th><th style="width:20%">Método</th></tr></thead><tbody>';
    html+='<tr><td><b>TSA</b></td><td>Bacterias (recuento general)</td><td>35–37°C 24–48h</td><td>Aire volumétrico / sedimentación</td></tr>';
    html+='<tr><td><b>Sabouraud</b></td><td>Hongos y levaduras</td><td>25–30°C 3–7d</td><td>Aire / superficie</td></tr>';
    html+='<tr><td><b>PDA</b></td><td>Mohos filamentosos</td><td>25–30°C 3–7d</td><td>Aire / superficie</td></tr>';
    html+='<tr><td><b>Agar sangre</b></td><td>Hemólisis (Streptococcus, S. aureus)</td><td>35–37°C 24–48h</td><td>Superficie</td></tr>';
    html+='<tr><td><b>MacConkey</b></td><td>Gram-negativos entéricos</td><td>35–37°C 24–48h</td><td>Superficie</td></tr>';
    html+='<tr><td><b>BCYE</b></td><td>Legionella (agua/condensados)</td><td>35°C 3–10d</td><td>Agua/biofilm HVAC</td></tr>';
    html+='<tr><td><b>RODAC/hisopo</b></td><td>Superficies (recuento por área)</td><td>Según medio</td><td>Contacto directo</td></tr>';
    html+='</tbody></table></div>';

    // FOOTER
    html+='<div class="ftr"><div class="left-f">';
    html+='<div style="font-weight:600;color:#475569;margin-bottom:2px">Documento preliminar · Requiere validación con jefaturas, UVEH, mantenimiento y limpieza</div>';
    html+='<div>Los datos de muestreo deben ser validados por laboratorio acreditado EMA/STPS</div>';
    html+='<div style="margin-top:2px;font-size:7px;color:#94a3b8">Art. 132 LFT · Art. 41 RFSST · NOM-048-SSA1-1993 · OMS Manual de Bioseguridad 3ª ed.</div>';
    html+='</div><div class="sigs">';
    html+='<div class="sig"><div class="sig-line"></div>Elaboró</div>';
    html+='<div class="sig"><div class="sig-line"></div>Revisó</div>';
    html+='<div class="sig"><div class="sig-line"></div>Vo.Bo.</div>';
    html+='</div></div>';

    html+='</div></body></html>';

    var w=window.open('','_blank');
    if(w){
      w.document.write(html);
      w.document.close();
      setTimeout(function(){try{w.print();}catch(e){}},800);
    } else {
      alert('No se pudo abrir la ventana. Permita ventanas emergentes.');
    }
  });
}

window.PlanoEjecutivo={exportPlanoEjecutivo:exportPlanoEjecutivo};
})();
