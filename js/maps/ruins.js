(() => {
'use strict';
const TD = window.TD = window.TD || {};
TD.mapRuins = {
  id: 'ruins', name: 'Ruins', theme: 'ruins',
  corners: [[1, 6], [1, 2], [8, 2], [8, 5], [14, 5], [14, 1], [21, 1], [21, 8], [16, 8], [16, 11], [10, 11], [10, 13], [22, 13]],
  slotCount: 15,
  bushes: [[0, 0], [5, 0], [18, 3], [3, 10], [20, 10]],
  water: [[12, 7], [13, 7], [12, 8], [13, 8], [12, 9], [13, 9]],
  modifiers: { enemyHpMult: 1.05, flyerHpMult: 1.15 }
};
})();