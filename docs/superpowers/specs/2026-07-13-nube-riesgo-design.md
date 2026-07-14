# Nube de riesgo por clasificación

## Objetivo

Agregar una capa visual opcional que agrupe los marcadores visibles del mapa de
calor por clasificación de riesgo. La capa ayuda a identificar zonas candidatas
para muestreo ambiental sin modificar el plano, los puntajes ni la clasificación
calculada de cada área.

## Alcance aprobado

- Habrá un control independiente, `Nube de riesgo`, para mostrar u ocultar la
  capa sin afectar los círculos individuales.
- Se dibujará una nube independiente por cada clasificación que permanezca
  marcada en el filtro: Crítico, Alto, Medio y Bajo.
- Cada nube usará el color de su clasificación y un degradado radial: intenso
  junto a cada marcador y progresivamente transparente hacia el exterior.
- Los halos cercanos de la misma clasificación se superpondrán para sugerir una
  zona continua de concentración.
- Los círculos, sus índices, los anillos de hotspot y sus interacciones se
  dibujarán por encima de la nube.
- La capa se recalculará al cambiar de nivel, modelo, clasificación visible o
  estado del control. Se incluirá en las exportaciones SVG y PNG existentes.

## Diseño técnico

`index.html` conservará el plano original y creará dos grupos dentro del SVG:

1. `risk-cloud-layer`, detrás de los marcadores, para los halos de la nube.
2. `heatmap-layer`, existente, para círculos, etiquetas e interacciones.

Por cada área visible de una clasificación activa, la capa de nube insertará un
círculo más grande con el color de riesgo, opacidad gradual y desenfoque SVG.
El filtro de clasificación será la fuente de verdad: si una clasificación se
desmarca, ni sus círculos ni su nube se renderizan.

El halo es una representación de intensidad visual. No traza límites físicos de
las áreas, no define por sí solo una coordenada exacta para una placa de Petri y
no sustituye la validación de muestreo en campo.

## Criterios de aceptación

1. Con el control apagado, el aspecto de los marcadores coincide con el mapa
   actual y no se muestra ninguna nube.
2. Con Crítico y Alto visibles y el control encendido, aparecen halos rojos y
   naranjas independientes detrás de sus respectivos marcadores.
3. Al activar las cuatro clasificaciones visibles, aparecen las cuatro nubes.
4. Al desmarcar una clasificación, se elimina su nube y sus marcadores.
5. Los cambios de nivel o de modelo actualizan la nube sin dejar elementos del
   plano anterior.
6. SVG y PNG exportados contienen la nube cuando el control está encendido.
7. La lógica de cálculo, los puntajes y el contenido de `AREAS` no cambian.

## Verificación

Se añadirá una prueba automatizada que compruebe la creación de una nube por
clasificación visible, el respeto al filtro y la ausencia de la nube cuando el
control esté desactivado. También se realizará una comprobación visual del
renderizado y de las exportaciones.
