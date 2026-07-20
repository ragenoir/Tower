(() => {
'use strict';
const TD = window.TD = window.TD || {};
TD.mapMeadow = {
  id: 'meadow', name: 'Meadow', theme: 'meadow',
  corners: [[2, 1], [2, 3], [10, 3], [10, 7], [17, 7], [17, 10], [7, 10], [7, 12], [21, 12], [22, 12], [22, 13]],
  slotCount: 15,
  bushes: [[1, 0], [13, 4], [19, 5], [19, 9], [4, 8], [9, 11], [16, 11]],
  water: [],
  modifiers: { enemyHpMult: 1, tankHpMult: 1 }
};
})();