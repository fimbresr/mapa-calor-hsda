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
  svg.querySelector = (selector) => svg.children.find((child) => `#${child.id}` === selector) || null;
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
  assert.deepEqual(svg.children, [cloudLayer, markerLayer]);
  assert.equal(cloudLayer.attributes['pointer-events'], 'none');
  assert.equal(firstHalo.attributes.cx, '120');
  assert.equal(firstHalo.attributes.cy, '240');
  assert.equal(firstHalo.attributes.r, '88');
  assert.equal(firstHalo.attributes.fill, '#d00');
  assert.equal(firstHalo.attributes['fill-opacity'], '0.34');
  assert.equal(firstHalo.attributes.filter, 'url(#risk-cloud-blur)');

  render(svg, [{
    x: 300,
    y: 400,
    geo_aprox: false,
    mf: { clasificacion: 'Alto', color: '#e80' },
  }], 'mf', { Alto: true }, true);

  assert.equal(svg.querySelector('#risk-cloud-layer'), cloudLayer);
  assert.deepEqual(svg.children, [cloudLayer, markerLayer]);
  assert.equal(cloudLayer.children.length, 1);
  assert.notEqual(cloudLayer.children[0], firstHalo);
  assert.equal(cloudLayer.children[0].attributes.r, '76');
  assert.equal(cloudLayer.children[0].attributes.fill, '#e80');
});
