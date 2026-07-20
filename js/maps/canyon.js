(() => {
'use strict';
const TD = window.TD = window.TD || {};
TD.mapCanyon = {
  id: 'canyon', name: 'Canyon', theme: 'canyon',
  corners: [[2, 2], [18, 2], [18, 5], [6, 5], [6, 9], [20, 9], [20, 11], [22, 11], [22, 13]],
  slotCount: 15,
  bushes: [[1, 1], [16, 1], [4, 3], [14, 6]],
  water: [[11, 4], [12, 4], [11, 5], [12, 5], [11, 6], [12, 6], [13, 7], [13, 8]],
  modifiers: { enemyHpMult: 1, tankHpMult: 1.18 }
};
})();