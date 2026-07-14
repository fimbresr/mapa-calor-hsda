# Zoom Vectorial Legible

## Objetivo

Mantener legibles al acercar el zoom los textos originales del plano, los
índices de los marcadores y las anotaciones de regiones de muestreo.

## Diseño aprobado

- Reemplazar el escalado CSS del elemento `<svg>` por cambios a su `viewBox`.
- Conservar rueda, botones, arrastre, pellizco y botón de reajuste.
- Anclar el zoom al cursor o al punto medio del pellizco.
- El arrastre desplaza la ventana visible dentro del `viewBox` sin rasterizar
  el contenido.
- El reajuste restituye el `viewBox` completo `0 0 1632 1056`.
- No modificar planos, datos, fórmulas, capas de nube ni marcadores.

## Criterios de aceptación

1. Los textos del SVG y las etiquetas añadidas permanecen vectoriales al
   acercar mediante rueda, botones o pellizco.
2. El zoom se centra en el punto de interacción.
3. Arrastrar desplaza el plano visible sin activar clics de marcador.
4. Reajustar vuelve al encuadre completo y 100%.
5. Los límites mínimo y máximo de zoom se mantienen.
