#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const noop = () => {};

const ctx = {
  document: {
    getElementById: () => ({
      getContext: () => new Proxy({}, { get: () => noop }),
      addEventListener: noop, style: {}, width: 1, height: 1,
      getBoundingClientRect: () => ({ left: 0, top: 0 })
    }),
    addEventListener: noop
  },
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
  performance: { now: () => 0 },
  requestAnimationFrame: noop,
  location: { search: '' },
  Math, parseInt, parseFloat, setTimeout, setInterval, clearInterval: noop,
  URLSearchParams: class {
    constructor(s = '') {
      this._m = new Map();
      const str = String(s || '').replace(/^\?/, '');
      if (str) {
        for (const part of str.split('&')) {
          if (!part) continue;
          const eq = part.indexOf('=');
          const k = eq >= 0 ? decodeURIComponent(part.slice(0, eq)) : decodeURIComponent(part);
          const v = eq >= 0 ? decodeURIComponent(part.slice(eq + 1)) : '';
          this._m.set(k, v);
        }
      }
    }
    has(k) { return this._m.has(k); }
    get(k) { return this._m.has(k) ? this._m.get(k) : null; }
    set(k, v) { this._m.set(k, String(v)); }
    toString() {
      const parts = [];
      for (const [k, v] of this._m) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      return parts.join('&');
    }
  },
  AudioContext: class {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; this.sampleRate = 44100; }
    resume() {}
    createOscillator() { return { type: '', frequency: { value: 0 }, connect: noop, start: noop, stop: noop }; }
    createGain() { return { gain: { setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop }; }
    createBuffer() { return { getChannelData: () => new Float32Array(10) }; }
    createBufferSource() { return { buffer: null, connect: noop, start: noop }; }
  }
};
ctx.window = ctx;
ctx.window.addEventListener = noop;
vm.createContext(ctx);

const files = [
  'js/config.js', 'js/i18n.js', 'js/data/towers.js', 'js/data/enemies.js', 'js/data/waves.js',
  'js/data/waves-meadow.js', 'js/data/waves-canyon.js', 'js/data/waves-ruins.js', 'js/data/waves-rift.js',
  'js/events.js', 'js/maps/pipeline.js', 'js/maps/meadow.js', 'js/maps/canyon.js', 'js/maps/ruins.js', 'js/maps/rift.js',
  'js/maps/validate.js', 'js/maps/index.js', 'js/storage.js', 'js/achievements.js', 'js/audio.js',
  'graphics/state.js', 'graphics/map.js', 'graphics/units.js', 'graphics/fx.js',
  'js/share.js', 'js/game.js', 'js/demo.js', 'js/ui.js', 'js/debug.js', 'js/main.js'
];

let failed = 0;
for (const f of files) {
  const p = path.join(root, f);
  try {
    require('node:child_process').execFileSync('node', ['--check', p], { stdio: 'pipe' });
    vm.runInContext(fs.readFileSync(p, 'utf8'), ctx);
  } catch (e) {
    console.error('FAIL', f, e.message || e);
    failed++;
  }
}

const TD = ctx.TD;
const checks = [
  () => TD.MAP_IDS.length === 4,
  () => TD.TOWER_ORDER.length === 5,
  () => TD.TOWER_TYPES.cannon.hitsAir === false,
  () => TD.TOWER_TYPES.flak.hitsGround === false,
  () => TD.MAPS.ruins.waves.length === 15,
  () => TD.getCampaignWaveCount() === 15,
  () => TD.canTowerHit('cannon', { flying: true }) === false,
  () => TD.canTowerHit('flak', { flying: true }) === true,
  () => Object.keys(ctx.TDG).length >= 25,
  () => TD.PATH_WAYPOINTS.length > 20,
  () => TD.PATH_LENGTH > 0 && TD.getPathFraction({ wp: 0, progress: 0 }) < 0.01,
  () => typeof TD.updateMusicTension === 'function' && TD.computeMusicTensionTarget(0) === 0,
  () => typeof TD.selectMusicTrack === 'function' && typeof TD.getCurrentMusicTrack === 'function',
  () => TD.MUSIC_TRACKS && Object.keys(TD.MUSIC_TRACKS).length >= 9,
  () => Array.isArray(TD.TARGET_MODES) && TD.TARGET_MODES.length === 4,
  () => typeof TD.getSellValue === 'function' && typeof TD.cycleTowerTargetMode === 'function',
  () => TD.ACHIEVEMENTS.length === 8,
  () => TD.MAPS.meadow.validation.ok === true,
  () => TD.MAPS.rift && TD.MAPS.rift.validation && TD.MAPS.rift.validation.ok === true,
  () => typeof TD.waveHasBoss === 'function' && TD.SFX.bossSpawn && TD.SFX.bossWarn,
  () => TD.locale === 'en' && TD.t('tagline').includes('Build towers'),
  () => TD.achLabel(TD.ACHIEVEMENTS[0]).length > 0,
  () => typeof TD.isDemo === 'boolean' && typeof TD.DEMO_RESTART_DELAY === 'number',
  () => typeof TD.generateSeed === 'function' && typeof TD.getDailySeed === 'function',
  () => typeof TD.getDailyMapId === 'function' && TD.MAP_IDS.includes(TD.getDailyMapId()),
  () => typeof TD.buildDeepLink === 'function' && TD.buildDeepLink({ mapId: 'rift', mode: 'endless', seed: 'abc' }).includes('map=rift'),
  () => typeof TD.formatRunShareText === 'function' && TD.formatRunShareText({
    won: true, mapId: 'meadow', mode: 'campaign', stars: 3, wave: 15, time: 120, kills: 40, seed: 'dead'
  }).includes('Seed: dead'),
  () => typeof TD.copyRunShareText === 'function' && typeof TD.saveRunSharePng === 'function',
  () => typeof TD.applyUrlDeepLink === 'function' && typeof TD.track === 'function',
  () => TD.VERSION && String(TD.VERSION).length > 0,
  // Seeded wave defs must be stable for the same runSeed + wave index
  () => {
    TD.run.runSeed = 'abcd1';
    const a = JSON.stringify(TD.getWaveDef(3));
    const b = JSON.stringify(TD.getWaveDef(3));
    TD.run.runSeed = null;
    return a === b && a.length > 10;
  },
  () => typeof TD.runRand === 'function' && typeof TD.towerDamageCanDestroy === 'function',
  // Campaign: chip-only (no destroy) protects 3★ fairness
  () => {
    TD.run.gameMode = 'campaign';
    TD.isDemo = false;
    TD.debug = false;
    return TD.towerDamageCanDestroy() === false;
  },
  // Endless: destroy allowed when master flags on
  () => {
    TD.run.gameMode = 'endless';
    return TD.TOWER_DAMAGE_ENABLED && TD.TOWER_DAMAGE_DESTROY && TD.towerDamageCanDestroy() === true;
  },
  // Volume layout: exclusive zones — vol starts after speed3 ends
  () => {
    const L = TD.getHudCtrlLayout();
    const s3End = L.speed3.x + L.speed3.w;
    return L.vol.x >= s3End && L.mute.x >= L.vol.x + L.vol.w;
  },
  // Seeded runRand sequence is deterministic
  () => {
    TD._seededRand = TD.createSeededRandom(0xabcde);
    const a = [TD.runRand(), TD.runRand(), TD.runRand()];
    TD._seededRand = TD.createSeededRandom(0xabcde);
    const b = [TD.runRand(), TD.runRand(), TD.runRand()];
    TD._seededRand = null;
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  },
  // All maps validate
  () => TD.MAP_IDS.every(id => TD.MAPS[id] && TD.MAPS[id].validation && TD.MAPS[id].validation.ok),
  // Deep-link apply into menu
  () => {
    TD.urlMap = 'rift'; TD.urlMode = 'endless'; TD.urlDiff = 'easy'; TD.urlSeed = 'beef1';
    TD.applyUrlDeepLink();
    const ok = TD.run.menuMap === 'rift' && TD.run.menuMode === 'endless' &&
      TD.run.menuDifficulty === 'easy' && TD.run.menuSeed === 'beef1';
    TD.urlMap = TD.urlMode = TD.urlDiff = TD.urlSeed = null;
    return ok;
  },
  // Demo module extracted
  () => typeof TD.updateDemo === 'function' && typeof TD.toggleDemo === 'function' &&
    Array.isArray(TD.DEMO_CYCLE) && TD.DEMO_CYCLE.length === 4,
  // Share module extracted
  () => typeof TD.getDailySeed === 'function' && typeof TD.buildDeepLink === 'function'
];

for (const [i, fn] of checks.entries()) {
  if (!fn()) { console.error('CHECK FAIL', i); failed++; }
}

if (failed) { console.error(failed, 'failures'); process.exit(1); }
console.log('smoke OK — maps:', TD.MAP_IDS.join(','), 'towers:', TD.TOWER_ORDER.length);