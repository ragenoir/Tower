(() => {
'use strict';
const TD = window.TD;
const { MAP_W, MAP_H } = TD;

TD.validateMap = function validateMap(m) {
  const errors = [], warnings = [];
  if (!m || !m.id) errors.push('missing id');
  if (!m.corners || m.corners.length < 2) errors.push('corners need 2+ points');
  else {
    for (let i = 0; i < m.corners.length; i++) {
      const [c, r] = m.corners[i];
      if (c < 0 || c >= MAP_W || r < 0 || r >= MAP_H) errors.push('corner ' + i + ' out of bounds');
    }
    const path = TD.expandTilePath(m.corners);
    if (path.length < 2) errors.push('path too short');
    const start = path[0], end = path[path.length - 1];
    if (start[0] === end[0] && start[1] === end[1]) warnings.push('path start equals end');
  }
  const rows = m.rows || TD.buildMapRows(m.corners || [], m.bushes || [], m.water || []);
  const slots = m.slots || TD.autoBuildSlots(rows, m.corners, m.slotCount || 15);
  if (slots.length < (m.slotCount || 15) * 0.6) warnings.push('only ' + slots.length + ' build slots');
  for (const [c, r] of slots) {
    if (rows[r][c] !== 'G') errors.push('slot [' + c + ',' + r + '] not on grass');
  }
  return { ok: errors.length === 0, errors, warnings, slotCount: slots.length };
};

})();