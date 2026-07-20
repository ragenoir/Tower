(() => {
'use strict';
const TD = window.TD;
TD.WAVES_CANYON = [
  [{ type: 'grunt', count: 8, interval: 1100 }],
  [{ type: 'grunt', count: 10, interval: 900 }],
  [{ type: 'tank', count: 1, interval: 2500 }, { type: 'grunt', count: 6, interval: 1000 }],
  [{ type: 'runner', count: 8, interval: 650 }],
  [{ type: 'tank', count: 2, interval: 1800 }, { type: 'grunt', count: 6, interval: 900 }],
  [{ type: 'flyer', count: 4, interval: 850 }, { type: 'runner', count: 6, interval: 700 }],
  [{ type: 'armored', count: 4, interval: 1200 }, { type: 'tank', count: 2, interval: 1800 }],
  [{ type: 'runner', count: 10, interval: 600 }, { type: 'armored', count: 3, interval: 1100 }],
  [{ type: 'tank', count: 5, interval: 1400 }, { type: 'grunt', count: 8, interval: 850 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'tank', count: 3, interval: 1600 }],
  [{ type: 'tank', count: 10, interval: 1100 }],
  [{ type: 'runner', count: 12, interval: 550 }, { type: 'tank', count: 3, interval: 1500 }],
  [{ type: 'flyer', count: 8, interval: 650 }, { type: 'tank', count: 4, interval: 1300 }],
  [{ type: 'boss', count: 2, interval: 2800 }, { type: 'tank', count: 4, interval: 1200 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'tank', count: 6, interval: 1400 }, { type: 'runner', count: 12, interval: 550 }]
];
})();