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

  function regionRadius(area) {
    return area.geo_aprox ? CLOUD_RADIUS + 12 : CLOUD_RADIUS;
  }

  function intersects(first, second) {
    return Math.hypot(first.area.x - second.area.x, first.area.y - second.area.y) <=
      regionRadius(first.area) + regionRadius(second.area);
  }

  function buildRegions(entries) {
    const pending = entries.slice();
    const regions = [];

    while (pending.length) {
      const seed = pending.shift();
      const component = [seed];
      for (let cursor = 0; cursor < component.length; cursor += 1) {
        for (let index = pending.length - 1; index >= 0; index -= 1) {
          if (pending[index].score.clasificacion === seed.score.clasificacion && intersects(component[cursor], pending[index])) {
            component.push(pending.splice(index, 1)[0]);
          }
        }
      }

      const fallback = component.reduce((best, entry) => entry.score.indice > best.score.indice ? entry : best);
      const totalWeight = component.reduce((sum, entry) => sum + entry.score.indice * entry.score.indice, 0);
      const center = component.reduce((point, entry) => {
        const weight = entry.score.indice * entry.score.indice;
        return { x: point.x + entry.area.x * weight, y: point.y + entry.area.y * weight };
      }, { x: 0, y: 0 });
      center.x /= totalWeight;
      center.y /= totalWeight;
      const point = component.some((entry) => Math.hypot(center.x - entry.area.x, center.y - entry.area.y) <= regionRadius(entry.area))
        ? center
        : { x: fallback.area.x, y: fallback.area.y };
      regions.push({ classification: seed.score.clasificacion, entries: component, center, point, fallback });
    }

    return regions;
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

  function ensureRegionLayer(svg) {
    let layer = svg.querySelector('#risk-region-layer');
    if (!layer) {
      layer = document.createElementNS(SVG_NS, 'g');
      layer.id = 'risk-region-layer';
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

  function regionPath(region) {
    const padding = 18;
    const bounds = region.entries.reduce((box, entry) => {
      const radius = regionRadius(entry.area) + padding;
      return {
        left: Math.min(box.left, entry.area.x - radius),
        top: Math.min(box.top, entry.area.y - radius),
        right: Math.max(box.right, entry.area.x + radius),
        bottom: Math.max(box.bottom, entry.area.y + radius),
      };
    }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const corner = Math.min(32, (bounds.right - bounds.left) / 4, (bounds.bottom - bounds.top) / 4);
    return `M ${bounds.left + corner} ${bounds.top} H ${bounds.right - corner} Q ${bounds.right} ${bounds.top} ${bounds.right} ${bounds.top + corner} V ${bounds.bottom - corner} Q ${bounds.right} ${bounds.bottom} ${bounds.right - corner} ${bounds.bottom} H ${bounds.left + corner} Q ${bounds.left} ${bounds.bottom} ${bounds.left} ${bounds.bottom - corner} V ${bounds.top + corner} Q ${bounds.left} ${bounds.top} ${bounds.left + corner} ${bounds.top} Z`;
  }

  function renderRegions(svg, entries) {
    const layer = ensureRegionLayer(svg);
    layer.replaceChildren();
    buildRegions(entries).forEach((region) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', regionPath(region));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', CLOUD_COLORS[region.classification]);
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('stroke-dasharray', '8 6');
      layer.appendChild(path);

      const point = document.createElementNS(SVG_NS, 'circle');
      point.setAttribute('cx', region.point.x);
      point.setAttribute('cy', region.point.y);
      point.setAttribute('r', '10');
      point.setAttribute('fill', '#fff');
      point.setAttribute('stroke', CLOUD_COLORS[region.classification]);
      point.setAttribute('stroke-width', '3');
      layer.appendChild(point);

      const cross = document.createElementNS(SVG_NS, 'path');
      cross.setAttribute('d', `M ${region.point.x - 5} ${region.point.y} H ${region.point.x + 5} M ${region.point.x} ${region.point.y - 5} V ${region.point.y + 5}`);
      cross.setAttribute('stroke', CLOUD_COLORS[region.classification]);
      cross.setAttribute('stroke-width', '2');
      layer.appendChild(cross);
    });
  }

  function render(svg, areas, scoreKey, classOn, enabled) {
    const layer = ensureLayer(svg);
    layer.replaceChildren();
    const entries = buildEntries(areas, scoreKey, classOn, enabled);
    entries.forEach(({ area, score }) => {
      ensureGradient(svg, score.clasificacion);
      const halo = document.createElementNS(SVG_NS, 'circle');
      halo.setAttribute('cx', area.x);
      halo.setAttribute('cy', area.y);
      halo.setAttribute('r', area.geo_aprox ? CLOUD_RADIUS + 12 : CLOUD_RADIUS);
      halo.setAttribute('fill', `url(#risk-cloud-gradient-${score.clasificacion})`);
      layer.appendChild(halo);
    });
    renderRegions(svg, entries);
  }

  global.RiskCloud = { buildEntries, buildRegions, render };
})(window);
