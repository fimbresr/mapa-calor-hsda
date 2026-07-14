(function attachRiskCloud(global) {
  function buildEntries(areas, scoreKey, classOn, enabled) {
    if (!enabled) return areas.slice(0, 0);
    return areas
      .map((area) => ({ area, score: area[scoreKey] }))
      .filter(({ score }) => classOn[score.clasificacion]);
  }

  global.RiskCloud = { buildEntries };
})(window);
