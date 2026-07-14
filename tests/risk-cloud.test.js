const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function loadRiskCloud(document) {
  const context = { window: {}, document };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('risk-cloud.js', 'utf8'), context);
  return context.window.RiskCloud;
}

function createSvgStub() {
  function createNode(name) {
    return {
      name,
      id: '',
      attributes: {},
      children: [],
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      replaceChildren() {
        this.children = [];
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
    };
  }

  const markerLayer = createNode('g');
  markerLayer.id = 'heatmap-layer';
  const svg = createNode('svg');
  svg.children.push(markerLayer);
  svg.querySelector = (selector) => {
    const find = (node) => {
      if (`#${node.id}` === selector || node.name === selector) return node;
      return node.children.map(find).find(Boolean) || null;
    };
    return svg.children.map(find).find(Boolean) || null;
  };
  svg.insertBefore = (child, reference) => {
    const index = reference ? svg.children.indexOf(reference) : -1;
    if (index < 0) svg.children.push(child);
    else svg.children.splice(index, 0, child);
    return child;
  };

  return {
    document: { createElementNS: (_namespace, name) => createNode(name) },
    markerLayer,
    svg,
  };
}

const areas = [
  { area_id: 'N1-01', mf: { clasificacion: 'Critico' }, bio: { clasificacion: 'Alto' } },
  { area_id: 'N1-02', mf: { clasificacion: 'Alto' }, bio: { clasificacion: 'Critico' } },
  { area_id: 'N1-03', mf: { clasificacion: 'Medio' }, bio: { clasificacion: 'Bajo' } },
];

function entry(clasificacion, x, y, indice) {
  return { area: { x, y, geo_aprox: false }, score: { clasificacion, indice } };
}

test('separa regiones por clasificación y por ausencia de intersección', () => {
  const { buildRegions } = loadRiskCloud();
  const regions = buildRegions([
    entry('Critico', 0, 0, 4.5), entry('Critico', 40, 0, 4),
    entry('Critico', 400, 0, 5), entry('Alto', 0, 0, 3.5),
  ]);
  assert.equal(JSON.stringify(regions.map((region) => [region.classification, region.entries.length])), JSON.stringify([
    ['Critico', 2], ['Critico', 1], ['Alto', 1],
  ]));
});

test('pondera el punto recomendado por el índice y usa respaldo fuera de nube', () => {
  const { buildRegions } = loadRiskCloud();
  const [region] = buildRegions([entry('Critico', 0, 0, 5), entry('Critico', 140, 0, 3)]);
  assert.ok(region.point.x < 50);
  assert.equal(region.fallback.area.x, 0);
});

test('la página expone el interruptor e invoca el renderizador de nube', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /<script src="risk-cloud\.js"><\/script>/);
  assert.match(html, /id="cloudtoggle"/);
  assert.match(html, /window\.RiskCloud\.render\(el, list, sk, classOn, cloudOn\)/);
  assert.doesNotMatch(html, /risk-cloud-blur/);
});

test('no crea entradas cuando la nube está desactivada', () => {
  const { buildEntries } = loadRiskCloud();
  const result = buildEntries(areas, 'mf', { Critico: true, Alto: true, Medio: true, Bajo: true }, false);
  assert.deepEqual(result, []);
});

test('incluye únicamente las clasificaciones visibles del modelo activo', () => {
  const { buildEntries } = loadRiskCloud();
  const result = buildEntries(areas, 'bio', { Critico: true, Alto: false, Medio: false, Bajo: false }, true);
  assert.deepEqual(result.map(({ area, score }) => [area.area_id, score.clasificacion]), [['N1-02', 'Critico']]);
});

test('renderiza halos no interactivos detrás de los marcadores y limpia el render previo', () => {
  const { document, markerLayer, svg } = createSvgStub();
  const { render } = loadRiskCloud(document);
  assert.equal(typeof render, 'function');

  render(svg, [{
    x: 120,
    y: 240,
    geo_aprox: true,
    mf: { clasificacion: 'Critico', color: '#d00' },
  }], 'mf', { Critico: true }, true);

  const cloudLayer = svg.querySelector('#risk-cloud-layer');
  const firstHalo = cloudLayer.children[0];
  const criticalGradient = svg.querySelector('#risk-cloud-gradient-Critico');
  assert.ok(svg.children.indexOf(cloudLayer) < svg.children.indexOf(markerLayer));
  assert.equal(cloudLayer.attributes['pointer-events'], 'none');
  assert.equal(firstHalo.attributes.cx, '120');
  assert.equal(firstHalo.attributes.cy, '240');
  assert.equal(firstHalo.attributes.r, '88');
  assert.equal(firstHalo.attributes.fill, 'url(#risk-cloud-gradient-Critico)');
  assert.equal(criticalGradient.name, 'radialGradient');
  assert.equal(criticalGradient.children.length, 3);
  assert.equal(criticalGradient.children[0].attributes.offset, '0%');
  assert.notEqual(criticalGradient.children[0].attributes['stop-opacity'], '0');
  assert.equal(criticalGradient.children[1].attributes.offset, '55%');
  assert.equal(criticalGradient.children[2].attributes.offset, '100%');
  assert.equal(criticalGradient.children[2].attributes['stop-opacity'], '0');

  render(svg, [{
    x: 300,
    y: 400,
    geo_aprox: false,
    mf: { clasificacion: 'Alto', color: '#e80' },
  }], 'mf', { Alto: true }, true);

  assert.equal(svg.querySelector('#risk-cloud-layer'), cloudLayer);
  assert.ok(svg.children.indexOf(cloudLayer) < svg.children.indexOf(markerLayer));
  assert.equal(cloudLayer.children.length, 1);
  assert.notEqual(cloudLayer.children[0], firstHalo);
  assert.equal(cloudLayer.children[0].attributes.r, '76');
  assert.equal(cloudLayer.children[0].attributes.fill, 'url(#risk-cloud-gradient-Alto)');
  assert.ok(svg.querySelector('#risk-cloud-gradient-Alto'));

  render(svg, [], 'mf', {}, false);

  assert.equal(cloudLayer.children.length, 0);
  assert.ok(svg.children.includes(markerLayer));
});

test('anota cada región visible con contorno punteado y punto de muestreo', () => {
  const { document, markerLayer, svg } = createSvgStub();
  const { render } = loadRiskCloud(document);
  render(svg, [
    { x: 100, y: 100, geo_aprox: false, mf: { clasificacion: 'Critico', indice: 5 } },
    { x: 160, y: 100, geo_aprox: false, mf: { clasificacion: 'Critico', indice: 3 } },
  ], 'mf', { Critico: true }, true);

  const cloudLayer = svg.querySelector('#risk-cloud-layer');
  const regionLayer = svg.querySelector('#risk-region-layer');
  assert.equal(regionLayer.attributes['pointer-events'], 'none');
  assert.ok(svg.children.indexOf(cloudLayer) < svg.children.indexOf(regionLayer));
  assert.ok(svg.children.indexOf(regionLayer) < svg.children.indexOf(markerLayer));
  const outline = regionLayer.children.find((node) => node.attributes['stroke-dasharray'] === '8 6');
  assert.equal(outline.name, 'path');
  assert.ok(regionLayer.children.some((node) => node.name === 'circle'));

  render(svg, [], 'mf', {}, false);
  assert.equal(regionLayer.children.length, 0);
});
