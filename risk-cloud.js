(function attachRiskCloud(global) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CLOUD_RADIUS = 76;
  const CLOUD_COLORS = { Critico: '#ef4444', Alto: '#f97316', Medio: '#facc15', Bajo: '#84cc16' };

  function buildEntries(areas, scoreKey, classOn, enabled) {
    if (!enabled) return areas.slice(0, 0);
    return areas
      .map((area) => ({ area, score: area[scoreKey] }))
      .filter(({ score }) => classOn[score.clasificacion]);
  }

  function ensureLayer(svg) {
    let layer = svg.querySelector('#risk-cloud-layer');
    if (!layer) {
      layer = document.createElementNS(SVG_NS, 'g');
      layer.id = 'risk-cloud-layer';
      layer.setAttribute('pointer-events', 'none');
      const markerLayer = svg.querySelector('#heatmap-layer');
      svg.insertBefore(layer, markerLayer || null);
    }
    return layer;
  }

  function ensureGradient(svg, classification) {
    const id = `risk-cloud-gradient-${classification}`;
    if (svg.querySelector(`#${id}`)) return;

    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS(SVG_NS, 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }

    const gradient = document.createElementNS(SVG_NS, 'radialGradient');
    gradient.id = id;
    [['0%', '0.42'], ['55%', '0.16'], ['100%', '0']].forEach(([offset, opacity]) => {
      const stop = document.createElementNS(SVG_NS, 'stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', CLOUD_COLORS[classification]);
      stop.setAttribute('stop-opacity', opacity);
      gradient.appendChild(stop);
    });
    defs.appendChild(gradient);
  }

  function render(svg, areas, scoreKey, classOn, enabled) {
    const layer = ensureLayer(svg);
    layer.replaceChildren();
    buildEntries(areas, scoreKey, classOn, enabled).forEach(({ area, score }) => {
      ensureGradient(svg, score.clasificacion);
      const halo = document.createElementNS(SVG_NS, 'circle');
      halo.setAttribute('cx', area.x);
      halo.setAttribute('cy', area.y);
      halo.setAttribute('r', area.geo_aprox ? CLOUD_RADIUS + 12 : CLOUD_RADIUS);
      halo.setAttribute('fill', `url(#risk-cloud-gradient-${score.clasificacion})`);
      layer.appendChild(halo);
    });
  }

  global.RiskCloud = { buildEntries, render };
})(window);
