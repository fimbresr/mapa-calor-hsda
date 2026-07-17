(function(){
'use strict';

const FREQ={Critico:'Quincenal',Alto:'Mensual',Medio:'Trimestral',Bajo:'Semestral'};
const FREQ_DIAS={Critico:15,Alto:30,Medio:90,Bajo:180};

function esc(t){return '"'+String(t==null?'':t).replace(/"/g,'""')+'"';}
function join(arr,sep){return (arr||[]).join(sep||'; ');}
function isHotspot(a){return a.bio.aerosoles>=4 && a.bio.interrelacion>=4;}

function getAgents(a,n){
  var agents=a.reconocimiento?a.reconocimiento.agentes_biologicos||[]:[];
  var out=[];
  for(var i=0;i<n;i++){
    var ag=agents[i];
    out.push(ag?ag.agente:'');
    out.push(ag?ag.familia||'':'');
    out.push(ag?ag.riesgo||'':'');
    out.push(ag?'':'');
  }
  return out;
}

function exportSTPSCSV(){
  var list=AREAS;
  var hdr=[
    'area_id','nivel','nombre_area','categoria','arquetipo','grupo_riesgo',
    'indice_bio','clasificacion','estatus',
    'agente_1','agente_1_tipo','agente_1_via','agente_1_fuente',
    'agente_2','agente_2_tipo','agente_2_via','agente_2_fuente',
    'agente_3','agente_3_tipo','agente_3_via','agente_3_fuente',
    'vias_exposicion','fuentes_emision','tiempo_exposicion',
    'puntos_muestreo_count','frecuencia','frecuencia_dias',
    'medios_cultivo','tipo_muestreo',
    'metodo_muestreo','incubacion','exposicion',
    'buscar','significado',
    'epp','medidas_ingenieria','senalizacion','acceso_restringido'
  ];
  var rows=[hdr.join(',')];

  list.forEach(function(a){
    var rec=a.reconocimiento||{};
    var ev=a.evaluacion||{};
    var ctrl=a.control||{};
    var agents=rec.agentes_biologicos||[];
    var vias=rec.vias_exposicion||[];
    var puntos=ev.puntos_muestreo||[];
    var freqDias=ev.frecuencia_dias||FREQ_DIAS[a.bio.clasificacion]||'';
    var freqLabel=ev.frecuencia_label||FREQ[a.bio.clasificacion]||'';

    var agentRows=[];
    for(var i=0;i<3;i++){
      var ag=agents[i];
      if(ag){
        agentRows.push(esc(ag.agente),esc(ag.familia||''),esc(ag.riesgo||''),esc(ag.via||'Inhalación; Contacto'));
      } else {
        agentRows.push('','','','');
      }
    }

    var row=[
      esc(a.area_id),esc(a.nivel),esc(a.nombre_area),esc(a.categoria),esc(a.arquetipo),
      esc(a.gr_label),
      a.bio.indice.toFixed(2),esc(a.bio.clasificacion),esc(a.estatus)
    ].concat(agentRows).concat([
      esc(join(vias)),
      esc(join(rec.grupos_expuestos)),
      esc(freqLabel),
      puntos.length,
      esc(freqLabel),freqDias,
      esc(join(ev.medios_cultivo)),
      esc(a.muestreo?a.muestreo.tipo:''),
      esc(a.muestreo?a.muestreo.tipo:''),
      esc(a.muestreo?a.muestreo.incubacion:''),
      esc(a.muestreo?a.muestreo.exposicion:''),
      esc(a.micro?a.micro.buscar:''),
      esc(a.micro?a.micro.significado:''),
      esc(join(ctrl.epp)),
      esc(join(ctrl.medidas_ingenieria)),
      esc(join(ctrl.senalizacion)),
      esc(ctrl.acceso_restringido?join(ctrl.acceso_restringido):'')
    ]);
    rows.push(row.join(','));
  });

  download('reporte_stps_HSDA.csv','\uFEFF'+rows.join('\n'),'text/csv');
}

function exportPlanAnualSTPS(){
  var list=AREAS.slice();
  list.forEach(function(a){
    var s=a.bio;
    var x=s.ocupacion*0.10+s.contacto_paciente*0.15+s.sangre_fluidos*0.15+s.procedimientos*0.10+s.rpbi*0.15+s.muestras_biologicas*0.10+s.aerosoles*0.10+s.interrelacion*0.10+s.incidentes*0.10-(s.controles-1)*0.10;
    x=Math.max(1,Math.min(5,Math.round(x*100)/100));
    s.indice=x;
  });
  list.sort(function(x,y){return y.bio.indice-x.bio.indice;});

  var hdr=[
    'prioridad','area_id','nivel','nombre_area','grupo_riesgo','indice_bio',
    'clasificacion','hotspot','frecuencia','frecuencia_dias',
    'puntos_count','placas_por_visita','total_placas_anio',
    'medios_cultivo','agentes_principales'
  ];
  var rows=[hdr.join(',')];

  list.forEach(function(a,i){
    var ev=a.evaluacion||{};
    var puntos=ev.puntos_muestreo||[];
    var freqDias=ev.frecuencia_dias||FREQ_DIAS[a.bio.clasificacion]||180;
    var medios=ev.medios_cultivo||[];
    var placasVisita=puntos.length*medios.length;
    var totalPlacas=Math.round(puntos.length*(365/freqDias));
    var agents=(a.reconocimiento?a.reconocimiento.agentes_biologicos||[]:[]).map(function(ag){return ag.agente;}).slice(0,3);

    var row=[
      i+1,
      esc(a.area_id),esc(a.nivel),esc(a.nombre_area),esc(a.gr_label),
      a.bio.indice.toFixed(2),
      esc(a.bio.clasificacion),
      isHotspot(a)?'SI':'no',
      esc(FREQ[a.bio.clasificacion]||''),
      freqDias,
      puntos.length,
      placasVisita,
      totalPlacas,
      esc(join(medios)),
      esc(join(agents))
    ];
    rows.push(row.join(','));
  });

  download('plan_anual_stps_HSDA.csv','\uFEFF'+rows.join('\n'),'text/csv');
}

function exportSTPSPDF(){
  var list=AREAS.slice();
  list.forEach(function(a){
    var s=a.bio;
    var x=s.ocupacion*0.10+s.contacto_paciente*0.15+s.sangre_fluidos*0.15+s.procedimientos*0.10+s.rpbi*0.15+s.muestras_biologicas*0.10+s.aerosoles*0.10+s.interrelacion*0.10+s.incidentes*0.10-(s.controles-1)*0.10;
    x=Math.max(1,Math.min(5,Math.round(x*100)/100));
    s.indice=x;
    var C=x>=4?['Critico','#991b1b']:x>=3?['Alto','#c2410c']:x>=2?['Medio','#a16207']:['Bajo','#3f6212'];
    s.clasificacion=C[0];s.borde=C[1];
  });
  list.sort(function(x,y){return y.bio.indice-x.bio.indice;});

  var cnt={Critico:0,Alto:0,Medio:0,Bajo:0};
  list.forEach(function(a){cnt[a.bio.clasificacion]++;});
  var niveles={};
  list.forEach(function(a){
    if(!niveles[a.nivel])niveles[a.nivel]={total:0,Critico:0,Alto:0,Medio:0,Bajo:0,hotspots:0,puntos:0};
    var n=niveles[a.nivel];
    n.total++;
    n[a.bio.clasificacion]++;
    if(isHotspot(a))n.hotspots++;
    n.puntos+=(a.evaluacion?a.evaluacion.puntos_muestreo||[]:[]).length;
  });

  var today=new Date().toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'});

  var html='<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Estudio de Contaminantes Biológicos — HSDA</title>';
  html+='<style>';
  html+='@page{size:letter;margin:1.5cm}';
  html+='body{font-family:"Segoe UI",Arial,sans-serif;font-size:10px;color:#1a1a1a;line-height:1.4;margin:0;padding:20px}';
  html+='h1{font-size:14px;text-align:center;margin:0 0 4px;color:#0f2a56}';
  html+='h2{font-size:12px;color:#0f2a56;margin:16px 0 6px;border-bottom:1.5px solid #0f2a56;padding-bottom:2px}';
  html+='h3{font-size:11px;color:#334155;margin:12px 0 4px}';
  html+='.header{text-align:center;border-bottom:2px solid #0f2a56;padding-bottom:8px;margin-bottom:12px}';
  html+='.header .sub{font-size:10px;color:#475569}';
  html+='.legal{font-size:9px;color:#475569;margin:4px 0 12px;text-align:center}';
  html+='table{width:100%;border-collapse:collapse;margin:6px 0;font-size:9px}';
  html+='th,td{border:1px solid #cbd5e1;padding:3px 5px;text-align:left;vertical-align:top}';
  html+='th{background:#0f2a56;color:#fff;font-weight:600;font-size:8.5px;text-transform:uppercase}';
  html+='tr:nth-child(even){background:#f8fafc}';
  html+='.crit{color:#991b1b;font-weight:700}.alto{color:#c2410c;font-weight:700}';
  html+='.med{color:#a16207}.baj{color:#3f6212}';
  html+='.kpi-box{display:flex;gap:8px;justify-content:center;margin:8px 0}';
  html+='.kpi-box div{background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:6px 12px;text-align:center;min-width:80px}';
  html+='.kpi-box b{display:block;font-size:16px;color:#0f2a56}';
  html+='.kpi-box span{font-size:8px;color:#64748b}';
  html+='.sign{margin-top:40px;display:flex;justify-content:space-between;gap:40px}';
  html+='.sign div{flex:1;text-align:center;border-top:1px solid #1a1a1a;padding-top:4px;font-size:9px}';
  html+='.page-break{page-break-before:always}';
  html+='@media print{body{padding:0}.page-break{page-break-before:always}}';
  html+='</style></head><body>';

  html+='<div class="header">';
  html+='<h1>ESTUDIO DE CONTAMINANTES BIOLÓGICOS DEL AMBIENTE LABORAL</h1>';
  html+='<div class="sub">Hospital San Diego de Alcalá — HSDA</div>';
  html+='<div class="sub">Fecha de elaboración: '+today+'</div>';
  html+='<div class="sub">Responsable del estudio: ____________________________</div>';
  html+='</div>';
  html+='<div class="legal">Fundamento legal: Art. 132 (I, XVII) y 512-D de la Ley Federal del Trabajo · Art. 41 del Reglamento Federal de Seguridad y Salud en el Trabajo · NOM-048-SSA1-1993 · Manual de Bioseguridad OMS 3ª ed./2020</div>';

  html+='<div class="kpi-box">';
  html+='<div><b>'+list.length+'</b><span>Áreas evaluadas</span></div>';
  html+='<div><b>'+cnt.Critico+'</b><span>Crítico</span></div>';
  html+='<div><b>'+cnt.Alto+'</b><span>Alto</span></div>';
  html+='<div><b>'+cnt.Medio+'</b><span>Medio</span></div>';
  html+='<div><b>'+cnt.Bajo+'</b><span>Bajo</span></div>';
  html+='</div>';

  html+='<h2>1. Resumen por nivel</h2>';
  html+='<table><tr><th>Nivel</th><th>Total áreas</th><th>Crítico</th><th>Alto</th><th>Medio</th><th>Bajo</th><th>Hotspots</th><th>Puntos muestreo</th></tr>';
  Object.keys(niveles).sort().forEach(function(k){
    var n=niveles[k];
    html+='<tr><td>'+k+'</td><td>'+n.total+'</td><td class="crit">'+n.Critico+'</td><td class="alto">'+n.Alto+'</td><td class="med">'+n.Medio+'</td><td class="baj">'+n.Bajo+'</td><td>'+n.hotspots+'</td><td>'+n.puntos+'</td></tr>';
  });
  html+='</table>';

  html+='<h2>2. Plan anual de muestreo (ordenado por prioridad)</h2>';
  html+='<table><tr><th>#</th><th>ID</th><th>Nivel</th><th>Área</th><th>GR</th><th>Índice</th><th>Clasif.</th><th>Hotspot</th><th>Frecuencia</th><th>Puntos</th><th>Placas/año</th><th>Medios</th></tr>';
  list.forEach(function(a,i){
    var ev=a.evaluacion||{};
    var puntos=ev.puntos_muestreo||[];
    var freqDias=ev.frecuencia_dias||FREQ_DIAS[a.bio.clasificacion]||180;
    var totalPlacas=Math.round(puntos.length*(365/freqDias));
    var cls=a.bio.clasificacion;
    var clsClass=cls==='Critico'?'crit':cls==='Alto'?'alto':cls==='Medio'?'med':'baj';
    html+='<tr><td>'+(i+1)+'</td><td>'+a.area_id+'</td><td>'+a.nivel+'</td><td>'+a.nombre_area+'</td><td>'+a.gr_label+'</td>';
    html+='<td>'+a.bio.indice.toFixed(2)+'</td><td class="'+clsClass+'">'+cls+'</td>';
    html+='<td>'+(isHotspot(a)?'◆':'')+'</td>';
    html+='<td>'+(FREQ[cls]||'')+'</td><td>'+puntos.length+'</td><td>'+totalPlacas+'</td>';
    html+='<td>'+(ev.medios_cultivo||[]).join(', ')+'</td></tr>';
  });
  html+='</table>';

  html+='<div class="page-break"></div>';
  html+='<h2>3. Ficha técnica por área</h2>';

  list.forEach(function(a){
    var rec=a.reconocimiento||{};
    var ev=a.evaluacion||{};
    var ctrl=a.control||{};
    var agents=rec.agentes_biologicos||[];
    var vias=rec.vias_exposicion||[];
    var puntos=ev.puntos_muestreo||[];
    var cls=a.bio.clasificacion;
    var clsClass=cls==='Critico'?'crit':cls==='Alto'?'alto':cls==='Medio'?'med':'baj';

    html+='<h3>'+a.area_id+' — '+a.nombre_area+'</h3>';
    html+='<table>';
    html+='<tr><td style="width:25%"><b>Ubicación</b></td><td>'+a.nivel+' · '+a.categoria+' · '+a.arquetipo+'</td></tr>';
    html+='<tr><td><b>Grupo de riesgo</b></td><td>'+a.gr_label+'</td></tr>';
    html+='<tr><td><b>Índice biológico</b></td><td class="'+clsClass+'">'+a.bio.indice.toFixed(2)+' — '+cls+'</td></tr>';
    html+='<tr><td><b>Hotspot</b></td><td>'+(isHotspot(a)?'SÍ — Muestreo prioritario':'No')+'</td></tr>';
    html+='<tr><td><b>Estatus</b></td><td>'+a.estatus+'</td></tr>';
    html+='<tr><td><b>Frecuencia de muestreo</b></td><td>'+(ev.frecuencia_label||FREQ[cls]||'')+' ('+(ev.frecuencia_dias||FREQ_DIAS[cls]||'')+' días)</td></tr>';
    html+='<tr><td><b>Puntos de muestreo</b></td><td>'+puntos.length+' — '+puntos.map(function(p){return p.id+': '+p.tipo+' ('+p.descripcion+')';}).join('; ')+'</td></tr>';
    html+='<tr><td><b>Tipo de muestreo</b></td><td>'+(a.muestreo?a.muestreo.tipo:'')+'</td></tr>';
    html+='<tr><td><b>Medios de cultivo</b></td><td>'+(ev.medios_cultivo||[]).join(', ')+'</td></tr>';
    html+='<tr><td><b>Incubación</b></td><td>'+(a.muestreo?a.muestreo.incubacion:'')+'</td></tr>';
    html+='<tr><td><b>Exposición</b></td><td>'+(a.muestreo?a.muestreo.exposicion:'')+'</td></tr>';
    html+='<tr><td><b>Agentes biológicos</b></td><td>'+agents.map(function(ag){return ag.agente+' ('+ag.familia+', riesgo '+ag.riesgo+')';}).join('<br>')+'</td></tr>';
    html+='<tr><td><b>Vías de exposición</b></td><td>'+vias.join('<br>')+'</td></tr>';
    html+='<tr><td><b>Grupos expuestos</b></td><td>'+(rec.grupos_expuestos||[]).join(', ')+'</td></tr>';
    html+='<tr><td><b>Qué buscar</b></td><td>'+(a.micro?a.micro.buscar:'')+'</td></tr>';
    html+='<tr><td><b>Significado clínico</b></td><td>'+(a.micro?a.micro.significado:'')+'</td></tr>';
    html+='<tr><td><b>EPP</b></td><td>'+(ctrl.epp||[]).join(', ')+'</td></tr>';
    html+='<tr><td><b>Medidas de ingeniería</b></td><td>'+(ctrl.medidas_ingenieria||[]).join(', ')+'</td></tr>';
    html+='<tr><td><b>Señalización</b></td><td>'+(ctrl.senalizacion||[]).join(', ')+'</td></tr>';
    html+='</table>';
  });

  html+='<div class="page-break"></div>';
  html+='<h2>4. Firmas y aprobación</h2>';
  html+='<p style="font-size:9px;color:#475569">El presente estudio de contaminantes biológicos del ambiente laboral se realizó conforme a los artículos 132 (I, XVII) y 512-D de la Ley Federal del Trabajo, y el artículo 41 del Reglamento Federal de Seguridad y Salud en el Trabajo.</p>';

  html+='<div class="sign">';
  html+='<div><br><br>Elaboró<br><b>Nombre:</b> ________________<br><b>Cédula:</b> ________________<br><b>Fecha:</b> ________________</div>';
  html+='<div><br><br>Revisó<br><b>Nombre:</b> ________________<br><b>Cédula:</b> ________________<br><b>Fecha:</b> ________________</div>';
  html+='<div><br><br>Autorizó<br><b>Nombre:</b> ________________<br><b>Cargo:</b> ________________<br><b>Fecha:</b> ________________</div>';
  html+='</div>';

  html+='<div style="margin-top:30px;text-align:center;font-size:8px;color:#94a3b8">Documento preliminar — Mapa de Calor Hospitalario HSDA v1.0 — Generado '+today+'</div>';
  html+='</body></html>';

  var w=window.open('','_blank');
  if(w){
    w.document.write(html);
    w.document.close();
  } else {
    alert('No se pudo abrir la ventana. Permita ventanas emergentes para este sitio.');
  }
}

window.STPSReport={
  exportSTPSCSV:exportSTPSCSV,
  exportPlanAnualSTPS:exportPlanAnualSTPS,
  exportSTPSPDF:exportSTPSPDF
};
})();
