(() => {
'use strict';
const TD = window.TD = window.TD || {};
// Conflux: long winding path with a warp gate pair.
// Ground walks the full U-turn; many units (esp. runners) jump the portal and appear deeper.
// Strategic choice: cover exit killbox vs entry choke vs both.
TD.mapConflux = {
  id: 'conflux',
  name: 'Conflux',
  theme: 'conflux',
  // Long scenic loop: top corridor → far right drop → left U-turn → bottom to base.
  corners: [
    [2, 1], [18, 1], [18, 4], [6, 4], [6, 8], [20, 8], [20, 11], [10, 11], [10, 12], [22, 12], [22, 13]
  ],
  slotCount: 15,
  bushes: [
    [0, 0], [1, 3], [4, 2], [12, 2], [15, 3],
    [3, 6], [8, 6], [12, 6], [16, 6],
    [4, 10], [14, 10], [18, 12], [21, 10]
  ],
  // Arcane pools — pure decor (block slots like water)
  water: [
    [10, 5], [11, 5], [12, 5],
    [10, 6], [11, 6], [12, 6],
    [11, 7]
  ],
  modifiers: { enemyHpMult: 1.02, runnerHpMult: 1.05 },
  // Portal pair (tiles). Resolved to wp indices on loadMap.
  // from ≈ after first right-hand drop; to ≈ mid bottom approach (skips the big left U-turn).
  portals: [
    {
      fromTile: [18, 3],
      toTile: [14, 11],
      chance: 0.48,
      minWave: 2,
      skipBoss: true,
      // type chance bonuses applied in moveEnemy
      typeBonus: { runner: 0.22, flyer: 0.12, armored: -0.08, tank: -0.15 }
    }
  ]
};
})();
