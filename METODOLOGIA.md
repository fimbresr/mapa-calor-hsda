# Metodología: nomenclatura y método de cálculo — Mapa de Calor HSDA

**Hospital San Diego de Alcalá · v1.1 · 2026-07-09 · Estatus: preliminar**
Documento de trazabilidad para auditoría (RFSST Art. 41, NOM-048-SSA1-1993, NOM-087-SEMARNAT-SSA1-2002, Manual de Bioseguridad OMS 3ª ed./2020).

Este documento describe **cómo se nombra y cómo se calcula** cada dato del mapa. Todo puntaje es preliminar, derivado por tipo de área y **editable** en la app; ningún valor sustituye el levantamiento en campo ni el dictamen de laboratorio acreditado EMA.

---

## 1. Nomenclatura

### 1.1 Identificador de área (`area_id`)
Formato `NIVEL-NN`:
- `NIVEL` ∈ {`N1`,`N2`,`N3`,`N4`}: niveles arquitectónicos del hospital. (Cubierta de equipos y azotea fueron **excluidas** del estudio.)
- `NN` = consecutivo de dos dígitos por nivel (orden de extracción de etiquetas del plano).
- Ejemplos: `N1-04` Urgencias · `N2-15` Quirófano 1 · `N3-27` UCIN · `AZ-01` Equipos HVAC.

### 1.2 Esquema de datos por área
```
area_id        ID único (NIVEL-NN)
nombre_area    nombre real leído del plano SVG (no se inventa ni se altera)
categoria      etiqueta legible del arquetipo
arquetipo      clave del tipo de área (motor de puntajes; ver §3.3)
x, y           coordenada de anclaje en el viewBox del SVG (0–1632, 0–1056)
geo_aprox      true si la ubicación es aproximada (plano sin etiqueta; solo azotea)
gr, gr_label   Grupo de Riesgo OMS (1–4) y su descripción
mf { ... }     puntajes 1–5 e índice del modelo multifactor
bio { ... }    puntajes 1–5 e índice del modelo biológico
muestreo {..}  tipo, medios, incubación y exposición de muestreo
micro {..}     qué buscar (objetivos) y qué significa si se detecta (§5.bis)
estatus        Preliminar | Validado en campo | Corregido | Pendiente | No aplica
```

### 1.3 Clasificación de riesgo y color (ambos modelos)
| Índice | Clasificación | Color |
|---:|---|---|
| 4.00–5.00 | Crítico | Rojo `rgba(239,68,68,.58)` |
| 3.00–3.99 | Alto | Naranja `rgba(249,115,22,.55)` |
| 2.00–2.99 | Medio | Amarillo `rgba(250,204,21,.50)` |
| 1.00–1.99 | Bajo | Verde `rgba(132,204,22,.45)` |

### 1.4 Grupos de Riesgo OMS (`gr`)
| GR | Significado |
|---:|---|
| 1 | Riesgo individual y poblacional escaso o nulo. |
| 2 | Riesgo individual moderado, poblacional bajo (mínimo requerido en hospital/laboratorio clínico). |
| 3 | Riesgo individual elevado, poblacional bajo (enfermedad grave, poca propagación interpersonal). |
| 4 | Riesgo individual y poblacional elevado, transmisión fácil, sin tratamiento eficaz. |

### 1.5 Nomenclatura de la capa Muestreo
- **Hotspot (◆):** área designada como Punto Crítico de Muestreo. Definición operativa: `aerosoles ≥ 4` **y** `interrelación ≥ 4` (intersección de Capa 1 «generación de aerosoles» × Capa 2 «alto flujo de personal»).
- **Frecuencia diferenciada** (derivada de la clasificación biológica):
  Crítico → **Quincenal** · Alto → **Mensual** · Medio → **Trimestral** · Bajo → **Semestral**.

---

## 2. Fuentes de datos
| Dato | Fuente | Naturaleza |
|---|---|---|
| Geometría / nombre de área | 4 planos SVG reales (N1–N4) | Dato real |
| Coordenada de anclaje | `transform="matrix(0.04,0,0,0.04,tx,ty)"` de cada etiqueta | Dato real |
| Ocupación por depto/turno | `Empleados Descripcion1.xls` (195 registros) | Inferido por puesto |
| Puntajes 1–5 por variable | Motor de arquetipos (§3.3) | Preliminar, editable |
| Incidentes | Sin bitácora cargada → valor fijo **1** | Supuesto (pendiente) |
| GR, parámetros de muestreo | Asignación por arquetipo | Preliminar, editable |

---

## 3. Método de cálculo

### 3.1 Extracción de geometría
Cada etiqueta de texto del SVG trae `transform="matrix(0.04,0,0,0.04,tx,ty)"`. Los valores `tx, ty` son la posición directa en el viewBox. Se extraen todos los textos, se agrupan por proximidad (Δx<25, Δy<12) para reconstruir nombres multilínea, y el centroide del grupo es el punto de anclaje `(x,y)`. **No se redibuja el plano**: solo se sobrepone un marcador translúcido sobre la etiqueta real. (Fase 2 pendiente: polígonos exactos del contorno.)

### 3.2 Ocupación inferida
El Excel no tiene columna de área física. Se deriva: `puesto → departamento` (tabla de reglas por palabra clave, p. ej. «Gerenta de Enfermería» → Enfermería) y `horario → turno` (hora de inicio: 06–11 matutino, 12–16 vespertino, ≥17/<6 nocturno, «ADMINISTRATIVO» administrativo). Se agrega el conteo por departamento×turno (`data/plantilla.js`) y se muestra como **evidencia de contexto** en el tooltip, no como asignación validada por área.

### 3.3 Asignación de puntajes por arquetipo
Cada área se clasifica en un **arquetipo** por coincidencia de palabra clave con su nombre real (primer match, del más específico al más genérico). El arquetipo define un vector de puntajes 1–5, de modo que **el color depende de un cálculo reproducible y no de una asignación manual caso por caso**. Criterios 1–5 según las tablas de las especificaciones fuente (ocupación, interrelación, exposición, controles, etc.).

Convención de vectores:
`mf = [ocupación, interrelación, biológico, infeccioso, químico, físico, incidentes, controles]`
`bio = [ocupación, contacto_paciente, sangre/fluidos, procedimientos, RPBI, muestras, aerosoles, interrelación, incidentes, controles]`

### 3.4 Fórmula — modelo Multifactor
```
índice_mf = ocup·0.15 + interrel·0.15 + biológico·0.20 + infeccioso·0.15
          + químico·0.15 + físico·0.10 + incidentes·0.10 − (controles−1)·0.10
índice_mf = max(1, min(5, índice_mf))     // acotado a [1,5]
```

### 3.5 Fórmula — modelo Biológico
```
índice_bio = ocup·0.10 + contacto_pac·0.15 + sangre/fluidos·0.15 + procedimientos·0.10
           + RPBI·0.15 + muestras·0.10 + aerosoles·0.10 + interrel·0.10
           + incidentes·0.10 − (controles−1)·0.10
índice_bio = max(1, min(5, índice_bio))
```
Nota: en ambas fórmulas los **controles restan** riesgo (más control = menor índice). La app recalcula en vivo al editar cualquier puntaje.

### 3.6 Clasificación
Umbrales de §1.3 aplicados sobre el índice del modelo activo.

### 3.7 Capa Muestreo (deriva del modelo biológico)
1. **GR:** asignado por arquetipo (§4).
2. **Hotspot:** `aerosoles ≥ 4 AND interrelación ≥ 4`.
3. **Frecuencia:** función directa de la clasificación biológica (§1.5).
4. **Parámetros** (tipo/medios/incubación/exposición): por grupo de arquetipo (§5). Regla técnica respetada: hongos ambientales se incuban a **25–30 °C**, no a 37 °C, para evitar falsos negativos.

---

## 4. Tabla maestra de arquetipos (auditable)

Vectores `mf` y `bio` en el orden de §3.3.

| Arquetipo | Categoría | GR | mf | bio |
|---|---|:--:|---|---|
| urgencias | Clínica crítica | 3 | 5,5,5,5,2,3,1,3 | 5,5,5,5,5,3,5,5,1,3 |
| quirofano | Quirúrgica | 2 | 4,5,4,4,4,4,1,4 | 4,5,5,5,5,3,4,5,1,4 |
| uci | Cuidados intensivos | 2 | 4,5,5,5,3,3,1,4 | 4,5,4,4,4,3,5,4,1,4 |
| ucin | Neonatal | 2 | 4,5,5,5,2,3,1,4 | 4,5,4,4,4,3,5,4,1,4 |
| aislamiento | Aislamiento | 3 | 3,4,4,5,2,2,1,3 | 3,5,4,4,4,3,5,4,1,4 |
| laboratorio | Laboratorio | 3 | 4,4,5,3,4,3,1,4 | 4,2,5,4,5,5,2,4,1,4 |
| banco_sangre | Banco de sangre | 3 | 3,4,5,3,3,2,1,4 | 3,2,5,3,4,5,1,4,1,4 |
| ceye | Esterilización/CEYE | 2 | 3,5,4,3,4,3,1,4 | 3,2,5,4,5,2,2,5,1,4 |
| rpbi | RPBI | 2 | 2,5,5,4,3,3,1,3 | 2,1,5,2,5,3,3,5,1,3 |
| septico | Séptico | 2 | 2,4,5,4,3,2,1,2 | 2,1,5,2,4,2,3,4,1,2 |
| morgue | Morgue | 3 | 2,3,5,3,3,3,1,3 | 2,2,5,3,4,2,2,3,1,3 |
| endoscopia | Endoscopia/Fluoroscopia | 3 | 3,4,4,4,3,4,1,4 | 3,4,5,5,4,3,5,4,1,4 |
| area_blanca | Área blanca/flujo laminar | 1 | 3,3,3,3,4,2,1,4 | 3,2,2,4,2,2,2,3,1,4 |
| imagen | Imagenología | 2 | 3,3,3,3,2,4,1,3 | 3,3,2,3,2,2,2,3,1,3 |
| hospitalizacion | Hospitalización | 2 | 4,3,3,4,2,2,1,3 | 4,4,3,3,3,2,3,3,1,3 |
| enfermeria | Central de enfermería | 2 | 4,5,4,4,3,2,1,3 | 4,4,4,3,3,3,3,5,1,3 |
| recuperacion | Recuperación | 2 | 3,4,4,4,2,2,1,3 | 3,4,4,3,3,2,3,4,1,3 |
| preanestesia | Preanestesia | 2 | 3,3,3,3,2,2,1,3 | 3,4,3,3,2,2,3,3,1,3 |
| curaciones | Curaciones/Valoración | 2 | 3,3,4,4,3,2,1,3 | 3,4,4,4,3,3,2,3,1,3 |
| gases | Gases medicinales | 1 | 1,2,1,1,3,5,1,3 | 1,1,1,1,1,1,1,2,1,3 |
| tecnico_elec | Técnico/Eléctrico | 1 | 1,2,1,1,2,5,1,2 | 1,1,1,1,1,1,1,2,1,2 |
| prep_med | Preparación medicamentos | 2 | 3,4,2,2,4,2,1,4 | 3,2,2,3,2,2,2,4,1,4 |
| ambulancias | Acceso ambulancias | 2 | 3,4,4,4,2,3,1,3 | 3,4,4,3,3,2,3,4,1,3 |
| consultorio | Consultorio | 1 | 3,3,3,3,2,2,1,3 | 3,4,2,3,2,2,2,3,1,3 |
| farmacia | Farmacia | 1 | 3,3,2,2,4,2,1,4 | 2,2,1,2,2,2,1,3,1,4 |
| limpieza | Limpieza/Aseo | 2 | 3,5,4,3,4,3,1,3 | 3,2,4,4,4,2,3,5,1,3 |
| sanitarios | Sanitarios/Vestidores | 2 | 3,3,4,3,3,2,1,2 | 3,2,4,2,3,2,3,3,1,2 |
| cocina | Cocina/Comedor | 1 | 3,3,2,2,3,3,1,3 | 3,1,1,2,2,1,1,3,1,3 |
| espera | Sala de espera/Lobby | 1 | 4,3,2,3,1,1,1,2 | 4,3,2,2,1,1,3,3,1,2 |
| circulacion | Circulación/Transfer | 1 | 3,5,3,3,2,2,1,2 | 3,2,3,2,3,2,3,5,1,2 |
| admision | Admisión/Recepción | 1 | 4,3,2,3,1,1,1,3 | 4,3,1,2,1,1,2,3,1,3 |
| mantenimiento | Mantenimiento/Biomédica | 1 | 2,4,2,2,3,4,1,3 | 2,1,2,3,2,1,1,4,1,3 |
| camilleria | Camillería | 2 | 3,5,4,3,2,3,1,3 | 3,4,4,3,3,2,3,5,1,3 |
| archivo | Archivo clínico | 1 | 2,2,2,2,1,1,1,3 | 2,2,1,1,1,1,1,2,1,3 |
| administrativo | Administrativa | 1 | 2,2,1,1,1,1,1,3 | 2,1,1,1,1,1,1,2,1,3 |
| hvac | HVAC/Azotea técnica | 2 | 1,2,2,1,2,5,1,2 | 1,1,2,2,2,2,3,2,1,2 |

---

## 5. Parámetros de muestreo por grupo de arquetipo

| Grupo (arquetipos) | Tipo de muestreo | Medios | Incubación | Exposición |
|---|---|---|---|---|
| Quirófano/limpio (quirofano, ceye, área_blanca, uci, ucin, recuperación) | Aire (volumétrico + sedimentación) y superficies | TSA (bacterias) + Sabouraud/PDA (hongos) | TSA 35–37 °C 24–48 h; hongos 25–30 °C 3–7 d | Sedimentación 15 min; volumétrico según equipo |
| Aerosol clínico (urgencias, aislamiento, endoscopia) | Aire prioritario + superficies de alto contacto | TSA + Sabouraud/PDA; selectivos según patógeno | TSA 35–37 °C 24–48 h; hongos 25–30 °C 3–7 d | Sedimentación 15 min; dirigido post-procedimiento |
| Laboratorio (laboratorio, banco_sangre) | Superficies + aire (centrífugas/vórtex) | TSA + Sabouraud/PDA | TSA 35–37 °C 24–48 h; hongos 25–30 °C 3–7 d | Contacto/hisopo en mesas y equipo; sedimentación 15 min |
| RPBI/séptico (rpbi, septico, morgue) | Superficies y puntos de acopio/tránsito | TSA + Sabouraud/PDA | TSA 35–37 °C 24–48 h; hongos 25–30 °C 3–7 d | Hisopo/contacto; sedimentación 15 min |
| Hospitalización general (hospitalizacion, enfermeria, curaciones, preanestesia, ambulancias, camilleria, prep_med, imagen, consultorio) | Superficies de alto contacto (aire si hay procedimiento) | TSA (+ Sabouraud/PDA si humedad) | TSA 35–37 °C 24–48 h; hongos 25–30 °C 3–7 d | Contacto/hisopo; sedimentación 15 min si aplica |
| HVAC/azotea (hvac) | Agua de condensados/charolas + superficies de filtros | BCYE (Legionella) + Sabouraud/PDA | BCYE 35 °C 3–10 d; hongos 25–30 °C 3–7 d | Agua/biofilm + hisopo de ductos/charolas |
| Servicios (limpieza, sanitarios, cocina) | Superficies | TSA + Sabouraud/PDA | TSA 35–37 °C 24–48 h; hongos 25–30 °C 3–7 d | Contacto/hisopo |
| Administrativa/técnica (administrativo, archivo, espera, admision, circulacion, farmacia, gases, tecnico_elec, mantenimiento) | Validación de superficies (baja frecuencia) | TSA (+ Sabouraud/PDA opcional) | TSA 35–37 °C 24–48 h | Contacto/hisopo; sedimentación 15 min opcional |

---

## 5.bis Qué buscar y qué significa si se detecta (por grupo de área)

Objetivos microbiológicos candidatos y su interpretación. Los objetivos definitivos y los puntos de corte los fija UVEH con el laboratorio acreditado; aquí se listan como guía para el muestreo dirigido.

| Grupo de área | Qué buscar | Qué significa si se detecta |
|---|---|---|
| Quirófano/limpias (quirófano, CEYE, área blanca, UCI, UCIN, recuperación, prep. medicamentos, farmacia) | Recuento UFC bacterias y hongos; S. aureus/SARM, Aspergillus y mohos, Gram-negativos (Pseudomonas) | Estándar = recuento muy bajo. Aspergillus/mohos → riesgo de ISQ y aspergilosis en inmunodeprimidos (revisar HEPA/HVAC); SARM → falla de asepsia; Gram-negativos → contaminación por agua/superficie. Suspender uso hasta corregir. |
| Aerosol clínico (urgencias, aislamiento, endoscopia) | Aislamiento: M. tuberculosis (medio específico), virus respiratorios (PCR); flora respiratoria; Aspergillus | TB → transmisión aérea activa: verificar presión negativa y recambios, activar protocolo de exposición. Aspergillus → riesgo en inmunodeprimidos. Prioriza muestreo post-procedimientos generadores de aerosoles. |
| Laboratorio (laboratorio, banco de sangre) | Enterobacterias, S. aureus, hongos; indicadores de derrame/contención | Brecha de bioseguridad/limpieza (BSL-2 mínimo). En banco de sangre → riesgo de contaminación de hemocomponentes. |
| RPBI/séptico/morgue | Coliformes/enterobacterias (indicador fecal), Clostridioides, hongos, biofilm; flora de descomposición | Coliformes → contaminación fecal o cruce limpio/sucio: validar rutas y desinfección. Confirma punto crítico de ruta sucia. |
| Hospitalización general (hospitalización, enfermería, curaciones, preanestesia, ambulancias, camillería, imagen, consultorio) | S. aureus/SARM, Enterococcus/ERV, Acinetobacter, Klebsiella y Gram-negativos MDR, C. difficile (esporas) | MDR/SARM/ERV/C. difficile → riesgo de IAAS y transmisión por superficies: reforzar desinfección terminal e higiene de manos. Indicador directo de la limpieza. |
| HVAC/técnica (hvac) | Legionella (BCYE) en condensados/agua; hongos filamentosos en filtros/ductos; biofilm | Legionella → riesgo de legionelosis (agravado por conexión a áreas críticas): desinfección/purga del sistema. Hongos en filtros → fuente de esporas a quirófano/UCI. |
| Servicios (limpieza, sanitarios, cocina) | Sanitarios: coliformes, E. coli, hongos. Cocina: Salmonella, Listeria, coliformes, S. aureus | Coliformes/E. coli → deficiencia de higiene. En cocina, patógenos entéricos → riesgo de inocuidad alimentaria para pacientes y POE. |
| Administrativa/técnica (administrativo, archivo, espera, admisión, circulación, gases, eléctrico, mantenimiento) | Recuento general UFC (validación); hongos ambientales por humedad/polvo | Baja prioridad; validación. Recuento fúngico alto → problema de humedad/HVAC, no de actividad clínica. |

## 5.ter Glosario de medios y métodos

- **TSA** (Tripticaseína Soya Agar): medio general para **bacterias**, 35–37 °C, 24–48 h. Base del recuento bacteriano.
- **Sabouraud (SDA)**: medio ácido para **hongos y levaduras**, 25–30 °C, 3–7 d.
- **PDA** (Papa Dextrosa Agar): para **mohos/filamentosos** y esporulación, 25–30 °C.
- **Agar sangre**: enriquecido general; revela **hemólisis** (Streptococcus, S. aureus).
- **Agar chocolate**: para **exigentes** (Haemophilus, Neisseria).
- **MacConkey**: selectivo/diferencial de **Gram-negativos entéricos** (fermentadores vs no de lactosa).
- **BCYE**: selectivo para **Legionella** (agua/condensados), 35 °C, 3–10 d.
- **Löwenstein-Jensen / MGIT**: para **Mycobacterium tuberculosis** (crecimiento lento, semanas).
- **Baird-Parker / Manitol sal**: selectivos para **S. aureus** (incl. SARM).
- **Cicloserina-cefoxitina / CHROMagar C. difficile**: para **Clostridioides difficile**.
- **Placa de contacto (RODAC) / hisopo**: **método de superficie** (recuento por área).
- **Muestreo de aire**: **volumétrico** (UFC/m³) o **sedimentación** (placas expuestas 15 min).
- **UFC**: Unidad Formadora de Colonias (≈ un microorganismo viable cultivable).
- **MDR**: multidrogorresistente (mayor riesgo de IAAS).

Regla técnica: los hongos se incuban a **25–30 °C**, no a 37 °C, para no producir falsos negativos.

---

## 6. Supuestos y límites (declararlos ante inspección)
1. **Incidentes = 1** en todas las áreas (sin bitácora). El modelo multifactor no alcanza «Crítico» por este motivo; el biológico sí. Al cargar incidentes reales, cambia el ranking.
2. **Ocupación inferida** por puesto, no validada por área física.
3. **Puntajes, GR y parámetros = preliminares** por arquetipo; deben validarse con jefaturas, UVEH, mantenimiento, limpieza y laboratorio.
4. **Capa 2 (rutas)** aproximada con `interrelación`; faltan rutas trazadas de personal/limpieza/RPBI/muestras.
5. **Alcance:** el estudio cubre N1–N4. Cubierta de equipos área limpia y azotea de equipos fueron excluidas por decisión del responsable.
6. **Validación legal:** los hotspots deben muestrearse con laboratorio acreditado EMA/STPS. Los análisis internos no eximen obligaciones (RFSST Art. 41).

---

## 7. Verificación
- Fórmula JS de la app idéntica al precálculo (Python): **0 desajustes** en 255 áreas.
- Coordenadas fuera del viewBox: **0**.
- Integridad de los 4 SVG N1–N4 (viewBox y cierre): **OK**.
- Sintaxis de la app: **OK**.
- Alcance: N1 85 · N2 50 · N3 59 · N4 61 = **255 áreas**. GR1 98 · GR2 124 · GR3 33.
- Plan Anual: 255 áreas → 12 quincenal, 67 mensual, 126 trimestral, 50 semestral; **23 hotspots**.
