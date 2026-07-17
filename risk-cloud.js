(function attachRiskCloud(global) {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // --- Configuración del campo de calor ---
  const FIELD_CONFIG = {
    resolution: 0.35,        // píxeles del canvas por unidad del viewBox (0.35 = ~570×370 px)
    sigma: 80,               // dispersión gaussiana base (unidades viewBox)
    sigmaGeoApprox: 95,      // dispersión para áreas con geometría aproximada
    intensityScale: 1.0,     // multiplicador global de intensidad
    contourLevels: [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5],  // niveles de isopleta
    contourStrokeWidth: 0.8,
    blurPasses: 2,           // suavizado del campo
  };

  // Colores de los niveles de riesgo (RGBA para canvas)
  const RISK_STOPS = [
    { val: 1.0, r: 132, g: 204, b: 22 },   // Bajo - verde
    { val: 2.0, r: 132, g: 204, b: 22 },   // Bajo→Medio
    { val: 2.5, r: 250, g: 204, b: 21 },   // Medio - amarillo
    { val: 3.0, r: 250, g: 204, b: 21 },   // Medio→Alto
    { val: 3.5, r: 249, g: 115, b: 22 },   // Alto - naranja
    { val: 4.0, r: 239, g: 68, b: 68 },    // Crítico - rojo
    { val: 5.0, r: 239, g: 68, b: 68 },    // Crítico máximo
  ];

  // --- Utilidades de color ---
  function lerpColor(val) {
    if (val <= RISK_STOPS[0].val) return { r: RISK_STOPS[0].r, g: RISK_STOPS[0].g, b: RISK_STOPS[0].b };
    if (val >= RISK_STOPS[RISK_STOPS.length - 1].val) {
      const s = RISK_STOPS[RISK_STOPS.length - 1];
      return { r: s.r, g: s.g, b: s.b };
    }
    for (let i = 0; i < RISK_STOPS.length - 1; i++) {
      const a = RISK_STOPS[i], b = RISK_STOPS[i + 1];
      if (val >= a.val && val <= b.val) {
        const t = (val - a.val) / (b.val - a.val);
        return {
          r: Math.round(a.r + (b.r - a.r) * t),
          g: Math.round(a.g + (b.g - a.g) * t),
          b: Math.round(a.b + (b.b - a.b) * t),
        };
      }
    }
    return { r: 132, g: 204, b: 22 };
  }

  function contourColor(val) {
    if (val >= 4.0) return '#991b1b';
    if (val >= 3.0) return '#c2410c';
    if (val >= 2.0) return '#a16207';
    return '#3f6212';
  }

  // --- Cálculo del campo escalar ---
  function computeField(entries, canvasW, canvasH, vbW, vbH) {
    const data = new Float32Array(canvasW * canvasH);
    const scaleX = vbW / canvasW;
    const scaleY = vbH / canvasH;

    entries.forEach(({ area, score }) => {
      const sigma = area.geo_aprox ? FIELD_CONFIG.sigmaGeoApprox : FIELD_CONFIG.sigma;
      const sigma2 = 2 * sigma * sigma;
      const intensity = score.indice * FIELD_CONFIG.intensityScale;
      const cx = area.x / scaleX;
      const cy = area.y / scaleY;
      const r = sigma * 2.5;
      const rSq = r * r;

      const x0 = Math.max(0, Math.floor(cx - r / scaleX));
      const x1 = Math.min(canvasW - 1, Math.ceil(cx + r / scaleX));
      const y0 = Math.max(0, Math.floor(cy - r / scaleY));
      const y1 = Math.min(canvasH - 1, Math.ceil(cy + r / scaleY));

      for (let py = y0; py <= y1; py++) {
        const dy = (py - cy) * scaleY;
        const dySq = dy * dy;
        for (let px = x0; px <= x1; px++) {
          const dx = (px - cx) * scaleX;
          const distSq = dx * dx + dySq;
          if (distSq < rSq) {
            const weight = Math.exp(-distSq / sigma2) * intensity;
            const idx = py * canvasW + px;
            // Mezcla aditiva ponderada: las zonas de cruce se mezclan naturalmente
            data[idx] += weight;
          }
        }
      }
    });

    return data;
  }

  // Suavizado del campo (box blur iterativo)
  function blurField(data, w, h, passes) {
    let src = data;
    for (let p = 0; p < passes; p++) {
      const dst = new Float32Array(w * h);
      // Horizontal
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0, cnt = 0;
          for (let k = -2; k <= 2; k++) {
            const xx = x + k;
            if (xx >= 0 && xx < w) { sum += src[y * w + xx]; cnt++; }
          }
          dst[y * w + x] = sum / cnt;
        }
      }
      src = dst;
      const dst2 = new Float32Array(w * h);
      // Vertical
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0, cnt = 0;
          for (let k = -2; k <= 2; k++) {
            const yy = y + k;
            if (yy >= 0 && yy < h) { sum += src[yy * w + x]; cnt++; }
          }
          dst2[y * w + x] = sum / cnt;
        }
      }
      src = dst2;
    }
    return src;
  }

  // Normalizar el campo para que el máximo local se mapee a ~5.0
  function normalizeField(data) {
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > max) max = data[i];
    }
    if (max === 0) return data;
    const scale = 4.5 / max;
    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      out[i] = Math.min(5.0, data[i] * scale + 1.0); // offset de 1.0 para que el fondo sea ~1.0
    }
    return out;
  }

  // --- Renderizado del campo a canvas ---
  function fieldToCanvas(field, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(w, h);
    const px = imgData.data;

    for (let i = 0; i < w * h; i++) {
      const val = field[i];
      if (val <= 1.05) {
        // Fondo: transparente
        px[i * 4 + 3] = 0;
        continue;
      }
      const c = lerpColor(val);
      px[i * 4] = c.r;
      px[i * 4 + 1] = c.g;
      px[i * 4 + 2] = c.b;
      // Opacidad: más alta en el centro, suave en los bordes
      const alpha = Math.min(0.55, (val - 1.0) * 0.18);
      px[i * 4 + 3] = Math.round(alpha * 255);
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // --- Marching Squares para extracción de curvas de nivel ---
  function marchingSquares(field, w, h, threshold) {
    const segments = [];

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const v00 = field[y * w + x];
        const v10 = field[y * w + x + 1];
        const v01 = field[(y + 1) * w + x];
        const v11 = field[(y + 1) * w + x + 1];

        const b0 = v00 >= threshold ? 1 : 0;
        const b1 = v10 >= threshold ? 1 : 0;
        const b2 = v11 >= threshold ? 1 : 0;
        const b3 = v01 >= threshold ? 1 : 0;
        const code = b0 | (b1 << 1) | (b2 << 2) | (b3 << 3);

        if (code === 0 || code === 15) continue;

        // Interpolación lineal en los bordes
        const lerp = (va, vb) => {
          const d = vb - va;
          return d === 0 ? 0.5 : (threshold - va) / d;
        };

        const top =    { x: x + lerp(v00, v10), y: y };
        const right =  { x: x + 1,              y: y + lerp(v10, v11) };
        const bottom = { x: x + lerp(v01, v11), y: y + 1 };
        const left =   { x: x,                  y: y + lerp(v00, v01) };

        const addSeg = (a, b) => segments.push([a, b]);

        switch (code) {
          case 1:  addSeg(left, top); break;
          case 2:  addSeg(top, right); break;
          case 3:  addSeg(left, right); break;
          case 4:  addSeg(right, bottom); break;
          case 5:  addSeg(left, top); addSeg(right, bottom); break;
          case 6:  addSeg(top, bottom); break;
          case 7:  addSeg(left, bottom); break;
          case 8:  addSeg(bottom, left); break;
          case 9:  addSeg(bottom, top); break;
          case 10: addSeg(top, left); addSeg(bottom, right); break;
          case 11: addSeg(bottom, right); break;
          case 12: addSeg(right, left); break;
          case 13: addSeg(right, top); break;
          case 14: addSeg(top, left); break;
        }
      }
    }

    return segments;
  }

  // Unir segmentos en polilíneas suavizadas
  function joinSegments(segments) {
    if (segments.length === 0) return [];

    const eps = 0.01;
    const chains = [];
    const used = new Uint8Array(segments.length);

    for (let i = 0; i < segments.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const chain = [segments[i][0], segments[i][1]];

      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < segments.length; j++) {
          if (used[j]) continue;
          const s = segments[j];
          const head = chain[0];
          const tail = chain[chain.length - 1];

          if (Math.hypot(s[1].x - head.x, s[1].y - head.y) < eps) {
            chain.unshift(s[0]);
            used[j] = 1;
            changed = true;
          } else if (Math.hypot(s[0].x - tail.x, s[0].y - tail.y) < eps) {
            chain.push(s[1]);
            used[j] = 1;
            changed = true;
          } else if (Math.hypot(s[0].x - head.x, s[0].y - head.y) < eps) {
            chain.unshift(s[1]);
            used[j] = 1;
            changed = true;
          } else if (Math.hypot(s[1].x - tail.x, s[1].y - tail.y) < eps) {
            chain.push(s[0]);
            used[j] = 1;
            changed = true;
          }
        }
      }

      if (chain.length >= 3) chains.push(chain);
    }

    return chains;
  }

  // Suavizar una polilínea con Chaikin
  function smoothChain(chain, iterations) {
    let pts = chain;
    for (let iter = 0; iter < iterations; iter++) {
      const next = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
        next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
      }
      next.push(pts[pts.length - 1]);
      pts = next;
    }
    return pts;
  }

  // Convertir polilínea a path SVG
  function chainToPath(chain, scaleX, scaleY) {
    if (chain.length < 2) return '';
    let d = `M ${(chain[0].x * scaleX).toFixed(1)} ${(chain[0].y * scaleY).toFixed(1)}`;
    for (let i = 1; i < chain.length; i++) {
      d += ` L ${(chain[i].x * scaleX).toFixed(1)} ${(chain[i].y * scaleY).toFixed(1)}`;
    }
    return d;
  }

  // --- API pública ---
  function buildEntries(areas, scoreKey, classOn, enabled) {
    if (!enabled) return [];
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

  function ensureDefs(svg) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS(SVG_NS, 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    return defs;
  }

  function render(svg, areas, scoreKey, classOn, enabled) {
    const layer = ensureLayer(svg);
    layer.replaceChildren();

    const entries = buildEntries(areas, scoreKey, classOn, enabled);
    if (entries.length === 0) return;

    // Dimensiones del viewBox
    const vbW = 1632, vbH = 1056;
    const canvasW = Math.round(vbW * FIELD_CONFIG.resolution);
    const canvasH = Math.round(vbH * FIELD_CONFIG.resolution);
    const scaleX = vbW / canvasW;
    const scaleY = vbH / canvasH;

    // 1. Calcular campo escalar
    const rawField = computeField(entries, canvasW, canvasH, vbW, vbH);

    // 2. Suavizar
    const smoothField = blurField(rawField, canvasW, canvasH, FIELD_CONFIG.blurPasses);

    // 3. Normalizar
    const field = normalizeField(smoothField);

    // 4. Renderizar a canvas y convertir a imagen SVG
    const canvas = fieldToCanvas(field, canvasW, canvasH);
    const dataUrl = canvas.toDataURL('image/png');

    const image = document.createElementNS(SVG_NS, 'image');
    image.setAttribute('x', 0);
    image.setAttribute('y', 0);
    image.setAttribute('width', vbW);
    image.setAttribute('height', vbH);
    image.setAttribute('href', dataUrl);
    image.setAttribute('preserveAspectRatio', 'none');
    image.setAttribute('opacity', '0.85');
    layer.appendChild(image);

    // 5. Extraer y dibujar curvas de nivel (isopletas)
    const defs = ensureDefs(svg);

    FIELD_CONFIG.contourLevels.forEach((threshold) => {
      const segments = marchingSquares(field, canvasW, canvasH, threshold);
      const chains = joinSegments(segments);
      const color = contourColor(threshold);
      const isMain = threshold === Math.round(threshold);

      chains.forEach((chain) => {
        const smoothed = smoothChain(chain, isMain ? 3 : 2);
        const d = chainToPath(smoothed, scaleX, scaleY);
        if (!d) return;

        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', isMain ? FIELD_CONFIG.contourStrokeWidth * 1.4 : FIELD_CONFIG.contourStrokeWidth);
        path.setAttribute('stroke-opacity', isMain ? '0.6' : '0.35');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        if (!isMain) path.setAttribute('stroke-dasharray', '4 3');
        layer.appendChild(path);
      });
    });

    // 6. Etiquetas de nivel en las curvas principales
    FIELD_CONFIG.contourLevels.forEach((threshold) => {
      if (threshold !== Math.round(threshold)) return; // solo etiquetas en niveles enteros
      const segments = marchingSquares(field, canvasW, canvasH, threshold);
      const chains = joinSegments(segments);

      chains.forEach((chain) => {
        if (chain.length < 8) return; // cadenas muy cortas no llevan etiqueta
        const mid = Math.floor(chain.length / 2);
        const pt = chain[mid];
        const txt = document.createElementNS(SVG_NS, 'text');
        txt.setAttribute('x', (pt.x * scaleX).toFixed(1));
        txt.setAttribute('y', (pt.y * scaleY - 3).toFixed(1));
        txt.setAttribute('font-size', '9');
        txt.setAttribute('fill', contourColor(threshold));
        txt.setAttribute('fill-opacity', '0.7');
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('font-weight', '600');
        txt.setAttribute('font-family', 'Segoe UI, Arial, sans-serif');
        txt.setAttribute('pointer-events', 'none');
        // Fondo blanco para legibilidad
        const bg = document.createElementNS(SVG_NS, 'text');
        bg.setAttribute('x', txt.getAttribute('x'));
        bg.setAttribute('y', txt.getAttribute('y'));
        bg.setAttribute('font-size', txt.getAttribute('font-size'));
        bg.setAttribute('fill', '#fff');
        bg.setAttribute('fill-opacity', '0.8');
        bg.setAttribute('text-anchor', 'middle');
        bg.setAttribute('font-weight', '700');
        bg.setAttribute('font-family', txt.getAttribute('font-family'));
        bg.setAttribute('pointer-events', 'none');
        bg.textContent = threshold.toFixed(1);
        txt.textContent = threshold.toFixed(1);
        layer.appendChild(bg);
        layer.appendChild(txt);
      });
    });
  }

  // Mantener buildRegions para compatibilidad (ya no se dibujan regiones rectangulares)
  function buildRegions(entries) { return []; }

  global.RiskCloud = { buildEntries, buildRegions, render };
})(window);
