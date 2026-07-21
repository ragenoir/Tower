(() => {
'use strict';
const TD = window.TD;

TD.run = {
  state: TD.STATE.MENU,
  gold: TD.START_GOLD, baseHp: TD.BASE_HP_MAX,
  wave: 0, waveTimer: 0, wavePhase: 'pause',
  spawnQueue: [], spawnTimer: 0, speedMul: 1,
  enemies: [], towers: [], projectiles: [],
  particles: [], dmgNumbers: [],
  selectedTowerType: null, selectedTower: null,
  hoverSlot: null, hoverUi: null,
  shakeTimer: 0, shakeX: 0, shakeY: 0,
  baseFlash: 0, goldFlash: 0, slotPulse: 0,
  waveBanner: null,
  tutorial: { step: 0, dismissed: false },
  gameMode: 'campaign', menuMap: 'meadow', menuMode: 'campaign', menuDifficulty: 'normal', hoverMenu: null,

  gamesPlayed: parseInt(localStorage.getItem('gamesPlayed') || '0'),
  enemyId: 0, projId: 0, bossesSpawnedWave: 0,
  hitStop: 0, spawnFlash: 0, comboDisplay: null,
  runStats: null, lastRunResult: null, achievementToast: null, lowHpWarned: false,
  musicTension: 0, musicTensionTier: 0, musicTrack: null,
  // demo mode
  demo: false, demoRestartTimer: 0, demoDecisionTimer: 0,
  // seeded run for variety (same seed = identical run on same map)
  runSeed: null
};
const r = () => TD.run;

// Simple deterministic seeded RNG (LCG). Use for all gameplay random so runs are replayable & shareable.
TD.createSeededRandom = function createSeededRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

/** Run-scoped RNG (seeded when runSeed set). Prefer for gameplay-affecting rolls. */
TD.runRand = function runRand() {
  if (typeof TD._seededRand === 'function') return TD._seededRand();
  return Math.random();
};

// Stable per-wave RNG so that getWaveDef(idx) always returns the exact same mutated wave
// no matter how many times it's called (fixes flickering "Next" preview)
TD.getWaveRand = function getWaveRand(waveIdx) {
  if (!r().runSeed) return Math.random;
  // combine run seed with wave index for independent sequence per wave
  const base = (parseInt(r().runSeed, 16) || 1) >>> 0;
  const waveSeed = (base ^ (waveIdx * 2654435761)) >>> 0;  // golden ratio mix
  return TD.createSeededRandom(waveSeed);
};

/** True when siege may destroy/downgrade towers (endless/demo/debug). Campaign = chip-only. */
TD.towerDamageCanDestroy = function towerDamageCanDestroy() {
  if (!TD.TOWER_DAMAGE_ENABLED || !TD.TOWER_DAMAGE_DESTROY) return false;
  if (TD.debug) return true;
  if (TD.isDemo || r().demo) return true;
  return r().gameMode === 'endless';
};

// ─── Entities ────────────────────────────────────────────────
TD.spawnEnemy = function spawnEnemy(type, opts = {}) {
  if (r().enemies.length >= TD.MAX_ENEMIES) return;
  const def = TD.ENEMY_TYPES[type];
  const mult = opts.minion ? 0.55 : TD.getWaveHpMult(r().wave);
  const mapMod = TD.MAPS[TD.currentMapId]?.modifiers || {};
  let hpMult = mult * (mapMod.enemyHpMult || 1);
  if (type === 'tank') hpMult *= mapMod.tankHpMult || 1;
  if (type === 'flyer') hpMult *= mapMod.flyerHpMult || 1;
  if (type === 'runner') hpMult *= mapMod.runnerHpMult || 1;
  const hp = Math.round(def.hp * hpMult);
  const e = {
    id: r().enemyId++, type, hp, maxHp: hp,
    speed: def.speed, gold: opts.minion ? Math.max(2, Math.floor(def.gold * 0.5)) : def.gold,
    baseDmg: def.baseDmg, color: def.color, size: opts.minion ? def.size - 1 : def.size,
    armor: opts.minion ? 0 : (def.armor || 0),
    wp: opts.wp ?? 0, progress: opts.progress ?? 0,
    slowTimer: 0, slowFactor: 1, alive: true, isMinion: !!opts.minion,
    flying: !!(def.flying && !opts.minion)
  };
  if (type === 'boss') {
    e.bossVariant = r().bossesSpawnedWave % 3;
    Object.assign(e, TD.getBossTraits(r().wave, r().bossesSpawnedWave++));
    if (!opts.minion) {
      TD.bus.emit('sfx', 'bossSpawn');
      r().shakeTimer = Math.max(r().shakeTimer, 0.25);
    }
  }
  r().enemies.push(e);
}

TD.spawnBossMinion = function spawnBossMinion(boss) {
  if (!boss.spawnType || r().enemies.length >= TD.MAX_ENEMIES) return;
  TD.spawnEnemy(boss.spawnType, { wp: boss.wp, progress: boss.progress, minion: true });
  const pos = TD.enemyPos(boss);
  for (let i = 0; i < 4; i++) {
    const ang = Math.random() * Math.PI * 2;
    r().particles.push({
      x: pos[0], y: pos[1], vx: Math.cos(ang) * 25, vy: Math.sin(ang) * 25,
      life: 0.35, color: '#aa44aa', size: 2
    });
  }
}

TD.getPathDist = function getPathDist(enemy) {
  let dist = enemy.progress;
  for (let i = enemy.wp; i < TD.PATH_WAYPOINTS.length - 1; i++) {
    const a = TD.PATH_WAYPOINTS[i], b = TD.PATH_WAYPOINTS[i + 1];
    dist += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return dist;
};

TD.getPathTraveled = function getPathTraveled(e) {
  let d = e.progress || 0;
  for (let i = 0; i < e.wp; i++) {
    const a = TD.PATH_WAYPOINTS[i], b = TD.PATH_WAYPOINTS[i + 1];
    d += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return d;
};

TD.getPathFraction = function getPathFraction(e) {
  if (!TD.PATH_LENGTH) return 0;
  return Math.min(1, TD.getPathTraveled(e) / TD.PATH_LENGTH);
};

TD.MUSIC_TENSION_THRESH = [1 / 3, 2 / 3, 5 / 6];
TD.MUSIC_TENSION_HYST = 0.035;

TD.TARGET_MODES = ['far', 'fast', 'strong', 'close']; // cycle order for T key; default keeps old "farthest threat" behavior

// Music tension tiers (documented in README):
// 0 = calm (enemies early on path)
// 1 = slight tension after max enemy path frac >= 1/3
// 2 = stronger tension after >= 2/3
// 3 = maximum anxiety after >= 5/6
// When threat recedes, smoothly drops (hysteresis + lerp in updateMusicTension)
TD.computeMusicTensionTarget = function computeMusicTensionTarget(prevTier = 0) {
  const run = r();
  if (run.state !== TD.STATE.PLAYING || run.wavePhase !== 'spawning') return 0;

  // Find the farthest any live enemy has traveled
  let maxFrac = 0;
  for (const e of (run.enemies || [])) {
    if (e.alive && !e.dying) {
      maxFrac = Math.max(maxFrac, TD.getPathFraction(e));
    }
  }

  // Determine target tier strictly by the classic thresholds
  let raw = 0;
  for (let i = TD.MUSIC_TENSION_THRESH.length - 1; i >= 0; i--) {
    if (maxFrac >= TD.MUSIC_TENSION_THRESH[i]) {
      raw = i + 1;
      break;
    }
  }

  // Hysteresis: don't drop immediately when an enemy dips below the line
  if (raw > prevTier) return raw;
  if (raw < prevTier) {
    const dropThreshold = TD.MUSIC_TENSION_THRESH[prevTier - 1] - TD.MUSIC_TENSION_HYST;
    if (maxFrac < dropThreshold) return raw;
    return prevTier;
  }
  return prevTier;
};

TD.moveEnemy = function moveEnemy(e, dt) {
  if (e.wp >= TD.PATH_WAYPOINTS.length - 1) { TD.reachBase(e); return; }
  const spd = e.speed * (e.slowTimer > 0 ? e.slowFactor : 1) * r().speedMul;
  let remaining = spd * dt;
  while (remaining > 0 && e.wp < TD.PATH_WAYPOINTS.length - 1) {
    const cur = TD.PATH_WAYPOINTS[e.wp], nxt = TD.PATH_WAYPOINTS[e.wp + 1];
    const segLen = Math.hypot(nxt[0] - cur[0], nxt[1] - cur[1]);
    if (segLen > 0) e.facing = Math.atan2(nxt[1] - cur[1], nxt[0] - cur[0]);
    const need = segLen - e.progress;
    if (remaining >= need) {
      remaining -= need; e.wp++; e.progress = 0;
      const m = TD.MAPS[TD.currentMapId];
      // Rift: flyers take airShortcut across the chasm (skip long ground detour)
      const sc = m && m._airShortcut;
      if (e.flying && sc && !e._shortcutUsed) {
        if (e.wp >= (sc.from || 0) && e.wp < (sc.to || 999)) {
          const fromX = cur[0];
          const fromY = cur[1] - (e.flying ? TD.FLY_HEIGHT : 0);
          e.wp = sc.to;
          e.progress = 0;
          e._shortcutUsed = true;
          const toWp = TD.PATH_WAYPOINTS[Math.min(e.wp, TD.PATH_WAYPOINTS.length - 1)] || cur;
          const toX = toWp[0];
          const toY = toWp[1] - (e.flying ? TD.FLY_HEIGHT : 0);
          const nextWp = TD.PATH_WAYPOINTS[Math.min(e.wp + 1, TD.PATH_WAYPOINTS.length - 1)];
          if (nextWp && toWp) {
            e.facing = Math.atan2(nextWp[1] - toWp[1], nextWp[0] - toWp[0]);
          }
          e._riftCross = {
            fromX, fromY, toX, toY,
            start: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            duration: 420
          };
          for (let k = 0; k < 3; k++) {
            r().particles.push({ x: fromX, y: fromY, vx: (Math.random() - 0.5) * 25, vy: -15, life: 0.22, color: '#9ad0ff', size: 2 });
          }
          for (let k = 0; k < 7; k++) {
            const t = k / 6;
            r().particles.push({
              x: fromX * (1 - t) + toX * t, y: fromY * (1 - t) + toY * t,
              vx: (toX - fromX) * 0.7 + (Math.random() - 0.5) * 20,
              vy: (toY - fromY) * 0.2 - 4,
              life: 0.2 + Math.random() * 0.08, color: '#7ac8ff', size: 1.5
            });
          }
          for (let k = 0; k < 4; k++) {
            const spread = (k - 1.5) * 14;
            r().particles.push({
              x: toX + spread * 0.2, y: toY, vx: spread * 0.4, vy: -8 - Math.random() * 5,
              life: 0.28, color: '#a0d0ff', size: 2
            });
          }
        }
      }
      // Conflux: path portals — chance to warp (seeded). Bosses skip by default.
      if (m && m._portals && m._portals.length && !e._portalUsed) {
        for (const portal of m._portals) {
          if (e.wp !== portal.from) continue;
          if (r().wave + 1 < (portal.minWave || 1)) continue;
          if (portal.skipBoss && e.type === 'boss') continue;
          let chance = portal.chance || 0.45;
          if (portal.typeBonus && portal.typeBonus[e.type] != null) {
            chance += portal.typeBonus[e.type];
          }
          chance = Math.max(0.05, Math.min(0.92, chance));
          const roll = TD.runRand ? TD.runRand() : Math.random();
          if (roll > chance) break;
          const fromX = cur[0];
          const fromY = cur[1] - (e.flying ? TD.FLY_HEIGHT : 0);
          e.wp = portal.to;
          e.progress = 0;
          e._portalUsed = true;
          const toWp = TD.PATH_WAYPOINTS[Math.min(e.wp, TD.PATH_WAYPOINTS.length - 1)] || cur;
          const toX = toWp[0];
          const toY = toWp[1] - (e.flying ? TD.FLY_HEIGHT : 0);
          const nextWp = TD.PATH_WAYPOINTS[Math.min(e.wp + 1, TD.PATH_WAYPOINTS.length - 1)];
          if (nextWp && toWp) {
            e.facing = Math.atan2(nextWp[1] - toWp[1], nextWp[0] - toWp[0]);
          }
          // Short warp streak (different from rift flight — purple arcane)
          e._portalWarp = {
            fromX, fromY, toX, toY,
            start: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            duration: 280
          };
          if (r().waveBanner == null || (r().waveBanner.life || 0) < 0.4) {
            r().waveBanner = { text: 'WARP!', life: 0.7 };
          }
          for (let k = 0; k < 8; k++) {
            const t = k / 7;
            r().particles.push({
              x: fromX * (1 - t) + toX * t,
              y: fromY * (1 - t) + toY * t - Math.sin(t * Math.PI) * 12,
              vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 8,
              life: 0.25 + Math.random() * 0.15,
              color: k % 2 ? '#c49cff' : '#7a5cff', size: 1.5 + Math.random()
            });
          }
          TD.bus.emit('sfx', { name: 'spawn', x: toX, y: toY });
          break;
        }
      }
      if (e.wp >= TD.PATH_WAYPOINTS.length - 1) { TD.reachBase(e); return; }
    } else { e.progress += remaining; remaining = 0; }
  }
  if (e.slowTimer > 0) e.slowTimer -= dt * r().speedMul;
}

TD.reachBase = function reachBase(e) {
  e.alive = false;
  r().baseHp -= e.baseDmg;
  r().baseFlash = 0.3; r().shakeTimer = 0.2;
  const end = TD.PATH_WAYPOINTS[TD.PATH_WAYPOINTS.length - 1] || [TD.W * 0.8, TD.H * 0.5];
  TD.bus.emit('sfx', { name: 'baseHit', x: end[0], y: end[1], hp: r().baseHp });
  if (r().baseHp > 0 && r().baseHp <= 5 && !r().lowHpWarned) {
    r().lowHpWarned = true;
    TD.bus.emit('sfx', 'lowHp');
  }
  if (r().baseHp <= 0) { r().baseHp = 0; TD.endGame(false); }
}

TD.enemyPos = function enemyPos(e) {
  if (e.dying) return [e.deathX, e.deathY];

  // Rift air shortcut visual lerp
  if (e._riftCross && e._riftCross.duration) {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const elapsed = now - e._riftCross.start;
    const t = Math.min(1, elapsed / e._riftCross.duration);
    if (t >= 1) {
      delete e._riftCross;
    } else {
      const yOff = e.flying ? -TD.FLY_HEIGHT : 0;
      const x = e._riftCross.fromX * (1 - t) + e._riftCross.toX * t;
      const y = e._riftCross.fromY * (1 - t) + e._riftCross.toY * t + yOff;
      return [x, y];
    }
  }
  // Conflux portal warp visual (arc-ish via sin offset handled in particles; sprite straight lerp)
  if (e._portalWarp && e._portalWarp.duration) {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const elapsed = now - e._portalWarp.start;
    const t = Math.min(1, elapsed / e._portalWarp.duration);
    if (t >= 1) {
      delete e._portalWarp;
    } else {
      const yOff = e.flying ? -TD.FLY_HEIGHT : 0;
      const lift = Math.sin(t * Math.PI) * 10;
      const x = e._portalWarp.fromX * (1 - t) + e._portalWarp.toX * t;
      const y = e._portalWarp.fromY * (1 - t) + e._portalWarp.toY * t + yOff - lift;
      return [x, y];
    }
  }

  if (e.wp >= TD.PATH_WAYPOINTS.length - 1) return TD.PATH_WAYPOINTS[TD.PATH_WAYPOINTS.length - 1];
  const a = TD.PATH_WAYPOINTS[e.wp], b = TD.PATH_WAYPOINTS[e.wp + 1];
  const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const t = e.progress / segLen;
  const yOff = e.flying ? -TD.FLY_HEIGHT : 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + yOff];
}

/** Soft particle budget so late waves stay readable/perf-safe. */
TD.pushParticle = function pushParticle(p) {
  const list = r().particles;
  if (list.length >= 160) list.splice(0, list.length - 140);
  list.push(p);
};

/** Cosmetic burst helper (juice). kind: 'spark' | 'puff' | 'soul' | 'ring' */
TD.spawnFxBurst = function spawnFxBurst(x, y, opts = {}) {
  const n = opts.count || 6;
  const color = opts.color || TD.C.gold;
  const kind = opts.kind || 'spark';
  const spd = opts.speed || 36;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const s = spd * (0.55 + Math.random() * 0.6);
    TD.pushParticle({
      x, y,
      vx: Math.cos(ang) * s,
      vy: Math.sin(ang) * s - (opts.lift || 12),
      life: opts.life || (0.28 + Math.random() * 0.28),
      color,
      size: opts.size || (1.5 + Math.random() * 2),
      kind
    });
  }
};

TD.damageEnemy = function damageEnemy(e, dmg, towerType) {
  const pos = TD.enemyPos(e);
  if (e.shieldTimer > 0) {
    r().dmgNumbers.push({ x: pos[0], y: pos[1] - 10, text: 'BLOCK', life: 0.45 });
    TD.spawnFxBurst(pos[0], pos[1], { count: 4, color: '#88ccff', kind: 'spark', speed: 28, size: 1.5, life: 0.22 });
    return;
  }
  const dealt = Math.max(1, Math.round(dmg * (1 - (e.armor || 0))));
  e.hp -= dealt;
  const dmgText = e.armor > 0 && dealt < dmg ? '-' + dealt : '-' + Math.round(dmg);
  r().dmgNumbers.push({ x: pos[0], y: pos[1] - 10, text: dmgText, life: 0.6 });
  // Hit spark (throttled by size)
  const hitCol = towerType === 'frost' ? '#b0e8ff'
    : towerType === 'cannon' ? '#ffaa55'
    : towerType === 'sniper' ? '#ffe8a0'
    : towerType === 'flak' ? '#ffe060'
    : '#ffcc88';
  TD.spawnFxBurst(pos[0], pos[1] - 2, {
    count: towerType === 'cannon' ? 5 : 3,
    color: hitCol, kind: 'spark', speed: 22, size: 1.2, lift: 8, life: 0.18
  });
  if (towerType === 'frost') {
    e.slowTimer = TD.TOWER_TYPES.frost.slowDur;
    e.slowFactor = 1 - TD.TOWER_TYPES.frost.slow;
  }
  if (e.hp <= 0) TD.killEnemy(e);
}

TD.startDeathAnim = function startDeathAnim(e, pos) {
  e.alive = false;
  e.dying = true;
  e.deathX = pos[0];
  e.deathY = pos[1];
  e.deathDur = e.type === 'boss' ? 0.75 : e.type === 'tank' ? 0.5 : 0.38;
  e.deathTimer = e.deathDur;
}

TD.killEnemy = function killEnemy(e) {
  const pos = TD.enemyPos(e);
  TD.startDeathAnim(e, pos);
  r().gold += e.gold;
  r().runStats.kills++;

  if (r().runStats.comboTimer > 0) r().runStats.combo++;
  else r().runStats.combo = 1;
  r().runStats.comboTimer = 2;
  r().runStats.maxCombo = Math.max(r().runStats.maxCombo, r().runStats.combo);
  if (r().runStats.combo >= 3 && r().runStats.combo % 3 === 0) {
    const bonus = Math.floor(r().runStats.combo / 3);
    r().gold += bonus;
    r().comboDisplay = { text: TD.t('game.combo', { combo: r().runStats.combo, bonus }), life: 1.2 };
    TD.bus.emit('sfx', 'combo');
  }

  if (e.type === 'boss') {
    r().hitStop = 0.08;
    r().shakeTimer = 0.4;
    if (r().runStats) r().runStats.bossKills++;
    TD.bus.emit('sfx', { name: 'bossKill', x: pos[0], y: pos[1] });
  } else if (!e.isMinion) {
    TD.bus.emit('sfx', { name: 'kill', x: pos[0], y: pos[1], type: e.type });
  }
  // Layered kill juice: core burst + sparks + rising souls + gold flecks on combo
  const isBoss = e.type === 'boss';
  TD.spawnFxBurst(pos[0], pos[1], {
    count: isBoss ? 16 : e.type === 'tank' ? 10 : 7,
    color: e.color, kind: 'puff', speed: isBoss ? 58 : 42, lift: 20, size: isBoss ? 3 : 2.2
  });
  TD.spawnFxBurst(pos[0], pos[1], {
    count: isBoss ? 12 : 6,
    color: '#ffe8a0', kind: 'spark', speed: isBoss ? 70 : 48, lift: 8, size: 1.4, life: 0.32
  });
  const souls = isBoss ? 10 : 4;
  for (let i = 0; i < souls; i++) {
    TD.pushParticle({
      x: pos[0] + (Math.random() - 0.5) * 8, y: pos[1],
      vx: (Math.random() - 0.5) * 18, vy: -35 - Math.random() * 30,
      life: 0.55 + Math.random() * 0.35,
      color: isBoss ? TD.C.gold : 'rgba(255,255,255,0.75)',
      size: isBoss ? 3 : 2,
      kind: 'soul'
    });
  }
  if (isBoss) {
    TD.spawnFxBurst(pos[0], pos[1], {
      count: 8, color: TD.C.gold, kind: 'spark', speed: 40, lift: 25, size: 2.5, life: 0.5
    });
  }
  if (r().runStats.combo >= 6) {
    TD.spawnFxBurst(pos[0], pos[1] - 6, {
      count: 4, color: TD.C.gold, kind: 'spark', speed: 30, lift: 18, size: 1.5
    });
  }
}

TD.buildTower = function buildTower(slot, type) {
  const def = TD.TOWER_TYPES[type];
  if (slot.tower || r().gold < def.cost) {
    if (r().gold < def.cost) { r().goldFlash = 0.4; TD.bus.emit('sfx', 'noGold'); }
    return false;
  }
  r().gold -= def.cost;
  // Durability: full at build. Campaign chips only; endless may destroy (see towerDamageCanDestroy).
  const baseIntegrity = 90 + (def.cost > 100 ? 30 : 0); // snipers etc slightly tankier baseline
  slot.tower = {
    type, level: 1, invested: def.cost, cooldown: 0, angle: 0, fireFlash: 0, slot, targetMode: 'far',
    integrity: baseIntegrity, maxIntegrity: baseIntegrity
  };
  r().towers.push(slot.tower);
  if (r().runStats) r().runStats.builds++;
  TD.bus.emit('sfx', { name: 'build', x: slot.x, y: slot.y });
  if (r().tutorial.step === 1) r().tutorial.step = 2;
  return true;
}

TD.upgradeTower = function upgradeTower(t) {
  const def = TD.TOWER_TYPES[t.type];
  if (t.level >= 3) return false;
  const cost = def.upgrades[t.level - 1];
  if (r().gold < cost) { r().goldFlash = 0.4; TD.bus.emit('sfx', 'noGold'); return false; }
  r().gold -= cost; t.invested += cost; t.level++;
  // Slight durability boost on upgrade (fantasy support)
  if (typeof t.maxIntegrity === 'number') {
    const gain = 20;
    t.maxIntegrity += gain;
    t.integrity = Math.min(t.maxIntegrity, (t.integrity || t.maxIntegrity) + Math.floor(gain * 0.6));
  }
  TD.bus.emit('sfx', { name: 'upgrade', x: t.slot.x, y: t.slot.y });
  if (r().tutorial.step === 2) r().tutorial.step = 3;
  return true;
}

TD.sellTower = function sellTower(t) {
  r().gold += Math.floor(t.invested * TD.SELL_RATIO);
  r().runStats.sells++;
  t.slot.tower = null;
  r().towers = r().towers.filter(x => x !== t);
  if (r().selectedTower === t) r().selectedTower = null;
  TD.bus.emit('sfx', { name: 'sell', x: t.slot.x, y: t.slot.y });
}

TD.getTowerRange = function getTowerRange(t) {
  const def = TD.TOWER_TYPES[t.type];
  return def.range[Math.min(t.level - 1, def.range.length - 1)] * TD.TILE;
}

TD.getTowerDmg = function getTowerDmg(t) { return TD.TOWER_TYPES[t.type].dmg[t.level - 1]; }

TD.getSellValue = function getSellValue(t) {
  if (!t) return 0;
  let ratio = 1.0;
  if (typeof t.integrity === 'number' && typeof t.maxIntegrity === 'number' && t.maxIntegrity > 0) {
    ratio = Math.max(0.4, t.integrity / t.maxIntegrity); // damaged towers sell for less (future)
  }
  return Math.floor((t.invested || 0) * TD.SELL_RATIO * ratio);
};

// Tower damaged by rare proximity siege. Gameplay rolls = seeded; FX particles = cosmetic Math.random.
TD.hitTower = function hitTower(t, amount = 8) {
  if (!t || !TD.TOWER_DAMAGE_ENABLED) return false;
  if (typeof t.integrity !== 'number') return false;
  t.integrity = Math.max(0, t.integrity - amount);
  t.hitFlash = Math.max(t.hitFlash || 0, 0.35);
  TD.bus.emit('sfx', { name: 'towerHit', x: t.slot.x, y: t.slot.y });
  // cosmetic sparks (non-gameplay)
  const pos = t.slot;
  const sparkCount = 10 + Math.floor(Math.random() * 6);
  for (let i = 0; i < sparkCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 15 + Math.random() * 25;
    r().particles.push({
      x: pos.x + (Math.random() - 0.5) * 6, y: pos.y - 3,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd * 0.7 - 12,
      life: 0.25 + Math.random() * 0.35, color: (Math.random() > 0.5 ? '#ffdd88' : '#ffaa44'), size: 1 + Math.random() * 1.5
    });
  }
  const canDestroy = TD.towerDamageCanDestroy();
  if (t.integrity <= 0) {
    if (canDestroy) {
      TD.destroyTower(t);
    } else {
      // Campaign: leave tower at 1 HP so repair is forced, 3★ stays seed-fair
      t.integrity = 1;
    }
  } else if (canDestroy && t.level > 1 && t.integrity < t.maxIntegrity * 0.35 && TD.runRand() < 0.4) {
    t.level = Math.max(1, t.level - 1);
    TD.bus.emit('sfx', { name: 'towerHit', x: t.slot.x, y: t.slot.y });
  }
  return true;
};

TD.destroyTower = function destroyTower(t) {
  if (!t || !t.slot) return;
  const pos = { x: t.slot.x, y: t.slot.y };
  // strengthened destruction effects
  r().shakeTimer = Math.max(r().shakeTimer, 0.25);
  const colors = ['#888', '#aa6644', '#ffaa55', '#666'];
  for (let i = 0; i < 28; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 22 + Math.random() * 32;
    r().particles.push({
      x: pos.x + (Math.random()-0.5)*4, y: pos.y - 2,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd * 0.75 - 18 - Math.random()*8,
      life: 0.5 + Math.random() * 0.55, color: colors[Math.floor(Math.random()*colors.length)], size: 2 + Math.random() * 2.5
    });
  }
  // extra debris / smoke
  for (let i = 0; i < 12; i++) {
    const ang = Math.random() * Math.PI * 2;
    r().particles.push({
      x: pos.x, y: pos.y - 6,
      vx: Math.cos(ang) * (8 + Math.random()*12), vy: -25 - Math.random()*15,
      life: 0.8 + Math.random() * 0.6, color: '#555', size: 1.5
    });
  }
  // fantasy bonus: destruction damages nearby enemies (risk/reward)
  for (const e of r().enemies) {
    if (!e.alive) continue;
    const ep = TD.enemyPos(e);
    if (Math.hypot(ep[0] - pos.x, ep[1] - pos.y) < 32) {
      TD.damageEnemy(e, 12, 'cannon'); // treat as cannon explosion
    }
  }
  t.slot.tower = null;
  r().towers = r().towers.filter(x => x !== t);
  if (r().selectedTower === t) r().selectedTower = null;
  if (r().runStats) r().runStats.towersLost = (r().runStats.towersLost || 0) + 1;
  TD.bus.emit('sfx', { name: 'towerDestroy', x: pos.x, y: pos.y });
};

TD.getRepairCost = function getRepairCost(t) {
  if (!t || typeof t.integrity !== 'number' || typeof t.maxIntegrity !== 'number') return 0;
  const missing = t.maxIntegrity - t.integrity;
  return Math.max(5, Math.ceil(missing * 0.8));
};

TD.repairTower = function repairTower(t) {
  if (!t || typeof t.integrity !== 'number' || typeof t.maxIntegrity !== 'number') return false;
  if (t.integrity >= t.maxIntegrity) return false;
  const cost = TD.getRepairCost(t);
  if (r().gold < cost) {
    r().goldFlash = 0.4;
    TD.bus.emit('sfx', 'noGold');
    return false;
  }
  r().gold -= cost;
  t.integrity = t.maxIntegrity;
  t.hitFlash = 0.25;
  TD.bus.emit('sfx', { name: 'upgrade', x: t.slot.x, y: t.slot.y }); // reuse for now
  return true;
};

TD.canTowerHit = function canTowerHit(towerType, enemy) {
  const def = TD.TOWER_TYPES[towerType];
  const ground = def.hitsGround !== false;
  const air = def.hitsAir !== false;
  return enemy.flying ? air : ground;
};

TD.cycleTowerTargetMode = function cycleTowerTargetMode(t) {
  if (!t) return;
  const cur = t.targetMode || 'far';
  const idx = TD.TARGET_MODES.indexOf(cur);
  t.targetMode = TD.TARGET_MODES[(idx + 1) % TD.TARGET_MODES.length];
};

TD.getTargetModeLabel = function getTargetModeLabel(mode) {
  const m = mode || 'far';
  return { far: 'F', fast: 'S', strong: 'H', close: 'C' }[m] || 'F'; // F=far/farthest, S=speed/fast, H=highHP/strong, C=close
};

// Mode-aware target picker. Preserves existing boss bias for 'far'/'strong' and special tower behaviors where sensible.
TD.pickTargetByMode = function pickTargetByMode(inRange, t) {
  if (!inRange || !inRange.length) return null;
  const mode = t.targetMode || 'far';
  const tx = t.slot.x, ty = t.slot.y;

  // Strong boss preference for threat-focused modes (keeps Sniper "feel")
  if ((mode === 'far' || mode === 'strong') && t.type !== 'frost') {
    const bosses = inRange.filter(e => e.type === 'boss');
    if (bosses.length) inRange = bosses;
  }

  if (mode === 'fast') {
    return inRange.reduce((b, e) => (e.speed > b.speed ? e : b));
  }
  if (mode === 'strong') {
    return inRange.reduce((b, e) => ((e.maxHp || e.hp) > (b.maxHp || b.hp) ? e : b));
  }
  if (mode === 'close') {
    return inRange.reduce((b, e) => {
      const pa = TD.enemyPos(e), pb = TD.enemyPos(b);
      const da = Math.hypot(pa[0] - tx, pa[1] - ty);
      const db = Math.hypot(pb[0] - tx, pb[1] - ty);
      return da < db ? e : b;
    });
  }
  // 'far' (default) — farthest progress (threat to base)
  return inRange.reduce((b, e) => TD.getPathDist(e) > TD.getPathDist(b) ? e : b);
};

TD.findTarget = function findTarget(t) {
  const range = TD.getTowerRange(t);
  const inRange = r().enemies.filter(e => {
    if (!e.alive || !TD.canTowerHit(t.type, e)) return false;
    const p = TD.enemyPos(e);
    return Math.hypot(p[0] - t.slot.x, p[1] - t.slot.y) <= range;
  });
  if (!inRange.length) return null;

  // Cannon keeps dedicated cluster/AoE targeting (core fantasy); mode can still be set for future or display
  if (t.type === 'cannon') {
    let best = null, bestCount = 0;
    for (const e of inRange) {
      const ep = TD.enemyPos(e);
      const count = inRange.filter(o => Math.hypot(TD.enemyPos(o)[0] - ep[0], TD.enemyPos(o)[1] - ep[1]) <= TD.TOWER_TYPES.cannon.aoe * TD.TILE).length;
      if (count > bestCount) { bestCount = count; best = e; }
    }
    return best || TD.pickTargetByMode(inRange, t);
  }

  // Frost historically favored speed — respect explicit mode but default fast if none chosen yet
  if (t.type === 'frost' && !t.targetMode) {
    return inRange.reduce((b, e) => e.speed > b.speed ? e : b);
  }

  return TD.pickTargetByMode(inRange, t);
}

TD.fireTower = function fireTower(t, target) {
  if (r().projectiles.length >= TD.MAX_PROJECTILES) return;
  const ep = TD.enemyPos(target);
  t.angle = Math.atan2(ep[1] - t.slot.y, ep[0] - t.slot.x);
  t.fireFlash = t.type === 'cannon' ? 0.2 : t.type === 'sniper' ? 0.15 : 0.1;
  const sfx = { arrow: 1, flak: 1, cannon: 1, frost: 1, sniper: 1 }[t.type];
  if (sfx) TD.bus.emit('sfx', { name: t.type, x: t.slot.x, y: t.slot.y });

  // Muzzle flash particles along barrel direction
  const mx = t.slot.x + Math.cos(t.angle) * 8;
  const my = t.slot.y + Math.sin(t.angle) * 8;
  const muzzleCol = t.type === 'frost' ? '#c0f0ff'
    : t.type === 'cannon' ? '#ff9944'
    : t.type === 'sniper' ? '#fff0b0'
    : t.type === 'flak' ? '#ffe060'
    : '#ffdd88';
  TD.spawnFxBurst(mx, my, {
    count: t.type === 'cannon' ? 5 : t.type === 'sniper' ? 3 : 2,
    color: muzzleCol, kind: 'spark', speed: 18, lift: 2, size: 1.3, life: 0.14
  });

  // Rare reflect (seeded — affects damage dealt)
  if (TD.TOWER_DAMAGE_ENABLED && TD.TOWER_DAMAGE_CHANCE_MULT > 0 &&
      TD.runRand() < 0.015 * TD.TOWER_DAMAGE_CHANCE_MULT) {
    TD.bus.emit('sfx', { name: 'reflect', x: t.slot.x, y: t.slot.y });
    if (target && target.alive) {
      TD.damageEnemy(target, Math.floor(TD.getTowerDmg(t) * 0.4), t.type);
    }
  }

  r().projectiles.push({
    id: r().projId++, type: t.type, x: t.slot.x, y: t.slot.y,
    tx: ep[0], ty: ep[1], target, dmg: TD.getTowerDmg(t),
    speed: t.type === 'sniper' ? 400 : 250, alive: true, trail: []
  });
}

TD.updateTowers = function updateTowers(dt) {
  for (const t of r().towers) {
    if (t.fireFlash > 0) t.fireFlash -= dt * r().speedMul;
    if (t.hitFlash > 0) t.hitFlash -= dt * r().speedMul * 1.8; // faster fade for impact reaction
    t.cooldown -= dt * r().speedMul;
    if (t.cooldown > 0) continue;
    const target = TD.findTarget(t);
    if (!target) continue;
    TD.fireTower(t, target);
    t.cooldown = 1 / TD.TOWER_TYPES[t.type].rate;
  }
}

// Rare tower siege. Seeded rolls so same seed → same siege outcomes.
// Debug (?debug=1) boosts chance for visual testing.
TD.updateTowerSiege = function updateTowerSiege(dt) {
  if (!TD.TOWER_DAMAGE_ENABLED || !TD.TOWER_DAMAGE_CHANCE_MULT) return;
  let mult = TD.TOWER_DAMAGE_CHANCE_MULT;
  if (TD.debug) mult = Math.max(mult, 0.8);
  const sd = dt * r().speedMul;
  for (const t of r().towers) {
    if (!t || t.integrity <= 0) continue;
    for (const e of r().enemies) {
      if (!e.alive) continue;
      const p = TD.enemyPos(e);
      const dist = Math.hypot(p[0] - t.slot.x, p[1] - t.slot.y);
      if (dist > 28) continue;
      let chance = 0, dmg = 3;
      if (e.type === 'tank') { chance = 0.012; dmg = 5; }
      else if (e.type === 'boss') { chance = 0.035; dmg = 9; }
      else if (e.type === 'armored') { chance = 0.006; dmg = 4; }
      else continue;
      if (TD.runRand() < chance * mult * sd * 12) {
        TD.hitTower(t, dmg);
        break;
      }
    }
  }
};

TD.updateBosses = function updateBosses(dt) {
  const sd = dt * r().speedMul;
  for (const e of r().enemies) {
    if (e.type !== 'boss' || !e.alive) continue;
    if (e.shieldTimer > 0) e.shieldTimer -= sd;
    else if (e.shieldInterval > 0) {
      e.shieldCd -= sd;
      if (e.shieldCd <= 0) {
        e.shieldTimer = e.shieldDur;
        e.shieldCd = e.shieldInterval;
      }
    }
    if (e.regen > 0 && e.regenBelow > 0 && e.hp / e.maxHp < e.regenBelow) {
      e.hp = Math.min(e.maxHp, e.hp + e.regen * sd);
    }
    if (e.spawnInterval > 0) {
      e.spawnCd -= sd;
      if (e.spawnCd <= 0) {
        e.spawnCd = e.spawnInterval;
        TD.spawnBossMinion(e);
      }
    }
  }
}

TD.updateProjectiles = function updateProjectiles(dt) {
  for (const p of r().projectiles) {
    if (!p.alive) continue;
    if (p.type === 'cannon' && p.trail) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 4) p.trail.shift();
    }
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      p.alive = false;
      if (p.type === 'cannon') {
        const aoeR = TD.TOWER_TYPES.cannon.aoe * TD.TILE;
        for (const e of r().enemies) {
          if (!e.alive || !TD.canTowerHit('cannon', e)) continue;
          const ep = TD.enemyPos(e);
          if (Math.hypot(ep[0] - p.x, ep[1] - p.y) <= aoeR) TD.damageEnemy(e, p.dmg, 'cannon');
        }
        TD.spawnFxBurst(p.x, p.y, { count: 8, color: TD.C.cannon, kind: 'puff', speed: 36, lift: 6, size: 2.5 });
        TD.spawnFxBurst(p.x, p.y, { count: 6, color: '#ffaa55', kind: 'spark', speed: 50, lift: 4, size: 1.5, life: 0.25 });
        TD.bus.emit('sfx', { name: 'hit', x: p.x, y: p.y, type: 'cannon' });
      } else if (p.target && p.target.alive) {
        TD.damageEnemy(p.target, p.dmg, p.type);
        TD.bus.emit('sfx', { name: 'hit', x: p.x, y: p.y, type: p.type });
      }
      continue;
    }
    const step = p.speed * dt * r().speedMul;
    p.x += (dx / dist) * step; p.y += (dy / dist) * step;
    if (p.target && p.target.alive) { const ep = TD.enemyPos(p.target); p.tx = ep[0]; p.ty = ep[1]; }
  }
  r().projectiles = r().projectiles.filter(p => p.alive);
}

// ─── Waves ───────────────────────────────────────────────────
TD.rebuildSpawnQueue = function rebuildSpawnQueue() {
  r().spawnQueue = [];
  let cum = 0;
  for (const group of TD.getWaveDef(r().wave)) {
    if (r().spawnQueue.length > 0) cum += (group.interval > 0 ? group.interval : 1000) / 1000;
    for (let i = 0; i < group.count; i++) {
      if (i > 0) cum += (group.interval || 800) / 1000;
      r().spawnQueue.push({ type: group.type, time: cum });
    }
  }
}

TD.startWave = function startWave() {
  if (r().gameMode === 'campaign' && r().wave >= TD.getCampaignWaveCount()) return;
  r().wavePhase = 'spawning';
  r().bossesSpawnedWave = 0;
  TD.rebuildSpawnQueue();
  r().spawnTimer = 0;
  if (TD.waveHasBoss(r().wave)) {
    r().waveBanner = { text: TD.t('game.boss'), life: 2 };
    TD.bus.emit('sfx', 'bossWarn');
  } else {
    r().waveBanner = { text: TD.getWaveLabel(), life: 1.5 };
    TD.bus.emit('sfx', 'waveStart');
  }
  r().spawnFlash = 0.8;
  const sp = TD.PATH_WAYPOINTS[0];
  for (let i = 0; i < 10; i++) {
    const ang = Math.random() * Math.PI * 2;
    r().particles.push({
      x: sp[0], y: sp[1], vx: Math.cos(ang) * 50, vy: Math.sin(ang) * 50,
      life: 0.5, color: TD.C.gold, size: 3
    });
  }
}

TD.skipWavePause = function skipWavePause() {
  if (r().state !== TD.STATE.PLAYING || r().wavePhase !== 'pause') return;
  r().waveTimer = 0;
};

TD.updateWaves = function updateWaves(dt) {
  if (r().wavePhase === 'pause') {
    r().waveTimer -= dt * r().speedMul;
    // Anticipation sounds as wave approaches (priority 4)
    if (r().waveTimer < 4.5) {
      // use a hidden timer or random chance, increasing frequency
      if (!r()._anticipateNext) r()._anticipateNext = 0;
      r()._anticipateNext -= dt * r().speedMul;
      const urgency = Math.max(0.3, (4.5 - r().waveTimer) / 3);
      if (r()._anticipateNext <= 0) {
        TD.bus.emit('sfx', 'anticipate');
        r()._anticipateNext = 0.9 / urgency; // more frequent when close
      }
    }
    if (r().waveTimer <= 0) TD.startWave();
    return;
  }
  r().spawnTimer += dt * r().speedMul;
  while (r().spawnQueue.length && r().spawnTimer >= r().spawnQueue[0].time) TD.spawnEnemy(r().spawnQueue.shift().type);
  if (r().spawnQueue.length === 0 && r().enemies.length === 0) {
    r().gold += 8 + r().wave + (r().gameMode === 'endless' ? Math.floor(r().wave / 3) : 0);
    if (r().gameMode === 'campaign' && r().wave >= TD.getCampaignWaveCount() - 1) { TD.endGame(true); return; }
    r().wave++; r().wavePhase = 'pause'; r().waveTimer = TD.WAVE_PAUSE;
    r()._anticipateNext = 0;
    if (r().wave >= 2) r().tutorial.dismissed = true;
    if (r().gameMode === 'endless' && r().wave > 0 && r().wave % 5 === 0) {
      const bonus = 12 + r().wave * 2;
      r().gold += bonus;
      r().comboDisplay = { text: TD.t('game.milestone', { wave: r().wave, bonus }), life: 1.4 };
      TD.bus.emit('sfx', 'combo');
    }
  }
}

TD.startGame = function startGame(mapId, mode, providedSeed) {
  TD.loadMap(mapId);
  r().gameMode = mode;
  r().difficulty = r().menuDifficulty;
  const diff = TD.getDifficulty();
  r().gold = Math.round(TD.START_GOLD * diff.goldMult);
  r().baseHp = TD.BASE_HP_MAX; r().wave = 0; r().waveTimer = 3; r().wavePhase = 'pause';
  r().spawnQueue = []; r().enemies = []; r().projectiles = []; r().particles = []; r().dmgNumbers = []; r().towers = [];
  TD.BUILD_SLOTS.forEach(s => s.tower = null);
  r().selectedTowerType = null; r().selectedTower = null; r().speedMul = 1;
  r().tutorial = { step: 0, dismissed: r().gameMode === 'endless' };
  r().runStats = TD.newRunStats();
  r().lastRunResult = null;
  r().hitStop = 0; r().comboDisplay = null; r().spawnFlash = 0; r().lowHpWarned = false;
  r().musicTension = 0; r().musicTensionTier = 0;
  r().musicTrack = null;
  r()._anticipateNext = 0;
  r().demo = false;
  r().demoRestartTimer = 0;
  r().demoDecisionTimer = 0.8; // first decision soon after start
  r().state = TD.STATE.PLAYING;

  // Setup run seed for variety (same seed on same map = identical but different runs possible)
  // Priority: providedSeed (from menu reroll) > URL ?seed= > generate new
  const params = (typeof location !== 'undefined') ? new URLSearchParams(location.search) : new URLSearchParams('');
  let seed = providedSeed || params.get('seed') || (r().menuSeed) || TD.generateSeed();
  r().runSeed = seed;
  TD._seededRand = TD.createSeededRandom(seed); // use TD._seededRand() for deterministic random in this run

  if (TD.isDemo) {
    r().demo = true;
    r().tutorial.dismissed = true;
    r().speedMul = 1;
    // place curated starter towers (affordable only)
    const starters = TD.getDemoStarters(TD.currentMapId);
    for (const [type, idx] of starters) {
      const slot = TD.BUILD_SLOTS[idx];
      if (slot && !slot.tower) {
        const def = TD.TOWER_TYPES[type];
        if (r().gold >= def.cost) {
          TD.buildTower(slot, type);
        }
      }
    }
  }

  if (!TD.isDemo) {
    r().gamesPlayed++;
    localStorage.setItem('gamesPlayed', r().gamesPlayed);
    if (TD.track) {
      TD.track('play_start', {
        map_id: TD.currentMapId,
        mode: r().gameMode,
        difficulty: r().menuDifficulty || 'normal',
        seed: String(r().runSeed || '')
      });
    }
  }
  TD.initAudio();
  TD.bus.emit('music:start');
}

TD.resetGame = function resetGame() {
  if (r().state === TD.STATE.MENU) {
    TD.startGame(r().menuMap, r().menuMode);
    return;
  }
  r().state = TD.STATE.MENU;
  TD.bus.emit('music:stop');
}

TD.endGame = function endGame(won) {
  r().state = won ? TD.STATE.WON : TD.STATE.LOST;
  // ensure music + ambient fully stop (no lingering low hum/drone after win/lose)
  TD.musicActive = false;
  if (TD.stopMusic) TD.stopMusic();
  else TD.bus.emit('music:stop');
  const reached = won && r().gameMode === 'campaign' ? TD.getCampaignWaveCount() : r().wave + 1;
  const mapId = TD.currentMapId;

  const isDemoRun = !!TD.isDemo || !!r().demo;
  if (!isDemoRun) {
    if (r().gameMode === 'campaign') TD.setBestWave(mapId, reached);
    if (r().gameMode === 'endless') TD.setBestEndless(mapId, reached);
  }

  const elapsed = r().runStats ? (performance.now() - r().runStats.startTime) / 1000 : 0;
  const stars = r().gameMode === 'campaign' ? TD.calcStars(won) : 0;
  r().lastRunResult = {
    won, stars, kills: r().runStats?.kills || 0, maxCombo: r().runStats?.maxCombo || 0,
    time: elapsed, baseHp: r().baseHp, sells: r().runStats?.sells || 0, pauses: r().runStats?.pauseCount || 0,
    towersLost: r().runStats?.towersLost || 0,
    wave: reached, mode: r().gameMode, mapId,
    seed: r().runSeed || null,
    diff: r().menuDifficulty || 'normal'
  };
  r().shareFlash = null;
  if (!isDemoRun && won && r().gameMode === 'campaign') {
    TD.setBestStars(mapId, stars);
    TD.setBestTime(mapId, elapsed);
  }
  TD.bus.emit('sfx', won ? 'win' : 'lose');
  if (!isDemoRun && TD.checkAchievements) TD.checkAchievements(r().lastRunResult);
  if (!isDemoRun && TD.track) {
    TD.track(won ? 'win' : 'lose', {
      map_id: mapId,
      mode: r().gameMode,
      stars: stars,
      wave: reached,
      seed: String(r().runSeed || '')
    });
  }

  if (isDemoRun) {
    r().demoRestartTimer = TD.DEMO_RESTART_DELAY;
  }
}

TD.togglePause = function togglePause() {
  if (r().state === TD.STATE.PLAYING) {
    if (r().runStats && !TD.isDemo) r().runStats.pauseCount++;
    r().state = TD.STATE.PAUSED;
  } else if (r().state === TD.STATE.PAUSED) {
    r().state = TD.STATE.PLAYING;
  }
}
})();
