# Nube de Riesgo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar una nube SVG opcional, independiente por clasificación visible, detrás de los marcadores del mapa de calor.

**Architecture:** Una utilidad JavaScript local decidirá qué áreas contribuyen a la nube según el interruptor y los filtros de clasificación. `index.html` cargará esa utilidad, creará una capa SVG `risk-cloud-layer` antes de `heatmap-layer` y renderizará halos con degradados radiales autocontenidos para las áreas seleccionadas.

**Tech Stack:** HTML estático, JavaScript del navegador, SVG nativo, `node:test` para pruebas sin dependencias.

## Global Constraints

- No modificar los puntajes, fórmulas, clasificaciones, arquetipos ni datos de `AREAS`.
- No introducir dependencias, backend ni proceso de compilación.
- La nube es una ayuda visual de prioridad; no define límites físicos ni una ubicación exacta de muestreo.
- Los círculos, etiquetas e interacciones existentes siempre permanecen sobre la nube.
- SVG y PNG deben conservar automáticamente la nube cuando el interruptor está activo, sin depender de filtros de desenfoque del visor.

---

## Estructura de archivos

- Crear `risk-cloud.js`: utilidades puras para decidir las áreas de nube y renderizador SVG que no recibe eventos ni modifica datos de riesgo.
- Crear `tests/risk-cloud.test.js`: pruebas de selección por interruptor y clasificación mediante `node:test`.
- Modificar `index.html`: cargar la utilidad, añadir el interruptor y conectar las capas SVG al ciclo de `render()`.

### Task 1: Selección comprobable de áreas para la nube

**Files:**
- Create: `risk-cloud.js`
- Test: `tests/risk-cloud.test.js`

**Interfaces:**
- Consumes: `areas` con `{ area_id, x, y, geo_aprox, mf, bio }`, `scoreKey` igual a `mf` o `bio`, `classOn` por clasificación y `enabled` booleano.
- Produces: `window.RiskCloud.buildEntries(areas, scoreKey, classOn, enabled)`, que retorna objetos `{ area, score }` sin mutar los argumentos.

- [ ] **Step 1: Write the failing test**

Crear `tests/risk-cloud.test.js` con este contenido:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/risk-cloud.test.js`

Expected: fallo porque `risk-cloud.js` no existe o `window.RiskCloud` no define `buildEntries`.

- [ ] **Step 3: Write minimal implementation**

Crear `risk-cloud.js` con:

```js
(function attachRiskCloud(global) {
  function buildEntries(areas, scoreKey, classOn, enabled) {
    if (!enabled) return [];
    return areas
      .map((area) => ({ area, score: area[scoreKey] }))
      .filter(({ score }) => classOn[score.clasificacion]);
  }

  global.RiskCloud = { buildEntries };
})(window);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/risk-cloud.test.js`

Expected: dos pruebas aprobadas y cero fallos.

- [ ] **Step 5: Commit**

```bash
git add risk-cloud.js tests/risk-cloud.test.js
git commit -m "test: cubre selección de nube de riesgo"
```

### Task 2: Renderizador SVG de halos degradados

**Files:**
- Modify: `risk-cloud.js`
- Modify: `tests/risk-cloud.test.js`

**Interfaces:**
- Consumes: `svg`, `areas`, `scoreKey`, `classOn`, `enabled` y `document.createElementNS`.
- Produces: `window.RiskCloud.render(svg, areas, scoreKey, classOn, enabled)`, que crea o limpia `#risk-cloud-layer` y no modifica `#heatmap-layer`.

- [ ] **Step 1: Write the failing test**

Extender `tests/risk-cloud.test.js` con una prueba de la interfaz y de los
invariantes de capa. El stub SVG debe implementar `querySelector`,
`insertBefore`, `appendChild`, `replaceChildren`, `setAttribute` y
`document.createElementNS`; comprobar que `render` existe, inserta
`#risk-cloud-layer` antes de `#heatmap-layer`, aplica `pointer-events="none"`,
crea halos con el radio y degradado radial esperados y vacía halos anteriores al volver a
renderizar.

```js
test('renderiza halos no interactivos detrás de los marcadores y limpia el render previo', () => {
  const { render } = loadRiskCloud();
  assert.equal(typeof render, 'function');
  // El stub define un markerLayer, registra insertBefore y conserva atributos.
  // Tras dos llamadas, se espera una sola capa de nube antes del marcador,
  // pointer-events=none y exactamente un halo de la segunda llamada.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/risk-cloud.test.js`

Expected: fallo porque `render` todavía es `undefined`.

- [ ] **Step 3: Write minimal implementation**

Ampliar `risk-cloud.js` con un renderizador que use estas constantes y comportamiento:

```js
const SVG_NS = 'http://www.w3.org/2000/svg';
const CLOUD_RADIUS = 76;
const CLOUD_COLORS = { Critico: '#ef4444', Alto: '#f97316', Medio: '#facc15', Bajo: '#84cc16' };

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
    halo.setAttribute('fill', `url(#risk-cloud-gradient-${score.clasificacion})`);
    layer.appendChild(halo);
  });
}
```

Crear en `defs` un `radialGradient` por clasificación visible. Cada degradado
debe tener centro de color con opacidad perceptible, una parada intermedia y
una parada exterior con opacidad `0`; sus ids serán
`risk-cloud-gradient-Critico`, `risk-cloud-gradient-Alto`,
`risk-cloud-gradient-Medio` y `risk-cloud-gradient-Bajo`. Crear cada degradado
una sola vez y exportar `render` junto con `buildEntries`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/risk-cloud.test.js`

Expected: tres pruebas aprobadas y cero fallos.

- [ ] **Step 5: Commit**

```bash
git add risk-cloud.js tests/risk-cloud.test.js
git commit -m "feat: renderiza halos de nube de riesgo"
```

### Task 3: Integrar el control y la capa en la aplicación

**Files:**
- Modify: `index.html:124-127`
- Modify: `index.html:195-201`
- Modify: `index.html:229-288`
- Modify: `index.html:360-403`

**Interfaces:**
- Consumes: `window.RiskCloud.render`, `areasOf(LEVEL)`, `scoreKey()`, `classOn`, `MODEL` y el estado local `cloudOn`.
- Produces: una casilla `#cloudtoggle` que actualiza `cloudOn` y vuelve a ejecutar `render()`.

- [ ] **Step 1: Write the failing test**

Añadir a `tests/risk-cloud.test.js` una prueba de integración estática para el
contrato entre la página y la utilidad:

```js
test('la página expone el interruptor e invoca el renderizador de nube', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /<script src="risk-cloud\.js"><\/script>/);
  assert.match(html, /id="cloudtoggle"/);
  assert.match(html, /window\.RiskCloud\.render\(el, list, sk, classOn, cloudOn\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/risk-cloud.test.js`

Expected: fallo porque `index.html` todavía no carga la utilidad, no contiene el
interruptor y no invoca el renderizador.

- [ ] **Step 3: Write minimal implementation**

En `index.html`:

1. Añadir `<script src="risk-cloud.js"></script>` después de `data/plantilla.js`.
2. Bajo `#classfilter`, añadir:

```html
<label class="chk"><input id="cloudtoggle" type="checkbox"> <span>Nube de riesgo</span></label>
```

3. Declarar `let cloudOn=false;` junto con `MODEL`, `LEVEL` y `classOn`.
4. Asignar `document.getElementById('cloudtoggle').onchange=e=>{cloudOn=e.target.checked;render();};` después de construir el filtro.
5. No crear filtros SVG en `loadPlano()`: el renderizador crea los degradados
   radiales requeridos en `defs` al renderizar cada clasificación visible.
6. En `render()`, después de recalcular los puntajes y antes de crear los marcadores, invocar:

```js
window.RiskCloud.render(el, list, sk, classOn, cloudOn);
```

Así la capa se limpia y se reconstruye en cada cambio de modelo, nivel, filtro o interruptor; al estar antes de los marcadores, queda detrás de ellos y será serializada por las exportaciones existentes.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/risk-cloud.test.js`

Expected: cuatro pruebas aprobadas y cero fallos.

- [ ] **Step 5: Commit**

```bash
git add index.html risk-cloud.js tests/risk-cloud.test.js
git commit -m "feat: agrega nube de riesgo opcional"
```

### Task 4: Verificación visual y de exportación

**Files:**
- Modify: ninguno, salvo que la comprobación revele un defecto concreto.

**Interfaces:**
- Consumes: página estática abierta desde `index.html` o desde GitHub Pages.
- Produces: evidencia de que la capa no bloquea clics y viaja en SVG/PNG.

- [ ] **Step 1: Preparar la comprobación manual**

Abrir la página y elegir el nivel N1, modelo Biológico, con Crítico y Alto
marcados. Activar `Nube de riesgo`.

- [ ] **Step 2: Verificar el efecto esperado**

Comprobar visualmente:

```text
- Se ve una nube roja detrás de marcadores críticos.
- Se ve una nube naranja detrás de marcadores altos.
- Las zonas cercanas se solapan suavemente sin ocultar círculos ni índices.
- Los clics en un círculo aún abren el editor.
- Desactivar el interruptor elimina sólo las nubes.
- Desmarcar una clase elimina su nube y sus círculos.
```

- [ ] **Step 3: Verificar exportaciones**

Exportar SVG y PNG con la nube activa. Abrir ambos archivos y confirmar que las
nubes se conservan detrás de los marcadores.

- [ ] **Step 4: Run the full automated verification**

Run: `node --test tests/risk-cloud.test.js && git diff --check`

Expected: pruebas aprobadas, cero errores de espacios y ninguna modificación no intencional.

- [ ] **Step 5: Commit corrections only if verification required them**

```bash
git add index.html risk-cloud.js tests/risk-cloud.test.js
git commit -m "fix: ajusta visualización de nube de riesgo"
```
