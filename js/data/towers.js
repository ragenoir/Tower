(() => {
'use strict';
const TD = window.TD;
const C = TD.C;

TD.TOWER_ORDER = ['arrow', 'cannon', 'frost', 'sniper', 'flak'];

TD.TOWER_TYPES = {
  arrow:  { name: 'Arrow',  short: 'AR', color: C.arrow,  cost: 55,  upgrades: [40, 70],  dmg: [8, 12, 18], rate: 2.0, range: [3, 3, 4], aoe: 0, hitsGround: true, hitsAir: true },
  cannon: { name: 'Cannon', short: 'CN', color: C.cannon, cost: 100, upgrades: [80, 120], dmg: [20, 32, 46], rate: 0.65, range: [2.5, 2.5, 2.5], aoe: 1.7, hitsGround: true, hitsAir: false },
  frost:  { name: 'Frost',  short: 'FR', color: C.frost,  cost: 75,  upgrades: [60, 90],  dmg: [4, 6, 9],   rate: 1.5, range: [3, 3, 3], aoe: 0, slow: 0.4, slowDur: 2, hitsGround: true, hitsAir: true },
  sniper: { name: 'Sniper', short: 'SN', color: C.sniper, cost: 120, upgrades: [100, 150], dmg: [35, 55, 80], rate: 0.4, range: [5, 6, 7], aoe: 0, hitsGround: true, hitsAir: true },
  flak:   { name: 'Flak',   short: 'FK', color: C.flak,   cost: 90,  upgrades: [70, 100], dmg: [6, 9, 15],  rate: 2.6, range: [3.5, 3.5, 4], aoe: 0, hitsGround: false, hitsAir: true }
};
})();