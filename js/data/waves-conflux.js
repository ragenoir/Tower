(() => {
'use strict';
const TD = window.TD;
// Conflux: portal warps reward coverage at exit + entry. Runners/flyers pressure the warp; tanks walk full path.
TD.WAVES_CONFLUX = [
  [{ type: 'grunt', count: 7, interval: 1050 }],
  [{ type: 'runner', count: 4, interval: 750 }, { type: 'grunt', count: 5, interval: 950 }],
  [{ type: 'flyer', count: 4, interval: 850 }, { type: 'runner', count: 4, interval: 700 }],
  [{ type: 'grunt', count: 8, interval: 900 }, { type: 'runner', count: 5, interval: 650 }],
  [{ type: 'armored', count: 2, interval: 1300 }, { type: 'runner', count: 6, interval: 620 }], // portal chance active
  [{ type: 'flyer', count: 7, interval: 700 }, { type: 'grunt', count: 6, interval: 900 }],
  [{ type: 'runner', count: 10, interval: 520 }, { type: 'tank', count: 2, interval: 1700 }], // runners warp, tanks walk
  [{ type: 'armored', count: 4, interval: 1100 }, { type: 'flyer', count: 5, interval: 750 }],
  [{ type: 'runner', count: 8, interval: 550 }, { type: 'tank', count: 3, interval: 1500 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'runner', count: 7, interval: 600 }, { type: 'grunt', count: 6, interval: 850 }],
  [{ type: 'tank', count: 5, interval: 1300 }, { type: 'runner', count: 8, interval: 540 }],
  [{ type: 'flyer', count: 10, interval: 560 }, { type: 'armored', count: 3, interval: 1000 }],
  [{ type: 'runner', count: 12, interval: 500 }, { type: 'tank', count: 4, interval: 1400 }],
  [{ type: 'boss', count: 2, interval: 2500 }, { type: 'runner', count: 8, interval: 550 }, { type: 'flyer', count: 6, interval: 700 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'tank', count: 5, interval: 1200 }, { type: 'runner', count: 10, interval: 500 }]
];
})();
