(() => {
'use strict';
const TD = window.TD;

TD.WAVES = [
  [{ type: 'grunt', count: 6, interval: 1200 }],
  [{ type: 'grunt', count: 8, interval: 1000 }],
  [{ type: 'grunt', count: 6, interval: 1000 }, { type: 'runner', count: 3, interval: 800 }],
  [{ type: 'grunt', count: 10, interval: 900 }],
  [{ type: 'flyer', count: 4, interval: 900 }, { type: 'runner', count: 5, interval: 700 }, { type: 'grunt', count: 4, interval: 1000 }],
  [{ type: 'tank', count: 2, interval: 2000 }, { type: 'grunt', count: 6, interval: 900 }],
  [{ type: 'flyer', count: 6, interval: 700 }, { type: 'runner', count: 8, interval: 600 }],
  [{ type: 'tank', count: 3, interval: 1800 }, { type: 'grunt', count: 8, interval: 900 }],
  [{ type: 'runner', count: 6, interval: 700 }, { type: 'tank', count: 4, interval: 1500 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'grunt', count: 10, interval: 800 }],
  [{ type: 'tank', count: 8, interval: 1200 }],
  [{ type: 'runner', count: 15, interval: 500 }, { type: 'grunt', count: 5, interval: 900 }],
  [{ type: 'tank', count: 5, interval: 1200 }, { type: 'runner', count: 10, interval: 600 }],
  [{ type: 'boss', count: 2, interval: 3000 }, { type: 'grunt', count: 8, interval: 800 }],
  [{ type: 'boss', count: 1, interval: 0 }, { type: 'tank', count: 4, interval: 1500 }, { type: 'runner', count: 10, interval: 600 }]
];

TD.WAVE_PAUSE = 15;
TD.START_GOLD = 145;
TD.BASE_HP_MAX = 20;

const r = () => TD.run;

TD.newRunStats = function newRunStats() {
  return { startTime: performance.now(), kills: 0, sells: 0, builds: 0, bossKills: 0, pauseCount: 0, combo: 0, comboTimer: 0, maxCombo: 0, towersLost: 0 };
};

TD.calcStars = function calcStars(won) {
  if (!won || !r().runStats) return 0;
  let s = 0;
  if (r().baseHp === TD.BASE_HP_MAX) s++;
  if (r().runStats.sells === 0) s++;
  if (r().runStats.pauseCount === 0) s++;
  return s;
};

TD.formatTime = function formatTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
};

TD.getDifficulty = function getDifficulty() {
  const id = r().difficulty || r().menuDifficulty || 'normal';
  return TD.DIFFICULTY[id] || TD.DIFFICULTY.normal;
};

TD.getWaveHpMult = function getWaveHpMult(w) {
  const diff = TD.getDifficulty().enemyHpMult;
  if (r().gameMode === 'endless') return (1 + w * 0.06) * diff;
  if (w < 8) return diff;
  return (1 + (w - 8) * 0.08) * diff;
};

TD.getBossTraits = function getBossTraits(waveIdx, bossIdx) {
  if (r().gameMode === 'endless') {
    const tier = Math.floor(waveIdx / 5);
    return {
      shieldTimer: 2 + tier % 3, shieldCd: Math.max(7, 14 - tier), shieldDur: 2 + Math.floor(tier / 3),
      shieldInterval: Math.max(7, 14 - tier), spawnCd: 5,
      spawnType: tier % 2 ? 'runner' : 'grunt', spawnInterval: Math.max(5, 10 - tier),
      regen: tier >= 2 ? 5 + tier * 2 : 0, regenBelow: tier >= 2 ? 0.45 : 0
    };
  }
  if (waveIdx === 9) return {
    shieldTimer: 3, shieldCd: 14, shieldDur: 3, shieldInterval: 14,
    spawnCd: 6, spawnType: 'grunt', spawnInterval: 10, regen: 0, regenBelow: 0
  };
  if (waveIdx === 13) return {
    shieldTimer: bossIdx === 0 ? 2 : 0, shieldCd: 11, shieldDur: 2, shieldInterval: 11,
    spawnCd: 6, spawnType: 'grunt', spawnInterval: 9, regen: 6, regenBelow: 0.5
  };
  if (waveIdx === 14) return {
    shieldTimer: 4, shieldCd: 9, shieldDur: 3, shieldInterval: 9,
    spawnCd: 3, spawnType: 'runner', spawnInterval: 6, regen: 10, regenBelow: 0.4
  };
  return {};
};

TD.generateEndlessWave = function generateEndlessWave(n) {
  const tier = Math.floor(n / 5);
  const mul = Math.max(0.45, 1 - tier * 0.04);
  const wave = [];
  if (n % 5 === 4) wave.push({ type: 'boss', count: 1 + Math.floor(n / 20), interval: 0 });
  const tanks = Math.min(14, Math.floor(1 + n / 2.5));
  const runners = Math.min(28, Math.floor(2 + n * 1.4));
  const flyers = Math.min(16, Math.floor(n / 3));
  const grunts = Math.min(35, 8 + n * 2);
  if (tanks > 0) wave.push({ type: 'tank', count: tanks, interval: Math.floor(1500 * mul) });
  if (flyers > 0 && n >= 2) wave.push({ type: 'flyer', count: flyers, interval: Math.floor(900 * mul) });
  if (runners > 0) wave.push({ type: 'runner', count: runners, interval: Math.floor(550 * mul) });
  wave.push({ type: 'grunt', count: grunts, interval: Math.floor(850 * mul) });
  // tiny variety: occasional reorder of non-boss groups for fresh feel (uses seeded rand when available for consistent runs)
  const rand = (typeof TD !== 'undefined' && TD._seededRand) || Math.random;
  if (wave.length > 2 && rand() < 0.35) {
    const bossIdx = wave.findIndex(g => g.type === 'boss');
    const start = bossIdx >= 0 ? 1 : 0;
    for (let i = start; i < wave.length - 1; i++) {
      if (rand() < 0.5) { const tmp = wave[i]; wave[i] = wave[i+1]; wave[i+1] = tmp; }
    }
  }
  return wave;
};

TD.getCampaignWaves = function getCampaignWaves() {
  const m = TD.MAPS[TD.currentMapId];
  return m?.waves || TD.WAVES;
};

TD.getCampaignWaveCount = function getCampaignWaveCount() {
  return TD.getCampaignWaves().length;
};

TD.getWaveDef = function getWaveDef(idx) {
  if (r().gameMode === 'endless') return TD.generateEndlessWave(idx);
  const waves = TD.getCampaignWaves();
  if (idx < 0 || idx >= waves.length) return [];
  const base = waves[idx];
  // Apply light but noticeable seeded randomness for variety on same map (per user: light + noticeable, enemies/waves only, pure random)
  if (r().runSeed && r().gameMode === 'campaign') {
    const rand = TD.getWaveRand ? TD.getWaveRand(idx) : Math.random;
    const varied = base.map(g => ({ ...g }));
    // Jitter counts noticeably ( ±20-30% )
    for (let i = 0; i < varied.length; i++) {
      const g = varied[i];
      if (g.type === 'boss') continue; // keep boss count stable
      const jitter = 0.7 + rand() * 0.6; // 0.7x to 1.3x
      g.count = Math.max(1, Math.round(g.count * jitter));
      // occasional interval jitter
      if (g.interval > 0 && rand() < 0.5) {
        g.interval = Math.max(300, Math.round(g.interval * (0.8 + rand() * 0.4)));
      }
    }
    // Small chance to swap or promote enemy types (noticeable difference)
    if (rand() < 0.45 && varied.length > 1) {
      const i = Math.floor(rand() * varied.length);
      const g = varied[i];
      if (g.type === 'grunt' && rand() < 0.6) g.type = 'runner';
      else if (g.type === 'runner' && rand() < 0.5) g.type = 'grunt';
      else if (g.type === 'flyer' && rand() < 0.4) g.type = 'grunt';
      else if (g.type === 'tank' && rand() < 0.3) g.type = 'armored';
    }
    // Reorder groups for fresh pacing (except keep boss first if present)
    if (rand() < 0.55 && varied.length > 1) {
      const bossIdx = varied.findIndex(g => g.type === 'boss');
      const start = bossIdx === 0 ? 1 : 0;
      for (let i = start; i < varied.length - 1; i++) {
        if (rand() < 0.5) {
          const tmp = varied[i];
          varied[i] = varied[i + 1];
          varied[i + 1] = tmp;
        }
      }
    }
    return varied;
  }
  return base;
};

TD.waveHasBoss = function waveHasBoss(idx) {
  return TD.getWaveDef(idx).some(g => g.type === 'boss');
};

TD.getWaveSummary = function getWaveSummary(idx) {
  const def = TD.getWaveDef(idx);
  const counts = {};
  for (const g of def) counts[g.type] = (counts[g.type] || 0) + g.count;
  return TD.ENEMY_ORDER.filter(t => counts[t]).map(t => ({ type: t, count: counts[t] }));
};

TD.getWaveLabel = function getWaveLabel() {
  const n = r().wave + 1;
  return r().gameMode === 'endless' ? 'E' + n : 'W' + n;
};
})();