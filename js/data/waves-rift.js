(() => {
'use strict';
const TD = window.TD;
// Rift waves: emphasize split threats - flyers bypass via chasm while ground units suffer long bridge.
TD.WAVES_RIFT = [
  [{ type: 'grunt', count: 7, interval: 1100 }],
  [{ type: 'flyer', count: 3, interval: 900 }, { type: 'grunt', count: 5, interval: 950 }],
  [{ type: 'runner', count: 5, interval: 750 }, { type: 'grunt', count: 6, interval: 900 }],
  [{ type: 'flyer', count: 6, interval: 800 }, { type: 'runner', count: 4, interval: 700 }],
  [{ type: 'tank', count: 2, interval: 1900 }, { type: 'flyer', count: 5, interval: 800 }],   // bridge tanks + air bypass surge (split threat)
  [{ type: 'grunt', count: 6, interval: 900 }, { type: 'runner', count: 5, interval: 650 }],
  [{ type: 'flyer', count: 11, interval: 580 }, { type: 'armored', count: 2, interval: 1200 }], // strong air bypass spike
  [{ type: 'tank', count: 4, interval: 1500 }, { type: 'flyer', count: 6, interval: 750 }],
  [{ type: 'runner', count: 10, interval: 550 }, { type: 'flyer', count: 6, interval: 700 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'grunt', count: 8, interval: 800 }, { type: 'flyer', count: 5, interval: 900 }],
  [{ type: 'tank', count: 6, interval: 1200 }, { type: 'armored', count: 3, interval: 950 }], // heavy bridge push
  [{ type: 'flyer', count: 10, interval: 550 }, { type: 'runner', count: 8, interval: 520 }], // flyers shortcut while runners pressure
  [{ type: 'tank', count: 4, interval: 1400 }, { type: 'flyer', count: 8, interval: 650 }],
  [{ type: 'boss', count: 2, interval: 2600 }, { type: 'flyer', count: 7, interval: 700 }, { type: 'grunt', count: 6, interval: 850 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'tank', count: 5, interval: 1200 }, { type: 'flyer', count: 10, interval: 550 }]
];
})();