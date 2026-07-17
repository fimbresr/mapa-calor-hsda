# Cumplimiento STPS — Contaminantes Biológicos (Emplazamiento 254/ET/00061/2026)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complementar el mapa de calor hospitalario con los datos y reportes necesarios para cumplir las Medidas 1 y 2 del emplazamiento STPS: Estudio de Contaminantes Biológicos y Evaluación de Concentraciones con frecuencia requerida.

**Architecture:** Se extiende el modelo de datos actual (`areas.js`) con tres nuevos bloques por área: `reconocimiento` (agentes, vías, grupos expuestos), `evaluacion` (puntos de muestreo, placas, método, frecuencia) y `control` (medidas de ingeniería, administrativas, EPP). Se agrega un panel "STPS" al sidebar y un exportador de reporte formal en PDF/CSV con el formato del Art. 41 RFSST.

**Tech Stack:** HTML/CSS/JS vanilla (sin frameworks), jsPDF para exportación PDF, datos en `areas.js`.

## Global Constraints

- Sin frameworks: HTML + CSS + JS vanilla (patrón existente del proyecto)
- Los datos se agregan como propiedades opcionales en cada objeto de `AREAS` (backward compatible)
- Los nombres de áreas NO se alteran (son los reales de los planos SVG)
- El reporte debe incluir: encabezado legal, reconocimiento, evaluación, control, firmas
- Frecuencias: Crítico→Quincenal, Alto→Mensual, Medio→Trimestral, Bajo→Semestral (ya definidas)
- Los puntos de muestreo se dibujan como marcadores SVG sobre el plano real
- El exportador CSV debe incluir todos los campos del Art. 41 RFSST

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `data/areas.js` | Se extiende con bloques `reconocimiento`, `evaluacion`, `control` por área |
| `index.html` | Se agrega panel STPS en sidebar, toggle de puntos de muestreo, exportador |
| `stps-report.js` | **NUEVO** — Generador de reporte formal STPS (CSV + PDF) |
| `sampling-markers.js` | **NUEVO** — Renderizado de puntos de muestreo sobre el SVG |

---

## Task 1: Definir estructura de datos STPS por área

**Files:**
- Modify: `data/areas.js` (agregar propiedades opcionales a cada área)

**Interfaces:**
- Produces: Estructura `reconocimiento`, `evaluacion`, `control` en cada objeto de `AREAS`

### Estructura de datos

Cada área en `AREAS` se extiende con tres bloques opcionales:

```javascript
// Bloque 1: Reconocimiento (Art. 41-I, II RFSST)
"reconocimiento": {
  "agentes_biologicos": [
    { "tipo": "bacteria", "nombre": "Staphylococcus aureus/SARM", "via": "contacto/inhalación", "fuente": "pacientes, superficies" },
    { "tipo": "hongo", "nombre": "Aspergillus spp.", "via": "inhalación", "fuente": "aire, superficies polvo" }
  ],
  "vias_exposicion": ["inhalación", "contacto cutáneo", "contacto mucosas"],
  "grupos_expuestos": [
    { "puesto": "Enfermería", "count": 6, "turno": "matutino" },
    { "puesto": "Médicos", "count": 2, "turno": "matutino" }
  ],
  "fuentes_emision": ["pacientes", "superficies de alto contacto", "aerosoles por procedimiento"],
  "tiempo_exposicion": "jornada completa (8h)"
},

// Bloque 2: Evaluación (Art. 41-V RFSST)
"evaluacion": {
  "puntos_muestreo": [
    { "id": "P1", "ubicacion": "Entrada principal, lado izquierdo", "tipo": "aire", "metodo": "volumétrico", "placa": "TSA", "gx": 720, "gy": 210 },
    { "id": "P2", "ubicacion": "Mesón de trabajo central", "tipo": "superficie", "metodo": "RODAC", "placa": "TSA", "gx": 780, "gy": 280 },
    { "id": "P3", "ubicacion": "Grifo/sumidero", "tipo": "superficie", "metodo": "hisopo", "placa": "Sabouraud", "gx": 800, "gy": 350 }
  ],
  "frecuencia": "Quincenal",
  "frecuencia_dias": 15,
  "placas_por_visita": 6,
  "medios_requeridos": ["TSA", "Sabouraud/PDA"],
  "parametros": {
    "incubacion_bacteria": "TSA 35–37°C 24–48h",
    "incubacion_hongos": "Sabouraud 25–30°C 3–7d",
    "volumetrico_UFC_m3": "según equipo (≥1000 L aire)",
    "sedimentacion_min": 15
  }
},

// Bloque 3: Control (Art. 41-III, IV, VI, VII RFSST)
"control": {
  "senializacion": true,
  "acceso_restringido": false,
  "ventilacion": "mecánica con HEPA",
  "epp_requerido": ["guantes", "bata", "protección ocular"],
  "medidas_ingenieria": ["CSB clase II", "flujo direccional"],
  "medidas_administrativas": ["precauciones normalizadas", "procedimiento escrito"],
  "descontaminacion": "autoclave + desinfectante de superficies"
}
```

### Pasos

- [ ] **Paso 1:** Definir la estructura JSON de los tres bloques (arriba)
- [ ] **Paso 2:** Para cada arquetipo, crear un template de `reconocimiento`, `evaluacion`, `control` basado en la tabla §5 y §5.bis de METODOLOGIA.md
- [ ] **Paso 3:** Agregar los bloques a las 255 áreas en `areas.js` (script generador o edición directa)
- [ ] **Paso 4:** Verificar que la app carga sin errores con los nuevos campos

---

## Task 2: Definir puntos de muestreo por arquetipo

**Files:**
- Modify: `data/areas.js` (puntos de muestreo en bloque `evaluacion`)

**Interfaces:**
- Produces: Array `puntos_muestreo` con coordenadas `gx`, `gy` relativas al punto de anclaje del área

### Reglas de puntos de muestreo

| Arquetipo | # Puntos | Ubicaciones típicas | Método principal |
|---|:---:|---|---|
| urgencias | 4 | Entrada, mesón triage, camilla, grifo | Volumétrico + RODAC |
| quirofano | 5 | Mesa quirúrgica, lámpara, CSB, puerta, mesón prep | Volumétrico + RODAC |
| uci | 4 | Cama, monitor, mesón, grifo | Volumétrico + RODAC |
| ucin | 4 | Cunero, mesón, incubadora, grifo | Volumétrico + RODAC |
| aislamiento | 4 | Cama, puerta, baño, mesón | Volumétrico + RODAC |
| laboratorio | 4 | Centrífuga, CSB, mesón, fregadero | Volumétrico + RODAC |
| banco_sangre | 3 | Refrigerador, mesón, CSB | RODAC + aire |
| ceye | 4 | Autoclave, mesón prep, filtro, puerta | Volumétrico + RODAC |
| rpbi | 3 | Contenedor, área acopio, puerta | RODAC + hisopo |
| septico | 3 | Contenedor, desagüe, puerta | RODAC + hisopo |
| hospitalizacion | 3 | Cama, baño, mesón enfermería | RODAC + sedimentación |
| enfermeria | 3 | Mesón, dispensador, grifo | RODAC + sedimentación |
| consultorio | 2 | Mesa exploración, grifo | RODAC |
| farmacia | 2 | Mesón dispensación, estante | RODAC + aire |
| limpieza | 2 | Fregadero, almacén químicos | RODAC |
| sanitarios | 2 | Lavabo, inodoro | RODAC |
| cocina | 3 | Mesón prep, fregadero, almacén | RODAC |
| hvac | 3 | Charola condensados, filtro, ducto | Hisopo + agua |
| administrativo | 1 | Escritorio principal | Sedimentación |

### Coordenadas de puntos de muestreo

Cada punto se define como `(gx, gy)` relativo al punto de anclaje `(x, y)` del área:
- `gx = x + offset_x` (offset entre -40 y +40 unidades viewBox)
- `gy = y + offset_y` (offset entre -40 y +40 unidades viewBox)
- Los offsets se distribuyen para simular ubicaciones reales dentro del área

### Pasos

- [ ] **Paso 1:** Definir la tabla de puntos por arquetipo (arriba)
- [ ] **Paso 2:** Para cada área, generar los puntos de muestreo con offsets calculados
- [ ] **Paso 3:** Agregar los puntos a `evaluacion.puntos_muestreo` en `areas.js`
- [ ] **Paso 4:** Verificar que las coordenadas caen dentro del viewBox (0-1632, 0-1056)

---

## Task 3: Crear módulo `sampling-markers.js`

**Files:**
- Create: `sampling-markers.js`
- Modify: `index.html` (agregar script y toggle)

**Interfaces:**
- Consumes: `AREAS` con bloque `evaluacion.puntos_muestreo`
- Produces: Marcadores SVG sobre el plano con leyenda de tipo de placa

### Funcionalidad

1. `renderSamplingMarkers(svg, areas, level)` — Dibujar marcadores de puntos de muestreo
2. Cada marcador muestra:
   - Icono según tipo: ○ aire (círculo), □ superficie (cuadrado), ▽ agua (triángulo)
   - Color según placa: TSA=azul, Sabouraud=morado, MacConkey=naranja, BCYE=rojo
   - Etiqueta con ID del punto (P1, P2, etc.)
3. Tooltip con: ubicación, método, placa, frecuencia
4. Toggle para mostrar/ocultar puntos de muestreo

### Pasos

- [ ] **Paso 1:** Crear `sampling-markers.js` con la función `renderSamplingMarkers`
- [ ] **Paso 2:** Definir iconos SVG por tipo de muestreo (aire/superficie/agua)
- [ ] **Paso 3:** Definir colores por tipo de placa
- [ ] **Paso 4:** Implementar tooltip para puntos de muestreo
- [ ] **Paso 5:** Agregar toggle "Puntos de muestreo" en el sidebar de `index.html`
- [ ] **Paso 6:** Agregar `<script src="sampling-markers.js">` en `index.html`
- [ ] **Paso 7:** Llamar `renderSamplingMarkers` desde la función `render()` existente

---

## Task 4: Agregar panel STPS en el sidebar

**Files:**
- Modify: `index.html` (agregar sección STPS en sidebar)

**Interfaces:**
- Consumes: `AREAS` con bloques `reconocimiento`, `evaluacion`, `control`
- Produces: Panel visual con resumen de cumplimiento STPS

### Contenido del panel

```
┌─────────────────────────────────┐
│ CUMPLIMIENTO STPS               │
│ Art. 41 RFSST — Agentes Biol.   │
├─────────────────────────────────┤
│ Medida 1: Estudio        ✅/⚠️  │
│ Medida 2: Evaluación     ✅/⚠️  │
│ Medida 3: Exámenes méd.  ❌/⚠️  │
├─────────────────────────────────┤
│ Resumen del nivel:              │
│ • Áreas con muestreo: XX/XX     │
│ • Puntos de muestreo: XX        │
│ • Próxima visita: [fecha]       │
│ • Frecuencia: XX quincenal,     │
│   XX mensual, XX trimestral     │
├─────────────────────────────────┤
│ [Exportar Reporte STPS]         │
│ [Exportar CSV Completo]         │
│ [Exportar Plan Anual]           │
└─────────────────────────────────┘
```

### Pasos

- [ ] **Paso 1:** Agregar sección HTML del panel STPS en el sidebar
- [ ] **Paso 2:** Implementar función `renderSTPSPanel(list)` que calcula métricas
- [ ] **Paso 3:** Mostrar resumen por nivel: áreas cubiertas, puntos, frecuencias
- [ ] **Paso 4:** Agregar botones de exportación
- [ ] **Paso 5:** Integrar con la función `render()` existente

---

## Task 5: Crear módulo `stps-report.js` — Exportador de reporte

**Files:**
- Create: `stps-report.js`
- Modify: `index.html` (agregar script y botones)

**Interfaces:**
- Consumes: `AREAS` con todos los bloques STPS
- Produces: Archivos CSV y PDF con formato STPS

### Reporte CSV — "Estudio de Contaminantes Biológicos"

Columnas:
```
area_id, nivel, nombre_area, categoria, arquetipo, grupo_riesgo,
agente_1_tipo, agente_1_nombre, agente_1_via, agente_1_fuente,
agente_2_tipo, agente_2_nombre, agente_2_via, agente_2_fuente,
vias_exposicion, grupos_expuestos, fuentes_emision, tiempo_exposicion,
punto_id, punto_ubicacion, punto_tipo, punto_metodo, punto_placa,
frecuencia, placas_por_visita, medio_incubacion,
senializacion, acceso_restringido, ventilacion, epp_requerido,
medidas_ingenieria, medidas_administrativas, descontaminacion,
indice_bio, clasificacion, estatus
```

### Reporte CSV — "Plan Anual de Muestreo"

Columnas:
```
prioridad, area_id, nivel, nombre_area, grupo_riesgo, indice_bio,
clasificacion, hotspot, frecuencia, puntos_muestreo, placas_por_visita,
total_placas_anio, medios_requeridos, agentes_a_buscar
```

### Reporte PDF — "Estudio de Contaminantes Biológicos"

Estructura:
1. **Portada:** Razón social, domicilio, fecha, responsable, fundamento legal
2. **Índice**
3. **1. Introducción:** Objeto, alcance, marco normativo (Art. 132 LFT, Art. 41 RFSST, OMS 2005)
4. **2. Reconocimiento:** Metodología, áreas, agentes identificados, vías de exposición
5. **3. Evaluación:** Metodología de muestreo, puntos, frecuencias, medios de cultivo
6. **4. Control:** Medidas de ingeniería, administrativas, EPP
7. **5. Resultados:** Tabla por área con clasificación de riesgo
8. **6. Conclusiones y recomendaciones**
9. **Anexos:** Planos con puntos de muestreo, tabla de agentes, glosario
10. **Firmas:** Responsable, UVEH, dirección

### Pasos

- [ ] **Paso 1:** Crear `stps-report.js` con funciones de exportación
- [ ] **Paso 2:** Implementar `exportSTPSCSV()` — reporte completo por área
- [ ] **Paso 3:** Implementar `exportPlanAnualSTPS()` — plan anual de muestreo
- [ ] **Paso 4:** Implementar `exportSTPSPDF()` — reporte formal con estructura legal
- [ ] **Paso 5:** Agregar `<script src="stps-report.js">` en `index.html`
- [ ] **Paso 6:** Conectar botones de exportación del panel STPS

---

## Task 6: Generar datos STPS para las 255 áreas

**Files:**
- Modify: `data/areas.js`

**Interfaces:**
- Produces: Objeto `reconocimiento`, `evaluacion`, `control` completo para cada área

### Script generador

Crear un script Node.js temporal `generate-stps-data.js` que:

1. Lee `areas.js` actual
2. Para cada área, según su `arquetipo`:
   - Asigna agentes biológicos (de la tabla §5.bis METODOLOGIA.md)
   - Asigna vías de exposición
   - Genera puntos de muestreo con coordenadas relativas
   - Asigna frecuencia según clasificación
   - Asigna medios de cultivo
   - Asigna medidas de control
3. Escribe `areas.js` actualizado

### Mapeo arquetipo → agentes

```javascript
const AGENTES_POR_ARQUETIPO = {
  urgencias: [
    { tipo: "bacteria", nombre: "Staphylococcus aureus/SARM", via: "contacto/inhalación", fuente: "pacientes, superficies" },
    { tipo: "bacteria", nombre: "Streptococcus spp.", via: "inhalación/contacto", fuente: "pacientes, aerosoles" },
    { tipo: "virus", nombre: "Virus respiratorios (Influenza, SARS-CoV-2)", via: "inhalación", fuente: "pacientes, aerosoles" },
    { tipo: "bacteria", nombre: "Gram-negativos MDR (Acinetobacter, Klebsiella)", via: "contacto", fuente: "pacientes, superficies" }
  ],
  quirofano: [
    { tipo: "bacteria", nombre: "S. aureus/SARM", via: "contacto", fuente: "personal, pacientes" },
    { tipo: "bacteria", nombre: "Streptococcus pyogenes", via: "contacto/inhalación", fuente: "personal" },
    { tipo: "hongo", nombre: "Aspergillus spp.", via: "inhalación", fuente: "aire, filtros HVAC" },
    { tipo: "bacteria", nombre: "Pseudomonas aeruginosa", via: "contacto", fuente: "agua, superficies" }
  ],
  // ... etc para cada arquetipo
};
```

### Pasos

- [ ] **Paso 1:** Crear script `generate-stps-data.js`
- [ ] **Paso 2:** Definir mapeo de agentes por arquetipo (basado en §5.bis)
- [ ] **Paso 3:** Definir mapeo de puntos de muestreo por arquetipo
- [ ] **Paso 4:** Definir mapeo de controles por arquetipo
- [ ] **Paso 5:** Ejecutar script y generar `areas.js` actualizado
- [ ] **Paso 6:** Verificar que la app carga correctamente con los nuevos datos
- [ ] **Paso 7:** Eliminar script temporal

---

## Task 7: Actualizar panel de muestreo existente

**Files:**
- Modify: `index.html` (panel de muestreo en sidebar)

**Interfaces:**
- Consumes: `AREAS` con bloques STPS
- Produces: Panel de muestreo mejorado con datos STPS

### Cambios al panel existente

1. Agregar sección "Puntos de muestreo por área" en el tooltip
2. Mostrar número de puntos y placas por área en el ranking
3. Agregar indicador visual de áreas con muestreo definido
4. Mejorar el tooltip con: agentes, vías, puntos, placas

### Tooltip mejorado

```
Área: Urgencias
Nivel: N1 · GR3 · Clínica crítica
Índice bio: 4.25 · Crítico · ◆ Hotspot

--- Muestreo STPS ---
Frecuencia: Quincenal (15 días)
Puntos: 4 (2 aire, 2 superficie)
Placas/visita: 8 (TSA×4, Sabouraud×4)
Método: Volumétrico + RODAC

--- Agentes a buscar ---
• S. aureus/SARM (contacto/inhalación)
• Virus respiratorios (inhalación)
• Gram-negativos MDR (contacto)

--- Control ---
EPP: guantes, bata, protección ocular
Ventilación: mecánica con HEPA
Señalización: Sí
Acceso restringido: No

Estatus: Preliminar
```

### Pasos

- [ ] **Paso 1:** Modificar `showTip()` para incluir datos STPS
- [ ] **Paso 2:** Agregar indicadores de muestreo en el ranking
- [ ] **Paso 3:** Agregar badge de "Muestreo definido" en marcadores
- [ ] **Paso 4:** Probar tooltip con diferentes tipos de área

---

## Task 8: Verificación y pruebas

**Files:**
- Test: `tests/stps-compliance.test.js`

### Criterios de aceptación

1. ✅ Las 255 áreas tienen bloque `reconocimiento` con al menos 1 agente
2. ✅ Las 255 áreas tienen bloque `evaluacion` con al menos 1 punto de muestreo
3. ✅ Las 255 áreas tienen bloque `control` con EPP y medidas
4. ✅ El panel STPS muestra métricas correctas por nivel
5. ✅ El exportador CSV genera archivo con todas las columnas del Art. 41
6. ✅ El exportador CSV del Plan Anual incluye todas las áreas
7. ✅ Los puntos de muestreo se renderizan sobre el plano SVG
8. ✅ El tooltip muestra datos STPS completos
9. ✅ La app carga sin errores con los nuevos datos
10. ✅ Los colores de los marcadores de muestreo son distinguibles

### Pasos

- [ ] **Paso 1:** Crear archivo de pruebas `tests/stps-compliance.test.js`
- [ ] **Paso 2:** Verificar integridad de datos (255 áreas con los 3 bloques)
- [ ] **Paso 3:** Verificar coordenadas de puntos dentro del viewBox
- [ ] **Paso 4:** Verificar exportación CSV con todas las columnas
- [ ] **Paso 5:** Verificar renderizado visual en el navegador
- [ ] **Paso 6:** Verificar que el Plan Anual incluye las 255 áreas
- [ ] **Paso 7:** Documentar hallazgos y ajustar

---

## Orden de ejecución

```
Task 1 (estructura) → Task 6 (datos) → Task 2 (puntos) → Task 3 (markers)
→ Task 4 (panel) → Task 5 (reportes) → Task 7 (tooltip) → Task 8 (verificación)
```

Las Tasks 3, 4, 5 pueden ejecutarse en paralelo después de completar Task 6.

---

## Referencias legales

| Documento | Artículo | Requisito |
|---|---|---|
| LFT | 132 fracc. I, XVII | Obligaciones del patrón en materia de seguridad |
| LFT | 512-D | Contaminantes del ambiente laboral |
| RFSST | 41 fracc. I | Estudio de contaminantes biológicos |
| RFSST | 41 fracc. II | Reconocimiento de contaminantes biológicos |
| RFSST | 41 fracc. III | Señalamientos de precaución |
| RFSST | 41 fracc. IV | Control de acceso a zonas restringidas |
| RFSST | 41 fracc. V | Evaluación de concentración con frecuencia |
| RFSST | 41 fracc. VI | Medidas de control |
| RFSST | 41 fracc. VII | Equipo de protección personal |
| RFSST | 41 fracc. IX | Exámenes médicos |
| RFSST | 41 fracc. XIII | Registros |
| OMS | Manual Bioseguridad 3ª ed. | Grupos de riesgo, niveles de bioseguridad |
| OMS | Cap. 2 | Evaluación del riesgo microbiológico |
| OMS | Cap. 14 | Desinfección y esterilización |
