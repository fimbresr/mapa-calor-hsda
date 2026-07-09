# Mapa de Calor Hospitalario — HSDA (v1.0 preliminar)

Aplicación web local que sobrepone un mapa de calor **calculado** sobre los planos SVG reales del hospital. No redibuja ni altera la geometría del plano: ancla marcadores translúcidos sobre la etiqueta real de cada área.

## Cómo usar
Abrir `index.html` con doble clic (Chrome/Edge/Firefox). Los planos se cargan vía `<script>` (globals `window.PLANOS`) para evitar el bloqueo CORS de `file://`, así funciona sin servidor.

- Botones de nivel: N1–N4. (Cubierta y azotea fueron excluidas del estudio.)
- Modelo conmuttable: **Multifactor** (especificación técnica) / **Biológico** (justificación NOM-087/045).
- Filtro por clasificación, ranking del nivel, buscador, resumen KPI.
- Clic en un marcador o en el ranking → editor de puntajes (1–5) con recálculo en vivo y cambio de estatus de validación.
- Exportación: JSON, SVG, PNG, CSV de ranking.

## Cómo se calcula (auditable)
Cada área recibe un **arquetipo** (urgencias, quirófano, laboratorio, RPBI, HVAC, administrativa, etc.) por coincidencia de palabra clave con el nombre real del plano. El arquetipo define el vector de puntajes 1–5. El índice se calcula con la fórmula del documento fuente:

- **Multifactor:** `ocup·0.15 + interrel·0.15 + biológico·0.20 + infeccioso·0.15 + químico·0.15 + físico·0.10 + incidentes·0.10 − (controles−1)·0.10`
- **Biológico:** `ocup·0.10 + contacto_pac·0.15 + sangre/fluidos·0.15 + procedimientos·0.10 + RPBI·0.15 + muestras·0.10 + aerosoles·0.10 + interrel·0.10 + incidentes·0.10 − (controles−1)·0.10`

Clasificación: 4.0–5.0 Crítico (rojo) · 3.0–3.9 Alto (naranja) · 2.0–2.9 Medio (amarillo) · 1.0–1.9 Bajo (verde).

El color depende del cálculo, no de asignación manual. Los puntajes son editables y se pueden exportar.

## Supuestos explícitos (marcar antes de uso formal)
1. **Incidentes = 1 en todas las áreas.** No hay bitácora de incidentes cargada. Esto hace que el modelo *multifactor* tope ~3.75 y no genere áreas "Crítico"; el modelo *biológico* sí marca 15 áreas críticas (urgencias, UCI, UCIN, laboratorio, quirófanos, aislamiento, RPBI). Al capturar incidentes reales el ranking cambiará.
2. **Ocupación inferida por puesto, no validada.** El Excel de 195 empleados no tiene columna de área física; se agregó por puesto→departamento→turno (ver `data/plantilla.js`). Se muestra como evidencia contextual en el tooltip, no como asignación validada.
3. **Puntajes por arquetipo, preliminares.** Reflejan el tipo de área, no el levantamiento en campo. Todos con estatus "Preliminar".
4. **Turnos:** ~65 códigos sin diccionario oficial; se agruparon por hora de inicio del horario (matutino/vespertino/nocturno/administrativo). 23 de limpieza quedaron en "otro" por falta de horario.
5. **Alcance:** el estudio cubre N1–N4 (255 áreas). Cubierta de equipos y azotea fueron excluidas por decisión del responsable.
6. **Geometría = punto de anclaje sobre la etiqueta**, no polígono del contorno del área. La fase 2 (polígonos exactos) queda pendiente.

## Inconsistencia detectada en los documentos fuente
Los **números de ejemplo** de la especificación y de la justificación **no coinciden con sus propias fórmulas**. Ej.: la spec dice que Urgencias `[5,5,5,5,2,3,3,3]` = 4.25, pero la fórmula escrita da **3.95**. La app respeta la **fórmula** (fuente auditable), no los ejemplos numéricos.

## Datos faltantes para pasar de preliminar a definitivo
Pacientes/visitantes por área y turno · rutas (pacientes, muestras, RPBI, ropa sucia, medicamentos, alimentos, mantenimiento) · inventario de químicos por área · factores físicos medidos · controles reales por área · bitácora de incidentes/hallazgos · validación de geometrías en campo con jefaturas, UVEH, mantenimiento, limpieza y enfermería.

## Estructura
```
mapa-calor-hospital/
├── index.html            App (UI, cálculo, render, exportación)
├── METODOLOGIA.md        Nomenclatura y método de cálculo (trazabilidad)
├── data/areas.js         255 áreas (N1–N4) con puntajes de ambos modelos
├── data/plantilla.js     Plantilla inferida por departamento y turno
└── planos/{N1..N4}.js    SVG reales embebidos como globals
```
Nota: `planos/CUB.js` y `planos/AZ.js` quedan vacíos (planos excluidos del estudio).

Versión 1.0 · preliminar · 2026-07-09. No mostrar en versión pública sin validación de campo. No contiene nombres de empleados (solo conteos agregados).
