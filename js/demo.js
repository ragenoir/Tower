(() => {
'use strict';
const TD = window.TD;
const r = () => TD.run;

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
          const isGoodChoke = cov > 30 && distToStart > 25 && distToStart < 120;

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

})();
