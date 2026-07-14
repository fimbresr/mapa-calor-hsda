const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('zoom-vectorial.js', 'utf8'), context);
const { zoomAt, panBy, resetView } = context.window.VectorZoom;

test('calcula un viewBox menor centrado en el punto de zoom', () => {
  const next = zoomAt({ z: 1, x: 0, y: 0 }, 1.25, 816, 528, 1632, 1056);
  assert.equal(next.z, 1.25);
  assert.ok(next.x > 0 && next.y > 0);
});

test('limita la escala y restablece el encuadre completo', () => {
  assert.equal(zoomAt({ z: 14, x: 0, y: 0 }, 2, 0, 0, 1632, 1056).z, 14);
  assert.equal(JSON.stringify(resetView()), JSON.stringify({ z: 1, x: 0, y: 0 }));
});

test('convierte el arrastre usando el rectángulo visible del SVG', () => {
  const next = panBy({ z: 2, x: 200, y: 200 }, -100, -50, 816, 528);
  assert.equal(next.x, 300);
  assert.equal(next.y, 250);
});
