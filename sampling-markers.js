(function attachSamplingMarkers(global) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const R = 8;
  const TIPO_SHAPES = {aire:'circle', superficie:'square', agua:'triangle'};
  const PLACA_COLORS = {TSA:'#3b82f6', Sabouraud:'#8b5cf6', MacConkey:'#f97316', BCYE:'#ef4444'};
  const DEFAULT_COLOR = '#6b7280';
  const TIPO_LABELS = {aire:'Aire', superficie:'Superficie', agua:'Agua'};

  function placaColor(placa) {
    if (!placa) return DEFAULT_COLOR;
    for (var k in PLACA_COLORS) {
      if (placa.indexOf(k) !== -1) return PLACA_COLORS[k];
    }
    return DEFAULT_COLOR;
  }

  function ensureLayer(svg) {
    var layer = svg.querySelector('#sampling-layer');
    if (!layer) {
      layer = document.createElementNS(SVG_NS, 'g');
      layer.id = 'sampling-layer';
      layer.setAttribute('pointer-events', 'none');
      svg.appendChild(layer);
    }
    return layer;
  }

  function drawMarker(g, pt, area) {
    var color = placaColor(pt.placa);
    var shape = TIPO_SHAPES[pt.tipo] || 'circle';
    var el;

    if (shape === 'circle') {
      el = document.createElementNS(SVG_NS, 'circle');
      el.setAttribute('cx', pt.gx);
      el.setAttribute('cy', pt.gy);
      el.setAttribute('r', R);
    } else if (shape === 'square') {
      el = document.createElementNS(SVG_NS, 'rect');
      el.setAttribute('x', pt.gx - R);
      el.setAttribute('y', pt.gy - R);
      el.setAttribute('width', R * 2);
      el.setAttribute('height', R * 2);
      el.setAttribute('rx', 2);
    } else {
      var s = R * 1.1;
      el = document.createElementNS(SVG_NS, 'polygon');
      el.setAttribute('points',
        pt.gx + ',' + (pt.gy - s) + ' ' +
        (pt.gx - s) + ',' + (pt.gy + s * 0.6) + ' ' +
        (pt.gx + s) + ',' + (pt.gy + s * 0.6));
    }

    el.setAttribute('fill', color);
    el.setAttribute('stroke', '#fff');
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('opacity', '0.9');
    el.setAttribute('pointer-events', 'all');
    el.style.cursor = 'pointer';
    g.appendChild(el);

    var label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', pt.gx);
    label.setAttribute('y', pt.gy + 3);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '7');
    label.setAttribute('font-weight', '700');
    label.setAttribute('fill', '#fff');
    label.setAttribute('paint-order', 'stroke');
    label.setAttribute('stroke', '#000');
    label.setAttribute('stroke-width', '2');
    label.setAttribute('pointer-events', 'none');
    label.setAttribute('font-family', 'Segoe UI, Arial, sans-serif');
    label.textContent = pt.id;
    g.appendChild(label);

    el.addEventListener('mouseenter', function(e) {
      var tipoLabel = TIPO_LABELS[pt.tipo] || pt.tipo;
      var lines = ['<b>' + area.nombre_area + '</b>'];
      lines.push('Punto: <b>' + pt.id + '</b>');
      if (pt.descripcion) lines.push(pt.descripcion);
      lines.push('Tipo: ' + tipoLabel);
      if (pt.metodo) lines.push('M\u00e9todo: ' + pt.metodo);
      if (pt.placa) lines.push('Placa: ' + pt.placa);

      var tp = document.getElementById('tooltip');
      if (tp) {
        tp.innerHTML = lines.join('<br>');
        tp.style.opacity = 1;
        tp.style.left = Math.min(e.clientX + 14, innerWidth - 260) + 'px';
        tp.style.top = (e.clientY + 14) + 'px';
      }
    });
    el.addEventListener('mousemove', function(e) {
      var tp = document.getElementById('tooltip');
      if (tp) {
        tp.style.left = Math.min(e.clientX + 14, innerWidth - 260) + 'px';
        tp.style.top = (e.clientY + 14) + 'px';
      }
    });
    el.addEventListener('mouseleave', function() {
      var tp = document.getElementById('tooltip');
      if (tp) tp.style.opacity = 0;
    });
  }

  function render(svg, areas, classOn, enabled) {
    var layer = ensureLayer(svg);
    layer.replaceChildren();
    if (!enabled) return;

    areas.forEach(function(area) {
      var ev = area.evaluacion;
      if (!ev || !ev.puntos_muestreo || !ev.puntos_muestreo.length) return;
      var s = area.bio || area.mf;
      if (s && classOn && !classOn[s.clasificacion]) return;

      ev.puntos_muestreo.forEach(function(pt) {
        var g = document.createElementNS(SVG_NS, 'g');
        drawMarker(g, pt, area);
        layer.appendChild(g);
      });
    });
  }

  global.SamplingMarkers = { render: render };
})(window);
