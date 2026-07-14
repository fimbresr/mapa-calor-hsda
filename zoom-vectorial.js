(function attachVectorZoom(global) {
  const WIDTH = 1632;
  const HEIGHT = 1056;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 14;

  function resetView() {
    return { z: 1, x: 0, y: 0 };
  }

  function zoomAt(view, factor, x, y, width = WIDTH, height = HEIGHT) {
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.z * factor));
    const currentWidth = width / view.z;
    const currentHeight = height / view.z;
    const nextWidth = width / z;
    const nextHeight = height / z;
    const ratioX = x / width;
    const ratioY = y / height;
    return {
      z,
      x: Math.max(0, Math.min(width - nextWidth, view.x + ratioX * (currentWidth - nextWidth))),
      y: Math.max(0, Math.min(height - nextHeight, view.y + ratioY * (currentHeight - nextHeight))),
    };
  }

  function panBy(view, dx, dy, width = WIDTH, height = HEIGHT) {
    const visibleWidth = width / view.z;
    const visibleHeight = height / view.z;
    return {
      ...view,
      x: Math.max(0, Math.min(width - visibleWidth, view.x - dx / view.z)),
      y: Math.max(0, Math.min(height - visibleHeight, view.y - dy / view.z)),
    };
  }

  global.VectorZoom = { panBy, resetView, zoomAt };
})(window);
