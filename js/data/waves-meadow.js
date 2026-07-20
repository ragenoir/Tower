(() => {
'use strict';
const TD = window.TD;
TD.WAVES_MEADOW = [
  [{ type: 'grunt', count: 6, interval: 1200 }],
  [{ type: 'grunt', count: 8, interval: 1000 }],
  [{ type: 'grunt', count: 6, interval: 1000 }, { type: 'runner', count: 3, interval: 800 }],
  [{ type: 'grunt', count: 10, interval: 900 }],
  [{ type: 'flyer', count: 3, interval: 900 }, { type: 'runner', count: 5, interval: 700 }, { type: 'grunt', count: 4, interval: 1000 }],
  [{ type: 'tank', count: 2, interval: 2000 }, { type: 'grunt', count: 6, interval: 900 }],
  [{ type: 'flyer', count: 5, interval: 700 }, { type: 'runner', count: 8, interval: 600 }],
  [{ type: 'tank', count: 3, interval: 1800 }, { type: 'grunt', count: 8, interval: 900 }],
  [{ type: 'runner', count: 6, interval: 700 }, { type: 'tank', count: 4, interval: 1500 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'grunt', count: 10, interval: 800 }],
  [{ type: 'tank', count: 8, interval: 1200 }],
  [{ type: 'runner', count: 15, interval: 500 }, { type: 'grunt', count: 5, interval: 900 }],
  [{ type: 'tank', count: 5, interval: 1200 }, { type: 'runner', count: 10, interval: 600 }],
  [{ type: 'boss', count: 2, interval: 3000 }, { type: 'grunt', count: 8, interval: 800 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'tank', count: 4, interval: 1500 }, { type: 'runner', count: 10, interval: 600 }]
];
})();