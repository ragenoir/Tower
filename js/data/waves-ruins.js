(() => {
'use strict';
const TD = window.TD;
TD.WAVES_RUINS = [
  [{ type: 'grunt', count: 7, interval: 1100 }],
  [{ type: 'flyer', count: 2, interval: 1000 }, { type: 'grunt', count: 6, interval: 1000 }],
  [{ type: 'runner', count: 6, interval: 750 }],
  [{ type: 'flyer', count: 5, interval: 800 }, { type: 'grunt', count: 6, interval: 900 }],
  [{ type: 'flyer', count: 8, interval: 700 }, { type: 'runner', count: 6, interval: 650 }],
  [{ type: 'tank', count: 2, interval: 1900 }, { type: 'flyer', count: 4, interval: 800 }],
  [{ type: 'flyer', count: 10, interval: 600 }],
  [{ type: 'runner', count: 12, interval: 550 }, { type: 'flyer', count: 6, interval: 750 }],
  [{ type: 'tank', count: 3, interval: 1700 }, { type: 'flyer', count: 8, interval: 650 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'flyer', count: 10, interval: 600 }],
  [{ type: 'flyer', count: 12, interval: 550 }, { type: 'runner', count: 8, interval: 600 }],
  [{ type: 'tank', count: 4, interval: 1400 }, { type: 'flyer', count: 8, interval: 650 }],
  [{ type: 'flyer', count: 14, interval: 500 }, { type: 'tank', count: 3, interval: 1500 }],
  [{ type: 'boss', count: 2, interval: 2500 }, { type: 'flyer', count: 10, interval: 600 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'flyer', count: 12, interval: 500 }, { type: 'tank', count: 3, interval: 1400 }]
];
})();