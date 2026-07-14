# Regiones conectadas y puntos de muestreo

## Objetivo

Complementar las nubes de riesgo con regiones de concentración identificables y
un punto recomendado de muestreo por cada región. El resultado orienta la
priorización visual de placas de Petri; no sustituye la evaluación y validación
en campo.

## Alcance aprobado

- Las áreas se agrupan de forma independiente por clasificación: Crítico,
  Alto, Medio y Bajo.
- Dos áreas pertenecen a la misma región cuando sus radios de nube se
  intersectan. Las regiones de una clasificación no se mezclan con otras.
- Cada región conectada recibe un solo punto recomendado de muestreo.
- El punto se calcula como centro ponderado por el índice de riesgo activo;
  los índices mayores atraen más el resultado.
- Si el centro ponderado no queda dentro de la zona de nube de su región, se
  usa como respaldo el marcador con mayor índice de esa región.
- Cada región se enmarca con un contorno suavizado de línea punteada y del
  color de su clasificación.
- Los puntos, contornos y sus etiquetas se muestran únicamente mientras la
  nube esté activada y su clasificación siga visible en el filtro.
- Círculos de áreas, etiquetas, hotspots y sus interacciones permanecen por
  encima de las nubes y contornos.
- SVG y PNG exportados incluyen regiones y puntos cuando la nube está activa.

## Diseño técnico

Una utilidad pura agrupará los elementos de nube mediante componentes conexos:
dos centros se conectan si la distancia entre ellos es menor o igual que la
suma de sus radios. Para cada componente calculará el centro ponderado con el
índice al cuadrado como peso, con el marcador de mayor índice como respaldo.

El renderizador SVG añadirá una capa de anotaciones entre la nube y los
marcadores. En ella dibujará un contorno suavizado alrededor del conjunto de
centros y una diana en el punto recomendado. El contorno será informativo, no
una geometría arquitectónica ni un límite sanitario real.

## Criterios de aceptación

1. Áreas de diferente clasificación nunca se agrupan en una misma región.
2. Áreas de la misma clasificación con nubes que no se tocan generan regiones
   y puntos recomendados independientes.
3. Áreas de la misma clasificación con nubes conectadas generan un único
   contorno y un único punto.
4. El punto se desplaza hacia los índices superiores y usa el marcador de
   mayor índice cuando el centro quede fuera de la región.
5. Desactivar la nube o desmarcar una clasificación elimina sus regiones,
   contornos y puntos sin alterar marcadores ni datos.
6. Los contornos y puntos se incluyen en SVG y PNG exportados.
7. No cambian fórmulas, datos, arquetipos, puntajes ni clasificación de
   riesgo.
