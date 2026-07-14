# Zoom Vectorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el zoom CSS rasterizante por un zoom mediante `viewBox` que conserve la nitidez de los textos SVG.

**Architecture:** `view` guardará escala y origen en unidades del plano. `applyView` actualizará el `viewBox`; `zoomAt` convertirá el cursor de píxeles a coordenadas SVG y ajustará el origen; el arrastre desplazará ese origen.

**Tech Stack:** HTML, JavaScript y SVG nativos; `node:test`.

## Global Constraints

- No modificar datos, fórmulas, planos, nubes ni marcadores.
- Conservar rueda, botones, arrastre, pellizco y reajuste.
- El SVG no debe recibir `style.transform` para el zoom.
- Reajuste restaura `0 0 1632 1056` y 100%.

---

### Task 1: Estado de `viewBox` y operaciones de zoom

**Files:**
- Modify: `index.html:291-358`
- Create: `tests/zoom-vectorial.test.js`

- [ ] **Step 1: Write the failing test**

Extraer las operaciones puras a `zoom-vectorial.js` y crear pruebas para:

```js
test('calcula un viewBox menor centrado en el punto de zoom', () => {
  const next = zoomAt({ z: 1, x: 0, y: 0 }, 1.25, 816, 528, 1632, 1056);
  assert.equal(next.z, 1.25);
  assert.ok(next.x > 0 && next.y > 0);
});
test('limita la escala y restablece el encuadre completo', () => {
  assert.equal(zoomAt({ z: 14, x: 0, y: 0 }, 2, 0, 0, 1632, 1056).z, 14);
  assert.deepEqual(resetView(), { z: 1, x: 0, y: 0 });
});
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/zoom-vectorial.test.js`

Expected: fallo porque la utilidad no existe.

- [ ] **Step 3: Implement minimal utility and integration**

Crear `zoom-vectorial.js` con `zoomAt`, `panBy` y `resetView`. Cargarlo antes del script inline. Reemplazar `tx/ty` por `x/y`; en `applyView` usar:

```js
const width = 1632 / view.z;
const height = 1056 / view.z;
el.setAttribute('viewBox', `${view.x} ${view.y} ${width} ${height}`);
el.style.transform = '';
```

Convertir los deltas de arrastre y puntos de interacción a unidades del `viewBox` actual; limitar `x/y` a los bordes del plano.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/zoom-vectorial.test.js && node --check zoom-vectorial.js`

Expected: pruebas aprobadas.

- [ ] **Step 5: Commit**

```bash
git add index.html zoom-vectorial.js tests/zoom-vectorial.test.js
git commit -m "fix: conserva zoom vectorial del plano"
```

### Task 2: Verificación visual

**Files:**
- Modify: ninguno salvo defecto reproducible.

- [ ] **Step 1: Verify interaction**

Abrir localmente, acercar sobre una etiqueta de área mediante rueda y botón, arrastrar y reajustar. Confirmar que letras del plano, índices de círculos y etiquetas de región se redibujan nítidamente.

- [ ] **Step 2: Verify suite**

Run: `node --test tests/zoom-vectorial.test.js tests/risk-cloud.test.js && git diff --check`

Expected: todas las pruebas aprobadas y árbol limpio tras retirar artefactos temporales.
