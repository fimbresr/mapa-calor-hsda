# Regiones de Muestreo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delimitar regiones conectadas de nube por clasificación y marcar un punto recomendado de muestreo ponderado en cada una.

**Architecture:** `risk-cloud.js` ampliará sus utilidades puras para agrupar entradas de la misma clasificación cuyos radios se intersectan y calcular su centro ponderado. El mismo renderizador añadirá una capa de anotaciones entre la nube y los marcadores, con contornos punteados suavizados y dianas no interactivas.

**Tech Stack:** JavaScript estático, SVG nativo, `node:test`.

## Global Constraints

- No modificar fórmulas, datos, arquetipos, puntajes ni clasificaciones de `AREAS`.
- Una región nunca mezcla clasificaciones diferentes.
- La región y el punto sólo existen si la nube está activa y la clasificación sigue visible.
- El centro se pondera por `indice * indice`; si cae fuera del radio de toda área de la región, usar el marcador de mayor índice.
- Contornos y puntos son ayudas visuales, no límites físicos ni instrucciones definitivas de muestreo.
- SVG y PNG deben conservar anotaciones sin dependencias ni filtros de visor.

---

### Task 1: Agrupamiento y centro recomendado comprobables

**Files:**
- Modify: `risk-cloud.js`
- Modify: `tests/risk-cloud.test.js`

**Interfaces:**
- Produces: `window.RiskCloud.buildRegions(entries)` que retorna `{ classification, entries, center, fallback }` por componente conectado.
- Consumes: entradas `{ area: { x, y, geo_aprox }, score: { clasificacion, indice } }` de `buildEntries`.

- [ ] **Step 1: Write the failing tests**

Añadir pruebas que demuestren que:

```js
test('separa regiones de clasificaciones distintas y componentes sin intersección', () => {
  const { buildRegions } = loadRiskCloud();
  const regions = buildRegions([
    entry('Critico', 0, 0, 4.5), entry('Critico', 40, 0, 4),
    entry('Critico', 400, 0, 5), entry('Alto', 0, 0, 3.5),
  ]);
  assert.deepEqual(regions.map((r) => [r.classification, r.entries.length]), [
    ['Critico', 2], ['Critico', 1], ['Alto', 1],
  ]);
});

test('pondera el centro por índice al cuadrado y usa respaldo fuera de región', () => {
  const { buildRegions } = loadRiskCloud();
  const [region] = buildRegions([entry('Critico', 0, 0, 5), entry('Critico', 140, 0, 3)]);
  assert.ok(region.center.x < 50);
  assert.equal(region.fallback.area.x, 0);
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test tests/risk-cloud.test.js`

Expected: fallo porque `buildRegions` no existe.

- [ ] **Step 3: Implement minimal grouping**

Añadir `regionRadius(area)`, `intersects(a, b)`, recorrido DFS/BFS por clasificación y `buildRegions`. Usar radio `76` o `88` para `geo_aprox`; conectar si `Math.hypot(dx, dy) <= radiusA + radiusB`. Calcular:

```js
const weight = score.indice * score.indice;
const center = { x: sumX / sumWeight, y: sumY / sumWeight };
const fallback = entries.reduce((best, entry) => entry.score.indice > best.score.indice ? entry : best);
const point = entries.some((entry) => Math.hypot(center.x - entry.area.x, center.y - entry.area.y) <= regionRadius(entry.area))
  ? center
  : { x: fallback.area.x, y: fallback.area.y };
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `node --test tests/risk-cloud.test.js`

Expected: todas las pruebas aprobadas.

- [ ] **Step 5: Commit**

```bash
git add risk-cloud.js tests/risk-cloud.test.js
git commit -m "feat: calcula regiones de muestreo"
```

### Task 2: Contorno punteado y diana por región

**Files:**
- Modify: `risk-cloud.js`
- Modify: `tests/risk-cloud.test.js`

**Interfaces:**
- Consumes: `buildRegions(buildEntries(...))`.
- Produces: `#risk-region-layer`, colocado después de `#risk-cloud-layer` y antes de `#heatmap-layer`.

- [ ] **Step 1: Write the failing test**

Extender el stub SVG para comprobar que `render` crea `#risk-region-layer` con `pointer-events="none"`, un `path` con `stroke-dasharray`, una diana (`circle`) y una etiqueta por región; confirmar que la capa queda entre nube y marcadores y que al apagar la nube se vacía.

- [ ] **Step 2: Run test to verify RED**

Run: `node --test tests/risk-cloud.test.js`

Expected: fallo por ausencia de `#risk-region-layer`.

- [ ] **Step 3: Implement minimal SVG annotations**

Crear `ensureRegionLayer(svg)` e insertar la capa antes de `#heatmap-layer`. Para cada región, calcular una envolvente suavizada con el centro, el radio máximo de sus áreas y un margen de `18`; dibujar un `path` cerrado con `stroke` del color de clasificación, `stroke-width="2.5"`, `stroke-dasharray="8 6"`, `fill="none"` y `pointer-events="none"`. Dibujar una diana en `region.point` con círculo blanco, borde del color y cruz central, más `text` `Punto de muestreo`.

En `render`, limpiar ambas capas en cada ejecución; construir halos primero, luego regiones, y dejar marcadores existentes al frente.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `node --test tests/risk-cloud.test.js && git diff --check`

Expected: todas las pruebas aprobadas y cero errores de espacios.

- [ ] **Step 5: Commit**

```bash
git add risk-cloud.js tests/risk-cloud.test.js
git commit -m "feat: anota regiones de muestreo"
```

### Task 3: Verificación visual y de exportación

**Files:**
- Modify: ninguno, salvo defecto reproducible.

- [ ] **Step 1: Verify visual behavior**

En N1/Biológico, activar nube y Crítico/Alto. Confirmar regiones separadas por color, contornos punteados, una diana por región, clic funcional en marcadores y limpieza al desactivar nube o clasificación.

- [ ] **Step 2: Verify exports and suite**

Exportar SVG y PNG; confirmar que ambos contienen contornos y dianas. Ejecutar:

```bash
node --test tests/risk-cloud.test.js && git diff --check
```

Expected: pruebas aprobadas, exportaciones con anotaciones y árbol limpio salvo evidencia temporal que debe retirarse.
