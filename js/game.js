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

// Demo mode globals (flags set early from config.js)
TD.DEMO_CYCLE = ['meadow', 'canyon', 'ruins', 'rift'];
TD._demoDecisionCooldown = 0;

TD.getNextDemoMap = function getNextDemoMap() {
  if (TD.demoMap) return TD.demoMap;
  const cur = TD.currentMapId || 'meadow';
  const idx = TD.DEMO_CYCLE.indexOf(cur);
  return TD.DEMO_CYCLE[(idx + 1) % TD.DEMO_CYCLE.length];
};

TD.getDemoStarters = function getDemoStarters(mapId) {
  // Varied early starts, avoid slot 0 (spawn exit). Good positions.
  // Possible: AR+AR on high cov, FR+AR (FR early, AR central), Sniper central.
  const variants = {
    meadow: [ [1,4,6,8,10], [2,5,7,9,11], [1,3,6,8,10], [2,4,5,7,10] ],
    canyon: [ [1,3,5,7,9], [2,4,6,8,10], [1,4,6,8,9], [2,3,5,7,9] ],
    ruins:  [ [1,3,5,7,11], [2,4,6,8,10], [1,4,5,8,11], [2,3,6,8,10] ],
    rift:   [ [1,4,6,8,10], [2,3,5,7,9], [1,5,7,9,11], [2,4,6,8,11] ]
  };
  const idxs = (variants[mapId] || variants.meadow)[Math.floor(Math.random()*4)];

  const r = Math.random();
  let first, second;
  if (r < 0.3) {
    first = 'arrow'; second = 'arrow'; // AR+AR on high cov
  } else if (r < 0.6) {
    first = 'frost'; second = 'arrow'; // FR early, AR central
  } else {
    first = (Math.random() < 0.5 ? 'arrow' : 'frost');
    second = 'sniper'; // try sniper central if gold
  }

  return [
    [first, idxs[0]],
    [second, idxs[1]],
    ['flak', idxs[2]],
    ['cannon', idxs[3]],
    ['sniper', idxs[4]]
  ];
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
      // Rift map non-standard mechanic: flyers take airShortcut across the chasm (skip long ground detour)
      const m = TD.MAPS[TD.currentMapId];
      const sc = m && m._airShortcut;
      if (e.flying && sc && !e._shortcutUsed) {
        if (e.wp >= (sc.from || 0) && e.wp < (sc.to || 999)) {
          // Capture origin BEFORE changing anything
          const fromX = cur[0];
          const fromY = cur[1] - (e.flying ? TD.FLY_HEIGHT : 0);

          e.wp = sc.to;
          e.progress = 0;
          e._shortcutUsed = true;

          const toWp = TD.PATH_WAYPOINTS[Math.min(e.wp, TD.PATH_WAYPOINTS.length-1)] || cur;
          const toX = toWp[0];
          const toY = toWp[1] - (e.flying ? TD.FLY_HEIGHT : 0);

          // set facing to the outgoing segment after jump to avoid visual "extra move" snap at entry
          const nextWp = TD.PATH_WAYPOINTS[Math.min(e.wp + 1, TD.PATH_WAYPOINTS.length - 1)];
          if (nextWp && toWp) {
            e.facing = Math.atan2(nextWp[1] - toWp[1], nextWp[0] - toWp[0]);
          }

          // Set visual flight state so enemyPos lerps the sprite across the gap
          // (this is what makes it not feel like pure teleport)
          e._riftCross = {
            fromX: fromX,
            fromY: fromY,
            toX: toX,
            toY: toY,
            start: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
            duration: 420   // ~0.42s visible straight flight across chasm
          };

          // Launch + crossing + arrival particles (complement the lerped sprite)
          for (let k=0; k<3; k++) {
            r().particles.push({ x: fromX, y: fromY, vx: (Math.random()-0.5)*25, vy: -15, life: 0.22, color: '#9ad0ff', size: 2 });
          }
          for (let k = 0; k < 7; k++) {
            const t = k / 6;
            const cx = fromX * (1-t) + toX * t;
            const cy = fromY * (1-t) + toY * t;
            r().particles.push({
              x: cx, y: cy,
              vx: (toX - fromX) * 0.7 + (Math.random()-0.5)*20,
              vy: (toY - fromY) * 0.2 - 4,
              life: 0.2 + Math.random()*0.08,
              color: '#7ac8ff', size: 1.5
            });
          }
          for (let k = 0; k < 4; k++) {
            const spread = (k - 1.5) * 14;
            r().particles.push({
              x: toX + spread*0.2, y: toY,
              vx: spread*0.4, vy: -8 - Math.random()*5,
              life: 0.28, color: '#a0d0ff', size: 2
            });
          }
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

  // Rift air shortcut: show the flyer visibly flying straight across the chasm for a short time
  // (so it doesn't look like pure teleport). Gameplay wp is already updated.
  if (e._riftCross && e._riftCross.duration) {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const elapsed = now - e._riftCross.start;
    const t = Math.min(1, elapsed / e._riftCross.duration);
    if (t >= 1) {
      delete e._riftCross;
    } else {
      const yOff = e.flying ? -TD.FLY_HEIGHT : 0;
      const x = e._riftCross.fromX * (1-t) + e._riftCross.toX * t;
      const y = e._riftCross.fromY * (1-t) + e._riftCross.toY * t + yOff;
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

TD.damageEnemy = function damageEnemy(e, dmg, towerType) {
  const pos = TD.enemyPos(e);
  if (e.shieldTimer > 0) {
    r().dmgNumbers.push({ x: pos[0], y: pos[1] - 10, text: 'BLOCK', life: 0.45 });
    return;
  }
  const dealt = Math.max(1, Math.round(dmg * (1 - (e.armor || 0))));
  e.hp -= dealt;
  const dmgText = e.armor > 0 && dealt < dmg ? '-' + dealt : '-' + Math.round(dmg);
  r().dmgNumbers.push({ x: pos[0], y: pos[1] - 10, text: dmgText, life: 0.6 });
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

  const burst = e.type === 'boss' ? 14 : 7;
  if (e.type === 'boss') {
    r().hitStop = 0.06;
    r().shakeTimer = 0.35;
    if (r().runStats) r().runStats.bossKills++;
    TD.bus.emit('sfx', { name: 'bossKill', x: pos[0], y: pos[1] });
  } else if (!e.isMinion) {
    TD.bus.emit('sfx', { name: 'kill', x: pos[0], y: pos[1], type: e.type });
  }
  for (let i = 0; i < burst; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = e.type === 'boss' ? 60 : 40;
    r().particles.push({
      x: pos[0], y: pos[1], vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 25,
      life: 0.4 + Math.random() * 0.4, color: e.color, size: 2 + Math.random() * 3
    });
  }
  const souls = e.type === 'boss' ? 8 : 4;
  for (let i = 0; i < souls; i++) {
    r().particles.push({
      x: pos[0] + (Math.random() - 0.5) * 8, y: pos[1],
      vx: (Math.random() - 0.5) * 18, vy: -35 - Math.random() * 30,
      life: 0.55 + Math.random() * 0.35,
      color: e.type === 'boss' ? TD.C.gold : 'rgba(255,255,255,0.7)',
      size: e.type === 'boss' ? 3 : 2
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
  // Durability model (stub for tower damage fantasy). Starts full. Damage system is OFF / 0% by default.
  // integrity can be chipped by rare enemy proximity attacks (tanks/bosses). Downgrade or destroy at 0.
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
        for (let i = 0; i < 5; i++) {
          const ang = Math.random() * Math.PI * 2;
          r().particles.push({ x: p.x, y: p.y, vx: Math.cos(ang) * 30, vy: Math.sin(ang) * 30, life: 0.3, color: TD.C.cannon, size: 3 });
        }
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

// ─── Demo AI (self-playing) ──────────────────────────────────
TD.updateDemo = function updateDemo(dt) {
  if (!TD.isDemo || !TD.run.demo) return;

  // Restart timer must run even on WON/LOST (victory/defeat screens in demo).
  // This was previously blocked by the PLAYING guard below.
  if (TD.run.demoRestartTimer > 0) {
    TD.run.demoRestartTimer -= dt;
    if (TD.run.demoRestartTimer <= 0) {
      TD.restartDemoRound();
    }
    return;
  }

  if (TD.run.state !== TD.STATE.PLAYING) return;

  TD.run.demoDecisionTimer -= dt * TD.run.speedMul;
  if (TD.run.demoDecisionTimer > 0) return;

  TD.run.demoDecisionTimer = TD.DEMO_DECISION_INTERVAL + (Math.random() - 0.5) * 0.6;

  const gold = TD.run.gold;
  const empties = TD.BUILD_SLOTS.filter(s => !s.tower);

  // --- Demo bot helpers (lightweight) ---
  function getRemainingPathCoverage(px, py, radius, startWp = 0) {
    let covered = 0;
    const r2 = radius * radius;
    for (let i = Math.max(0, startWp); i < TD.PATH_WAYPOINTS.length - 1; i++) {
      const a = TD.PATH_WAYPOINTS[i];
      const b = TD.PATH_WAYPOINTS[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const da = (a[0] - px) ** 2 + (a[1] - py) ** 2 <= r2;
      const db = (b[0] - px) ** 2 + (b[1] - py) ** 2 <= r2;
      const mx = (a[0] + b[0]) * 0.5, my = (a[1] + b[1]) * 0.5;
      const dm = (mx - px) ** 2 + (my - py) ** 2 <= r2 * 1.15;
      if (da || db || dm) covered += len;
    }
    return covered;
  }

  function estimateTimeToReach(targetSlot, avgSlowFactor = 1) {
    const sx = TD.PATH_WAYPOINTS[0][0], sy = TD.PATH_WAYPOINTS[0][1];
    const dist = Math.hypot(targetSlot.x - sx, targetSlot.y - sy);
    const baseSpeed = 38; // rough average enemy speed
    const eff = Math.max(8, baseSpeed * (avgSlowFactor || 1));
    return dist / eff;
  }

  // === Demo bot — Unified Action Scoring (reassembled spec) ===
  // GOAL: competent, varied, interesting demo that showcases all towers without stupid early leaks or late AR spam.
  // - Wave 1+: NEVER on slot 0 (spawn exit). Frost first (upstream), then AR only on high-cov (turns/max overlap).
  // - Frost before AR always early (no AR+Frost combo that leaks on wave 1).
  // - Central Sniper on high-cov positions covering multiple segments when gold allows.
  // - More randomness: occasional 2xAR, central sniper, other types.
  // - When solid (heldMid + 4+ AR + good HP): save/skip instead of more AR; buy expensive (sniper/cannon/flak).
  // - Hard caps: max 1 Flak, max 3 Frost (no more).
  // - Probabilistic (softmax + deliberate top-K + noise) for variety across runs.
  // Implementation: per (type+slot) score with cov, synergy, timing, choke, experiment, save penalties + post-filters/guards.
  if (empties.length > 0 && gold >= 45) {
    const wave = TD.run.wave;
    const waveDef = TD.getWaveDef(wave) || [];

    const affordable = TD.TOWER_ORDER.filter(t => gold >= TD.TOWER_TYPES[t].cost);
    if (affordable.length > 0) {
      const counts = {};
      for (const t of TD.run.towers) counts[t.type] = (counts[t.type] || 0) + 1;

      // Current threats
      const hasFlyerInWave = waveDef.some(g => g.type === 'flyer');
      const hasTankOrBoss = waveDef.some(g => g.type === 'tank' || g.type === 'boss');
      let liveFlyers = 0, liveTanksOrBoss = 0, liveRunners = 0, totalSlow = 0, enemyCount = 0;
      let minWp = TD.PATH_WAYPOINTS.length;
      for (const e of TD.run.enemies) {
        if (!e.alive) continue;
        if (e.flying) liveFlyers++;
        if (e.type === 'tank' || e.type === 'boss') liveTanksOrBoss++;
        if (e.type === 'runner') liveRunners++;
        if (e.slowTimer > 0) totalSlow += e.slowFactor;
        enemyCount++;
        if (e.wp < minWp) minWp = e.wp;
      }
      const avgSlow = enemyCount > 0 ? totalSlow / enemyCount : 1.0;
      const startWp = Math.max(0, minWp - 1);

      const arrowCount = counts['arrow'] || 0;
      const earlyGame = (wave <= 2) || (TD.run.towers.length < 3);
      const heldMid = minWp < 4 && (TD.run.baseHp >= 13);  // enemies not advancing far
      const solidDefense = (TD.run.baseHp >= 14) && (arrowCount >= 4) && heldMid;

      // The earliest empty in generation order is the spawn-proximal one (position 0)
      const earliestEmpty = empties.length > 0 ? empties[0] : null;

      // Build all possible actions
      const actions = [];
      for (const type of affordable) {
        // Temporary experiment: ban AR after wave 4 to force variety and better towers
        if (wave > 4 && type === 'arrow') continue;

        // Hard caps for demo bot: max 1 Flak, max 3 Frost
        if (type === 'flak' && (counts['flak'] || 0) >= 1) continue;
        if (type === 'frost' && (counts['frost'] || 0) >= 3) continue;

        const tdef = TD.TOWER_TYPES[type];
        const baseRange = tdef.range[0] * TD.TILE;

        for (const slot of empties) {
          let score = 0;

          const distToStart = Math.hypot(slot.x - TD.PATH_WAYPOINTS[0][0], slot.y - TD.PATH_WAYPOINTS[0][1]);

          // 1. Remaining path coverage (future path only)
          const cov = getRemainingPathCoverage(slot.x, slot.y, baseRange, startWp);
          score += cov * 1.8;

          // Avoid position 0 (spawn exit) strictly early. Position 1+ ok.
          if (earlyGame && earliestEmpty && slot === earliestEmpty) {
            score -= (wave <= 1 ? 250 : 100);
          }

          // Early patterns for wave 1: varied good starts
          // - AR+AR on high cov positions (not 0)
          // - FR (upstream good) + AR in center/high overlap
          // - Sniper in center high cov
          if (earlyGame) {
            const hasFrost = (counts['frost'] || 0) > 0;
            if (type === 'arrow') {
              if (cov < 35) score -= 45; // only high cov (turns, max overlap)
              if (cov > 42) score += 35;
              if (distToStart < 30) score -= 25; // avoid too early for AR
            }
            if (type === 'frost' && !hasFrost) {
              score += 40;
              if (distToStart > 20 && distToStart < 70) score += 15; // good upstream for FR
            }
            if (type === 'arrow' && !hasFrost && wave <= 2) score -= 35; // avoid AR before FR on wave1
            if (type === 'sniper' && gold >= 120 && isGoodChoke) score += 70;
            if (type === 'sniper' && gold >= 120 && cov > 35) score += 45;
            if (type === 'cannon' && cov > 30) score += 15;
          }

          // 2. Synergy (especially Frost amplifying existing DPS)
          if (type === 'frost') {
            let synergy = 0;
            for (const tw of TD.run.towers) {
              if (tw.type === 'frost') continue;
              // Rough: if this slow spot is "before" the DPS tower on path
              const d = Math.hypot(tw.slot.x - slot.x, tw.slot.y - slot.y);
              if (d > 10) synergy += 18; // upstream-ish slow is valuable
            }
            score += synergy;

            // 3. Timing awareness: don't place slow too far ahead
            const timeToReach = estimateTimeToReach(slot, avgSlow);
            // rough remaining slow time (average)
            const remainingSlowTime = 1.8; // frost slowDur is 2, a bit margin
            if (timeToReach > remainingSlowTime * 0.65) {
              score *= 0.35; // placing slow that will have expired is bad
            }
          } else {
            // For DPS towers: small bonus if there is upstream slow active
            if (avgSlow < 0.85) score += 12;
          }

          // 4. Threat match (weighted by coverage)
          let threat = 0;
          if (type === 'flak' && (hasFlyerInWave || liveFlyers > 0)) threat = 95;
          if (type === 'sniper' && (hasTankOrBoss || liveTanksOrBoss > 0)) threat = 90;
          if (type === 'cannon' && (liveRunners + liveTanksOrBoss > 1)) threat = 70;
          if (type === 'frost' && (liveRunners > 0 || wave >= 2)) threat = 65;
          score += threat;

          // Extra for sniper early when gold sufficient (even without immediate threat)
          if (type === 'sniper' && gold >= 120 && wave < 5 && cov > 25) {
            score += 35;
          }

          // Choke / multi-path overlap bonus (good central positions that cover long or multiple segments)
          const isGoodChoke = cov > 30 && distToStart > 25 && distToStart < 120;
          if (isGoodChoke) {
            score += 25;
            if (type === 'sniper') score += 55; // strong push for central high-cov sniper covering several road segments
            if (type === 'cannon') score += 20;
          }

          // 5. Diversity + anti-over-spam (stronger when held mid with many AR)
          const curCount = counts[type] || 0;
          if (type === 'arrow') {
            score += (6 - Math.min(curCount, 6)) * 12;
            if (curCount >= 3 && !earlyGame) score -= 40 + curCount * 8;
            if (curCount >= 5) score -= 45;
            if (earlyGame && curCount >= 2) score -= 15; // allow 2 AR early on good pos
            if (heldMid && curCount >= 4) {
              score *= 0.15;  // when enemies held mid and have enough AR, heavily discourage more
            }
            if (cov < 28) score -= 20; // AR preferably on high coverage positions
          } else {
            score += (4 - Math.min(curCount, 4)) * 20;
          }
          if (type === 'frost' && curCount >= 2) score -= 22;
          if (type === 'flak' && curCount >= 2) score -= 25;
          if (type === 'cannon' && curCount >= 2) score -= 20;

          // 6. Position quality (light penalty only for extremely early non-frost after wave 1)
          if (distToStart < 20 && type !== 'frost' && wave > 1) score -= 8;

          // 7. Save-up logic: when we have some gold but not enough for great tower, discourage pure cheap spam
          if (type === 'arrow' && gold > 70 && gold < 125) {
            score *= 0.55;   // often worth waiting one decision for better tower
          }

          // 8. Strategic Frost placement + no stacking
          if (type === 'frost') {
            // Bonus for placing before existing DPS towers (synergy)
            let towersAfter = 0;
            for (const tw of TD.run.towers) {
              if (tw.type !== 'frost') {
                const d = Math.hypot(tw.slot.x - slot.x, tw.slot.y - slot.y);
                if (d > 20) towersAfter++;
              }
            }
            score += towersAfter * 14;

            // Strong penalty for consecutive or close Frosts
            let recentFrosts = 0;
            const recent = TD.run.towers.slice(-3);
            for (const tw of recent) if (tw.type === 'frost') recentFrosts++;
            if (recentFrosts > 0) score -= 35 * recentFrosts;

            for (const tw of TD.run.towers) {
              if (tw.type === 'frost') {
                const d = Math.hypot(tw.slot.x - slot.x, tw.slot.y - slot.y);
                if (d < 55) score -= 28;
              }
            }
          }

          // 9. Wealth / save bonus when held mid: strongly prefer saving for expensive
          if (heldMid && gold > 90) {
            if (type === 'sniper') score += 70;
            if (type === 'cannon' || type === 'flak') score += 40;
            if (type === 'arrow' && curCount >= 4) score *= 0.2;
          } else if (gold > 100 || solidDefense) {
            if (type === 'sniper') score += 55;
            if (type === 'cannon' || type === 'flak') score += 32;
          }

          // 10. Curiosity / experiment term (the fun part) - strong noise for real variety
          score += (Math.random() - 0.5) * 48;

          // Occasional experiment: boost central high-cov sniper and varied good plays
          if (Math.random() < 0.35) {
            if (type === 'sniper' && cov > 30 && distToStart > 25 && distToStart < 110) score += 70; // central multi-road sniper
            if (type === 'sniper' && cov > 38) score += 40;
            if (type === 'cannon' && cov > 28 && liveRunners + liveTanksOrBoss > 1) score += 40;
            if (type === 'flak' && liveFlyers > 0) score += 30;
            if (heldMid && (type === 'sniper' || type === 'cannon' || type === 'flak')) score += 25; // when solid, prefer expensive
            if (type === 'arrow' && earlyGame && arrowCount < 2) score += 12;
          }

          actions.push({ type, slot, score });
        }
      }

      if (actions.length > 0) {
        // Competence floor: when things look bad, boost safe solid actions
        const looksBad = (TD.run.baseHp < 12) || (liveRunners + liveTanksOrBoss > 4);
        if (looksBad) {
          for (const a of actions) {
            if ((a.type === 'arrow' || a.type === 'cannon') && a.score > 10) a.score += 25;
          }
        }

        // Softmax sample (higher temperature for more randomness and varied placements)
        let maxScore = -Infinity;
        for (const a of actions) if (a.score > maxScore) maxScore = a.score;

        let sum = 0;
        const expScores = actions.map(a => {
          const e = Math.exp((a.score - maxScore) / 2.0);  // even higher temp for more randomness in choices and distances
          sum += e;
          return e;
        });

        let roll = Math.random() * sum;
        let chosen = actions[0];
        for (let i = 0; i < actions.length; i++) {
          roll -= expScores[i];
          if (roll <= 0) { chosen = actions[i]; break; }
        }

        // Deliberately pick among good varied options for early starts
        const deliberateChance = earlyGame ? 0.55 : 0.42;
        if (Math.random() < deliberateChance) {
          actions.sort((a, b) => b.score - a.score);
          const top = actions.slice(0, Math.min(6, actions.length));
          const interesting = top.filter(a => 
            (a.type === 'sniper' && a.score > 40) ||  // favor central sniper
            (earlyGame && (a.type === 'arrow' || a.type === 'frost' || a.type === 'sniper')) ||
            (a.type === 'arrow' && arrowCount < 3)
          );
          if (interesting.length > 0 && Math.random() < 0.8) {
            chosen = interesting[Math.floor(Math.random() * interesting.length)];
          } else if (top.length > 1) {
            chosen = top[Math.floor(Math.random() * top.length)];
          }
        }

        // Final guard: never pick the spawn-exit slot 0 early (especially bad for leaks)
        if (earlyGame && chosen.slot === earliestEmpty) {
          const sorted = [...actions].sort((a,b) => b.score - a.score);
          for (const a of sorted.slice(0,5)) {
            if (a.slot !== earliestEmpty) {
              chosen = a;
              break;
            }
          }
        }

        // Explicit save: when held mid with 4+ AR and not enough for good tower, often skip to save
        const arrowCountNow = counts['arrow'] || 0;
        if (chosen.type === 'arrow' && heldMid && arrowCountNow >= 4 && gold < 160 && gold > 50) {
          if (Math.random() < 0.75) {  // higher chance to accumulate for expensive
            if (TD.run.wavePhase === 'pause') TD.skipWavePause();
            return;
          }
        }

        TD.buildTower(chosen.slot, chosen.type);
        if (TD.run.wavePhase === 'pause') TD.skipWavePause();
        return;
      }
    }
  }

  // Upgrade: prefer towers that are currently providing good value
  const upgradable = TD.run.towers.filter(t => t.level < 3);
  if (upgradable.length > 0) {
    let best = upgradable[0];
    let bestScore = -1;
    const startX = TD.PATH_WAYPOINTS[0][0], startY = TD.PATH_WAYPOINTS[0][1];

    for (const t of upgradable) {
      const rng = TD.getTowerRange(t);
      const px = t.slot.x, py = t.slot.y;
      const r2 = rng * rng;
      let cov = 0;
      for (let i = 0; i < TD.PATH_WAYPOINTS.length - 1; i++) {
        const a = TD.PATH_WAYPOINTS[i], b = TD.PATH_WAYPOINTS[i+1];
        const da = (a[0]-px)**2+(a[1]-py)**2 <= r2;
        const db = (b[0]-px)**2+(b[1]-py)**2 <= r2;
        if (da || db) cov += Math.hypot(b[0]-a[0], b[1]-a[1]);
      }
      let sc = cov * 3.2;

      // deprioritize very early "entrance" towers
      const distToStart = Math.hypot(px - startX, py - startY);
      if (distToStart < 38) sc -= 22;

      // prefer towers that benefit from or provide synergy
      if (t.type === 'frost' || t.type === 'sniper') sc += 14;
      if (t.type === 'arrow' && TD.run.towers.filter(x => x.type === 'frost').length > 0) sc += 6;

      sc += Math.random() * 5;

      if (sc > bestScore) {
        bestScore = sc;
        best = t;
      }
    }
    const def = TD.TOWER_TYPES[best.type];
    const cost = def.upgrades[best.level - 1];
    if (gold >= cost) {
      TD.upgradeTower(best);
      if (TD.run.wavePhase === 'pause') TD.skipWavePause();
    }
  }

  // Demo "bot is ready": at decision time while paused, skip the long wait (press GO).
  // This makes waves chain quickly instead of idling ~15s. The decisionTimer gives
  // a short natural delay to show the placement.
  if (TD.run.wavePhase === 'pause') TD.skipWavePause();
};

TD.restartDemoRound = function restartDemoRound() {
  const nextMap = TD.getNextDemoMap();
  // directly start next round (skip full menu)
  TD.startGame(nextMap, 'campaign');
};

TD.exitDemo = function exitDemo() {
  TD.isDemo = false;
  if (r().demo) r().demo = false;
  r().demoRestartTimer = 0;
  r().demoDecisionTimer = 0;
  if (r().state !== TD.STATE.MENU) {
    TD.resetGame();
  }
};

TD.toggleDemo = function toggleDemo() {
  TD.isDemo = !TD.isDemo;
  if (TD.isDemo) {
    const map = TD.demoMap || TD.getNextDemoMap() || 'meadow';
    TD.startGame(map, 'campaign');
  } else {
    TD.exitDemo();
  }
};

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

// When starting from menu, carry over the preview menuSeed as runSeed for consistent variety
if (typeof r === 'function' && r().menuSeed && !r().runSeed) {
  // will be set in ui after start, but ensure
}

// Helper to generate short seed for variants
TD.generateSeed = function generateSeed() {
  return Math.floor(Math.random() * 0xfffff).toString(16);
};

/** Date-derived seed for daily challenge (no server). Same everywhere for the same local day. */
TD.getDailySeed = function getDailySeed(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  let h = ((y * 372 + m * 31 + day) * 1664525 + 1013904223) >>> 0;
  return h.toString(16).slice(0, 5);
};

/** Rotate daily map by day-of-year so the challenge changes map too. */
TD.getDailyMapId = function getDailyMapId(date) {
  const d = date || new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d - start) / 86400000);
  const ids = TD.MAP_IDS || ['meadow'];
  return ids[dayOfYear % ids.length];
};

/** Build shareable deep-link query (map/mode/diff/seed). */
TD.buildDeepLink = function buildDeepLink(opts = {}) {
  const p = new URLSearchParams();
  if (opts.mapId) p.set('map', opts.mapId);
  if (opts.mode) p.set('mode', opts.mode);
  if (opts.diff || opts.difficulty) p.set('diff', opts.diff || opts.difficulty);
  if (opts.seed) p.set('seed', String(opts.seed));
  if (opts.autostart) p.set('autostart', '1');
  let base = '';
  if (typeof location !== 'undefined') {
    base = (location.origin || '') + (location.pathname || 'index.html');
  } else {
    base = 'index.html';
  }
  const q = p.toString();
  return q ? base + '?' + q : base;
};

/** Apply ?map=&mode=&diff=&seed= into menu state (after maps exist). */
TD.applyUrlDeepLink = function applyUrlDeepLink() {
  if (TD.urlMap && TD.MAP_IDS && TD.MAP_IDS.includes(TD.urlMap)) {
    r().menuMap = TD.urlMap;
  }
  if (TD.urlMode === 'campaign' || TD.urlMode === 'endless') {
    r().menuMode = TD.urlMode;
  }
  if (TD.urlDiff && TD.DIFFICULTY && TD.DIFFICULTY[TD.urlDiff]) {
    r().menuDifficulty = TD.urlDiff;
  }
  if (TD.urlSeed) {
    r().menuSeed = String(TD.urlSeed);
  }
};

/** Lightweight analytics (no-op if gtag missing). */
TD.track = function track(event, params) {
  try {
    if (typeof gtag === 'function') gtag('event', event, params || {});
  } catch (_) { /* ignore */ }
};

/** Brag text for clipboard / social. */
TD.formatRunShareText = function formatRunShareText(result) {
  if (!result) return '';
  const mapName = TD.MAPS[result.mapId]?.name || result.mapId;
  const mode = result.mode === 'endless' ? 'Endless' : 'Campaign';
  const lines = [
    result.won ? '★ Tower Defense — VICTORY' : 'Tower Defense — Defeat',
    mapName + ' · ' + mode + (result.diff ? ' · ' + result.diff : '')
  ];
  if (result.mode === 'campaign' && result.won) {
    lines.push('Stars: ' + '★'.repeat(result.stars || 0) + '☆'.repeat(Math.max(0, 3 - (result.stars || 0))));
  }
  if (result.mode === 'endless') lines.push('Wave: E' + result.wave);
  else lines.push('Wave: ' + result.wave + '/' + (TD.getCampaignWaveCount ? TD.getCampaignWaveCount() : 15));
  lines.push('Time: ' + (TD.formatTime ? TD.formatTime(result.time) : Math.round(result.time) + 's'));
  lines.push('Kills: ' + (result.kills || 0) + (result.maxCombo ? ' · combo x' + result.maxCombo : ''));
  if (result.seed) lines.push('Seed: ' + result.seed);
  const link = TD.buildDeepLink({
    mapId: result.mapId,
    mode: result.mode,
    diff: result.diff || r().menuDifficulty,
    seed: result.seed
  });
  lines.push('Play: ' + link);
  return lines.join('\n');
};

/** Draw a small share card and trigger PNG download. */
TD.saveRunSharePng = function saveRunSharePng(result) {
  if (!result || typeof document === 'undefined') return false;
  const W = 480, H = 270;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#c8b560';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.fillStyle = result.won ? '#c8b560' : '#ff4444';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(result.won ? 'VICTORY' : 'DEFEAT', W / 2, 52);
  const mapName = TD.MAPS[result.mapId]?.name || result.mapId;
  ctx.fillStyle = '#e8dcc0';
  ctx.font = '16px monospace';
  ctx.fillText(mapName + ' · ' + (result.mode === 'endless' ? 'Endless' : 'Campaign'), W / 2, 88);
  if (result.mode === 'campaign' && result.won) {
    ctx.fillStyle = '#c8b560';
    ctx.font = '22px monospace';
    ctx.fillText('★'.repeat(result.stars || 0) + '☆'.repeat(Math.max(0, 3 - (result.stars || 0))), W / 2, 120);
  }
  ctx.fillStyle = '#aaa';
  ctx.font = '14px monospace';
  const stats = [
    result.mode === 'endless' ? 'Wave E' + result.wave : 'Wave ' + result.wave,
    'Time ' + (TD.formatTime ? TD.formatTime(result.time) : Math.round(result.time) + 's'),
    'Kills ' + (result.kills || 0),
    result.seed ? 'Seed ' + result.seed : ''
  ].filter(Boolean);
  stats.forEach((ln, i) => ctx.fillText(ln, W / 2, 150 + i * 22));
  ctx.fillStyle = '#666';
  ctx.font = '11px monospace';
  ctx.fillText('Pixel TD · open index.html', W / 2, H - 24);
  try {
    const a = document.createElement('a');
    const stars = result.stars != null ? result.stars : 'x';
    a.download = 'TD_' + (result.mapId || 'map') + '_' + stars + 's_w' + result.wave + '.png';
    a.href = c.toDataURL('image/png');
    a.click();
    return true;
  } catch (_) {
    return false;
  }
};

TD.copyRunShareText = function copyRunShareText(result) {
  const text = TD.formatRunShareText(result);
  if (!text) return Promise.resolve(false);
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => {
      return TD._copyFallback(text);
    });
  }
  return Promise.resolve(TD._copyFallback(text));
};

TD._copyFallback = function _copyFallback(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (_) {
    return false;
  }
};

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
