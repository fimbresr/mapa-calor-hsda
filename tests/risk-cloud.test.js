const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function loadRiskCloud() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('risk-cloud.js', 'utf8'), context);
  return context.window.RiskCloud;
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
