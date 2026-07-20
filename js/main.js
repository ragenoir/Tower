(() => {
'use strict';
const TD = window.TD;
const r = () => TD.run;

TD._audioUserActivated = false;

// Register audio unlock listeners as early as possible (capture phase so they run before game input handlers).
// First real gesture resumes AudioContext so that scheduled music/SFX in a running demo can play.
['pointerdown', 'keydown', 'touchstart'].forEach(type => {
  document.addEventListener(type, () => {
    // Only unlock audio (resume ctx). Do NOT set the activation flag here,
    // because the main handler needs to see "this was the first gesture" to consume it for demo.
    TD.ensureAudio().then(() => {
      if (TD.audioCtx && TD.audioCtx.state === 'running' && !TD.muted) {
        const st = r().state;
        if ((st === TD.STATE.PLAYING || st === TD.STATE.PAUSED) && !TD.musicActive) {
          TD.bus.emit('music:start');
        }
      }
    });
  }, { capture: true, once: true, passive: true });
});

TD.canvas = document.getElementById('game');
TD.ctx = TD.canvas.getContext('2d');
TD.scale = 1;

TD.toggleFullscreen = function toggleFullscreen() {
  const d = document;
  const el = d.documentElement;

  const isFS = d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement;

  if (!isFS) {
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) {
      req.call(el).catch(() => {}); // ignore errors (user gesture requirement etc.)
    }
  } else {
    const exit = d.exitFullscreen || d.webkitExitFullscreen || d.mozCancelFullScreen || d.msExitFullscreen;
    if (exit) exit.call(d);
  }
};

// Re-calc scale when entering/exiting fullscreen (browser bars usually disappear)
['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(ev => {
  document.addEventListener(ev, () => setTimeout(TD.resize, 50));
});

TD.resize = function resize() {
  // Prefer visualViewport — it accounts for mobile browser chrome (address bars etc.)
  // that innerWidth/innerHeight often ignore or report incorrectly.
  let availW = window.innerWidth;
  let availH = window.innerHeight;
  if (window.visualViewport) {
    availW = window.visualViewport.width;
    availH = window.visualViewport.height;
  }
  TD.scale = Math.min(availW / TD.W, availH / TD.H);
  TD.canvas.width = Math.round(TD.W * TD.scale);
  TD.canvas.height = Math.round(TD.H * TD.scale);
  TD.canvas.style.width = TD.canvas.width + 'px';
  TD.canvas.style.height = TD.canvas.height + 'px';
};
window.addEventListener('resize', TD.resize);
window.addEventListener('orientationchange', () => setTimeout(TD.resize, 100));

// Also react to visual viewport changes (address bar show/hide on scroll etc.)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', TD.resize);
  window.visualViewport.addEventListener('scroll', TD.resize);
}
TD.resize();
TDG.init(TD.ctx, TD.C, TD.TOWER_TYPES, TD.TILE, TD.MAP_W, TD.MAP_H);

TD.toGame = function toGame(mx, my) {
  const rect = TD.canvas.getBoundingClientRect();
  return [(mx - rect.left) * (TD.W / rect.width), (my - rect.top) * (TD.H / rect.height)];
};

TD.bindInput();

// Apply deep-link challenge params into menu (maps must already be loaded).
if (typeof TD.applyUrlDeepLink === 'function') TD.applyUrlDeepLink();

// Register lightweight PWA service worker when served over http(s).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator &&
    typeof location !== 'undefined' && (location.protocol === 'http:' || location.protocol === 'https:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* file:// or offline ok */ });
  });
}

// Auto-start demo/attract mode if requested via ?demo (or F4 later).
// Call synchronously so any transient activation from navigation click can unlock AudioContext.
if (TD.isDemo) {
  TD.initAudio();
  const map = TD.demoMap || TD.getNextDemoMap() || 'meadow';
  TD.startGame(map, 'campaign');
} else if (TD.urlAutostart && !TD.isDemo) {
  // Challenge links can autostart after applying map/mode/seed into menu state.
  const run = TD.run;
  const map = run.menuMap || 'meadow';
  const mode = run.menuMode || 'campaign';
  TD.startGame(map, mode, run.menuSeed);
}

// ─── Main loop ───────────────────────────────────────────────
TD.lastTime = 0;

TD.update = function update(dt) {
  r().slotPulse += dt;
  if (r().spawnFlash > 0) r().spawnFlash -= dt;
  if (r().comboDisplay) r().comboDisplay.life -= dt;
  if (r().achievementToast) r().achievementToast.life -= dt;

  // decay temporary tower target mode hints (visible even briefly on pause/results)
  for (const t of (r().towers || [])) {
    if (t && t._modeHintLife > 0) t._modeHintLife -= dt * 2.2;
  }

  if (r().shareFlash && r().shareFlash.life > 0) {
    r().shareFlash.life -= dt;
    if (r().shareFlash.life <= 0) r().shareFlash = null;
  }

  if (r().state !== TD.STATE.PLAYING) {
    // still allow demo restart timer to tick on results screen
    if (TD.isDemo && r().demoRestartTimer > 0) TD.updateDemo(dt);
    return;
  }

  if (TD.isDemo) TD.updateDemo(dt);

  if (r().hitStop > 0) {
    r().hitStop -= dt;
    for (const e of r().enemies) if (e.dying) e.deathTimer -= dt;
    for (const p of r().particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; }
    r().particles = r().particles.filter(p => p.life > 0);
    for (const d of r().dmgNumbers) { d.y -= 20 * dt; d.life -= dt; }
    r().dmgNumbers = r().dmgNumbers.filter(d => d.life > 0);
    r().enemies = r().enemies.filter(e => e.alive || (e.dying && e.deathTimer > 0));
    return;
  }

  if (r().runStats.comboTimer > 0) {
    r().runStats.comboTimer -= dt * r().speedMul;
    if (r().runStats.comboTimer <= 0) r().runStats.combo = 0;
  }

  if (r().shakeTimer > 0) {
    r().shakeTimer -= dt;
    r().shakeX = (Math.random() - 0.5) * 6;
    r().shakeY = (Math.random() - 0.5) * 6;
  } else { r().shakeX = 0; r().shakeY = 0; }
  if (r().baseFlash > 0) r().baseFlash -= dt;
  if (r().goldFlash > 0) r().goldFlash -= dt;
  if (r().waveBanner) r().waveBanner.life -= dt;
  TD.updateMusicTension(dt);

  for (const e of r().enemies) {
    if (e.alive) TD.moveEnemy(e, dt);
    else if (e.dying) e.deathTimer -= dt * r().speedMul;
  }
  r().enemies = r().enemies.filter(e => e.alive || (e.dying && e.deathTimer > 0));
  TD.updateTowers(dt);
  TD.updateProjectiles(dt);
  TD.updateBosses(dt);
  TD.updateWaves(dt);
  TD.updateTowerSiege(dt); // no-op unless TOWER_DAMAGE_ENABLED + mult > 0

  for (const p of r().particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt;
  }
  r().particles = r().particles.filter(p => p.life > 0);
  for (const d of r().dmgNumbers) { d.y -= 20 * dt; d.life -= dt; }
  r().dmgNumbers = r().dmgNumbers.filter(d => d.life > 0);
}

TD.render = function render() {
  TD.ctx.save();
  TD.ctx.setTransform(TD.scale, 0, 0, TD.scale, 0, 0);
  TD.ctx.imageSmoothingEnabled = false;
  TD.ctx.clearRect(0, 0, TD.W, TD.H);
  TD.ctx.translate(r().shakeX, r().shakeY);

  if (r().state !== TD.STATE.MENU) {
    TDG.drawMap({
      rows: TD.MAP_ROWS, deco: TD.GRASS_DECO,
      pathStart: TD.PATH_WAYPOINTS[0],
      pathEnd: TD.PATH_WAYPOINTS[TD.PATH_WAYPOINTS.length - 1],
      buildSlots: TD.BUILD_SLOTS, hoverSlot: r().hoverSlot, slotPulse: r().slotPulse
    });
    if (r().selectedTowerType && r().hoverSlot) {
      const def = TD.TOWER_TYPES[r().selectedTowerType];
      TDG.drawGhost(r().selectedTowerType, r().hoverSlot, def.range[0] * TD.TILE);
    }
    for (const t of r().towers) TDG.drawTowerSprite(t, r().slotPulse);
    for (const e of r().enemies) TDG.drawEnemySprite(e, TD.enemyPos, r().slotPulse);
    TDG.drawProjectiles(r().projectiles, r().slotPulse);
    TDG.drawParticles(r().particles);
    for (const d of r().dmgNumbers) {
      TD.ctx.globalAlpha = d.life / 0.6;
      TDG.textOutlined(d.text, d.x, d.y, TD.C.baseDmg);
    }
    TD.ctx.globalAlpha = 1;
    if (r().selectedTower) TDG.drawRangeRing(r().selectedTower, TD.getTowerRange(r().selectedTower));
    TDG.drawSpawnFlash(TD.PATH_WAYPOINTS[0], r().spawnFlash);
    TDG.drawWaveBanner(r().waveBanner, TD.MAP_PX_H);
    TDG.drawComboBanner(r().comboDisplay);
    if (r().achievementToast && r().achievementToast.life > 0) TDG.drawComboBanner(r().achievementToast);
    TD.drawTargetFeedback();
    TD.drawTutorial();
    TD.drawTouchOverlay();
    TD.drawDebugOverlay();
  }

  TD.ctx.translate(-r().shakeX, -r().shakeY);
  if (r().state !== TD.STATE.MENU) TD.drawHud();

  if (r().state === TD.STATE.MENU) {
    TD.drawMenu();
  } else if (r().state === TD.STATE.PAUSED) {
    TD.drawPause();
  } else if (r().state === TD.STATE.WON || r().state === TD.STATE.LOST) {
    TD.drawResultsScreen();
  }
  if (r().state !== TD.STATE.MENU && TD.isDemo) TD.drawDemoOverlay();

  // Mobile phone portrait hint (helps on smartphones where scale~1 makes UI tiny)
  if (typeof TD.drawMobileHints === 'function') TD.drawMobileHints();

  // draw mode hints on top (so visible even under pause overlay)
  if (r().state !== TD.STATE.MENU) {
    TD.ctx.save();
    TD.ctx.setTransform(TD.scale, 0, 0, TD.scale, 0, 0);
    TD.ctx.translate(r().shakeX, r().shakeY);
    TD.drawTowerModeHints();
    TD.ctx.restore();
  }

  TD.ctx.restore();
}

TD.loop = function loop(ts) {
  const dt = Math.min((ts - TD.lastTime) / 1000, 0.05);
  TD.lastTime = ts;
  TD.update(dt);
  TD.render();
  requestAnimationFrame(TD.loop);
}

requestAnimationFrame(TD.loop);
})();