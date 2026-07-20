(() => {
'use strict';
const TD = window.TD;
const C = TD.C;

TD.ENEMY_TYPES = {
  grunt:  { hp: 34,  speed: 40, gold: 7,  baseDmg: 1, color: C.enemy,      size: 5, short: 'G' },
  runner: { hp: 22,  speed: 65, gold: 8,  baseDmg: 1, color: C.enemyRunner, size: 4, short: 'R' },
  flyer:  { hp: 18,  speed: 55, gold: 10, baseDmg: 1, color: C.enemyFlyer,  size: 4, short: 'F', flying: true },
  armored:{ hp: 72,  speed: 28, gold: 12, baseDmg: 1, color: '#7a8a9a',      size: 6, short: 'A', armor: 0.35 },
  tank:   { hp: 150, speed: 25, gold: 15, baseDmg: 2, color: C.enemyTank,   size: 7, short: 'T' },
  boss:   { hp: 650, speed: 20, gold: 75, baseDmg: 5, color: C.enemyBoss,   size: 10, short: 'B' }
};

TD.ENEMY_ORDER = ['boss', 'tank', 'armored', 'flyer', 'runner', 'grunt'];
})();