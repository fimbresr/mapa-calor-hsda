(function attachRiskCloud(global) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CLOUD_RADIUS = 76;
  const CLOUD_OPACITY = 0.34;

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

  function render(svg, areas, scoreKey, classOn, enabled) {
    const layer = ensureLayer(svg);
    layer.replaceChildren();
    buildEntries(areas, scoreKey, classOn, enabled).forEach(({ area, score }) => {
      const halo = document.createElementNS(SVG_NS, 'circle');
      halo.setAttribute('cx', area.x);
      halo.setAttribute('cy', area.y);
      halo.setAttribute('r', area.geo_aprox ? CLOUD_RADIUS + 12 : CLOUD_RADIUS);
      halo.setAttribute('fill', score.color);
      halo.setAttribute('fill-opacity', CLOUD_OPACITY);
      halo.setAttribute('filter', 'url(#risk-cloud-blur)');
      layer.appendChild(halo);
    });
  }

  global.RiskCloud = { buildEntries, render };
})(window);
