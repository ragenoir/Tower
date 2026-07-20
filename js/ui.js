(() => {
'use strict';
const TD = window.TD;
const r = () => TD.run;
const px = (...a) => TDG.px(...a);

// ─── Input ───────────────────────────────────────────────────
TD.mouseX = 0;
TD.mouseY = 0;

TD.touchPad = function touchPad() { return TD.isTouch ? TD.TOUCH_PAD : 0; };

TD.pointInRect = function pointInRect(px, py, rect, pad) {
  const p = pad ?? TD.touchPad();
  return px >= rect.x - p && px < rect.x + rect.w + p && py >= rect.y - p && py < rect.y + rect.h + p;
};

TD.towerBtnX = function towerBtnX(i) { return TD.HUD.towerX + i * (TD.HUD.towerW + TD.HUD.towerGap); }

TD.getUiRects = function getUiRects() {
  const rects = [];
  TD.TOWER_ORDER.forEach((t, i) => {
    rects.push({ x: TD.towerBtnX(i), y: TD.HUD.row1, w: TD.HUD.towerW, h: TD.HUD.towerH, action: 'select', towerType: t });
  });
  const cx = TD.HUD.ctrlX, cy = TD.HUD.row2;
  const isT = TD.isTouch;
  // On touch use significantly larger hit rects (fat-finger friendly).
  // Positions aligned with (slightly shifted on touch) draw code.
  const b1 = cx;
  const b2 = cx + (isT ? 17 : 16);
  const b3 = cx + (isT ? 34 : 32);
  const b4 = cx + (isT ? 51 : 48);
  const bm = cx + (isT ? 82 : 80);
  const padW = isT ? 8 : 0;
  const padH = isT ? 6 : 0;
  rects.push({ x: b1, y: cy - (isT?2:0), w: (isT?16:14) + padW, h: TD.HUD.btnH + padH, action: 'pause' });
  rects.push({ x: b2, y: cy - (isT?2:0), w: (isT?16:14) + padW, h: TD.HUD.btnH + padH, action: 'speed1' });
  rects.push({ x: b3, y: cy - (isT?2:0), w: (isT?16:14) + padW, h: TD.HUD.btnH + padH, action: 'speed2' });
  // Volume hit: generous so you can drag to 0 volume easily. Before speed3 in list order.
  rects.push({ x: cx + (isT ? 58 : 60), y: cy - 3, w: 22, h: 20, action: 'volume' });
  rects.push({ x: b4, y: cy - (isT?2:0), w: (isT?16:14) + padW, h: TD.HUD.btnH + padH, action: 'speed3' });
  rects.push({ x: bm, y: cy - (isT?2:0), w: (isT?10:8) + (isT?6:0), h: TD.HUD.btnH + padH, action: 'mute' });
  if (r().wavePhase === 'pause' && r().state === TD.STATE.PLAYING) {
    rects.push({ x: cx + 52, y: TD.HUD.row1 - (isT?1:0), w: 30, h: 16, action: 'startWave' });
  }
  if (r().selectedTower) {
    const py = TD.HUD.row2 + 2;
    const t = r().selectedTower;
    const canRepair = typeof t.integrity === 'number' && t.maxIntegrity && t.integrity < t.maxIntegrity;
    if (canRepair) {
      rects.push({ x: TD.HUD.statsX, y: py, w: 34, h: 16, action: 'upgrade' });
      rects.push({ x: TD.HUD.statsX + 36, y: py, w: 38, h: 16, action: 'repair' });
      rects.push({ x: TD.HUD.statsX + 76, y: py, w: 34, h: 16, action: 'sell' });
    } else {
      rects.push({ x: TD.HUD.statsX, y: py, w: 54, h: 16, action: 'upgrade' });
      rects.push({ x: TD.HUD.statsX + 58, y: py, w: 54, h: 16, action: 'sell' });
    }
  }
  if (TD.isTouch && (r().selectedTowerType || r().selectedTower)) {
    rects.push({ x: TD.W - 32, y: 4, w: 28, h: 28, action: 'cancel' });
  }
  // Fullscreen button — very useful on phones to hide browser chrome (address bar etc.)
  // and make the game use more pixels / bigger scale.
  if (TD.isTouch) {
    rects.push({ x: TD.W - 28, y: 26, w: 24, h: 18, action: 'fullscreen' });
  }
  return rects;
}

TD.menuMapX = function menuMapX(i) {
  const u = TD.MENU_UI;
  const total = TD.MAP_IDS.length * u.mapW + (TD.MAP_IDS.length - 1) * u.mapGap;
  const base = (TD.W - total) / 2;
  return base + i * (u.mapW + u.mapGap);
};

TD.getMenuRects = function getMenuRects() {
  const u = TD.MENU_UI;
  const rects = [];
  TD.MAP_IDS.forEach((id, i) => {
    rects.push({ x: TD.menuMapX(i), y: u.mapY, w: u.mapW, h: u.mapH, action: 'map', mapId: id });
  });
  const cy = u.ctrlY;
  const diffY = cy + u.modeH + 5;
  const startY = diffY + u.diffH + 5;
  const isT = TD.isTouch;
  const mh = u.modeH + (isT ? 4 : 0);
  const dh = u.diffH + (isT ? 4 : 0);
  const sh = u.startH + (isT ? 6 : 0);
  rects.push(
    { x: TD.W / 2 - u.modeW - 2, y: cy - (isT?2:0), w: u.modeW, h: mh, action: 'mode', mode: 'campaign' },
    { x: TD.W / 2 + 2, y: cy - (isT?2:0), w: u.modeW, h: mh, action: 'mode', mode: 'endless' },
    { x: TD.W / 2 - 36, y: diffY - (isT?2:0), w: 72, h: dh, action: 'difficulty' },
    { x: TD.W / 2 - 46, y: startY - (isT?3:0), w: 92, h: sh, action: 'start' }
  );
  // Variant seed reroll for noticeable different runs on same map (light random on waves/enemies)
  const seedY = startY + sh + 4;
  rects.push({ x: TD.W / 2 - 55, y: seedY, w: 110, h: 12, action: 'rerollSeed' });
  if (TD.isTouch) {
    rects.push({ x: TD.W - 28, y: 26, w: 24, h: 18, action: 'fullscreen' });
  }
  return rects;
}

TD.getTowerTooltipLines = function getTowerTooltipLines(type, level = 1) {
  const d = TD.TOWER_TYPES[type];
  const dmg = d.dmg[level - 1];
  const lines = [
    d.name + ' L' + level,
    'DMG ' + dmg + ' · DPS ~' + Math.round(dmg * d.rate),
    'RNG ' + d.range[level - 1] + ' · ' + d.rate + '/s'
  ];
  if (d.slow) lines.push(TD.t('tip.slow', { pct: Math.round(d.slow * 100), dur: d.slowDur }));
  if (d.aoe) lines.push(TD.t('tip.aoe', { tiles: d.aoe }));
  const g = d.hitsGround !== false, a = d.hitsAir !== false;
  if (g && a) lines.push(TD.t('tip.targetsAll'));
  else if (g) lines.push(TD.t('tip.targetsGround'));
  else if (a) lines.push(TD.t('tip.targetsAir'));
  return lines;
}

TD.drawTouchOverlay = function drawTouchOverlay() {
  if (!TD.isTouch) return;
  if (r().state !== TD.STATE.PLAYING && r().state !== TD.STATE.PAUSED) return;
  if (!r().selectedTowerType && !r().selectedTower) return;
  const x = TD.W - 32, y = 4, w = 28, h = 28;
  const hov = r().hoverUi && r().hoverUi.action === 'cancel';
  px(x, y, w, h, hov ? 'rgba(200,80,80,0.85)' : 'rgba(26,26,46,0.75)');
  TD.ctx.strokeStyle = TD.C.uiBorder;
  TD.ctx.strokeRect(x, y, w, h);
  TD.ctx.fillStyle = TD.C.text;
  TD.ctx.font = 'bold 14px monospace';
  TD.ctx.textAlign = 'center';
  TD.ctx.fillText('×', x + w / 2, y + 19);
};

TD.drawTowerTooltip = function drawTowerTooltip() {
  if (!r().hoverUi || r().hoverUi.action !== 'select') return;
  const lines = TD.getTowerTooltipLines(r().hoverUi.towerType);
  const bx = r().hoverUi.x, by = TD.HUD.row1 - 4;
  const bw = 118, bh = 8 + lines.length * 9;
  px(bx, by - bh, bw, bh, 'rgba(26,26,46,0.95)');
  TD.ctx.strokeStyle = TD.C.uiBorder;
  TD.ctx.strokeRect(bx, by - bh, bw, bh);
  TD.ctx.fillStyle = TD.C.text;
  TD.ctx.font = '6px monospace';
  TD.ctx.textAlign = 'left';
  lines.forEach((ln, i) => TD.ctx.fillText(ln, bx + 4, by - bh + 10 + i * 9));
}

TD.updateHover = function updateHover() {
  r().hoverSlot = null; r().hoverUi = null; r().hoverMenu = null;
  if (r().state === TD.STATE.MENU) {
    for (const rect of TD.getMenuRects()) {
      // Menu has vertically stacked controls (difficulty directly above START).
      // Use zero/small pad on touch. We already enlarged the rect h in getMenuRects.
      // Large global TOUCH_PAD=18 would cause difficulty hitrect to steal the START area.
      const smallPadActions = ['difficulty', 'start'];
      const pad = (TD.isTouch && smallPadActions.includes(rect.action)) ? 0 : (TD.isTouch ? 3 : 0);
      if (TD.pointInRect(TD.mouseX, TD.mouseY, rect, pad)) { r().hoverMenu = rect; return; }
    }
    return;
  }
  const isResultsOrMenu = r().state === TD.STATE.WON || r().state === TD.STATE.LOST;
  if (r().state !== TD.STATE.PLAYING && r().state !== TD.STATE.PAUSED && !isResultsOrMenu) return;

  for (const rect of TD.getUiRects()) {
    // Rely on the inflated rect sizes for touch (see getUiRects). Only tiny extra pad.
    const extra = (TD.isTouch && ['pause','speed1','speed2','speed3','volume','mute','startWave', 'fullscreen'].includes(rect.action)) ? 3 : 0;
    if (TD.pointInRect(TD.mouseX, TD.mouseY, rect, extra)) { r().hoverUi = rect; return; }
  }
  if (TD.mouseY < TD.MAP_PX_H) {
    const slotR = TD.TILE * (TD.isTouch ? 0.7 : 0.55);
    for (const slot of TD.BUILD_SLOTS) {
      if (Math.hypot(TD.mouseX - slot.x, TD.mouseY - slot.y) < slotR) r().hoverSlot = slot;
    }
  }
}

TD.handleClick = function handleClick() {
  if (TD.isDemo) {
    const alreadyActivated = TD._audioUserActivated;
    TD._audioUserActivated = true;
    TD.initAudio();
    if (TD.audioCtx && TD.audioCtx.state === 'running' && !TD.muted) {
      if (!alreadyActivated || !TD.musicActive) {
        TD.bus.emit('music:start');
      }
    }
    if (!alreadyActivated) {
      // First interaction: used to unlock audio. Keep demo running so sounds play.
      return;
    }
    TD.exitDemo();
    return;
  }
  if (r().state === TD.STATE.MENU) {
    if (r().hoverMenu) {
      if (r().hoverMenu.action === 'map') r().menuMap = r().hoverMenu.mapId;
      if (r().hoverMenu.action === 'mode') r().menuMode = r().hoverMenu.mode;
      if (r().hoverMenu.action === 'difficulty') TD.cycleMenuDifficulty();
      if (r().hoverMenu.action === 'start') {
        TD.startGame(r().menuMap, r().menuMode, r().menuSeed);
      }
      if (r().hoverMenu.action === 'rerollSeed') {
        r().menuSeed = TD.generateSeed ? TD.generateSeed() : Math.floor(Math.random()*0xfffff).toString(16);
      }
    } else {
      TD.startGame(r().menuMap, r().menuMode);
    }
    return;
  }
  if (r().state === TD.STATE.WON || r().state === TD.STATE.LOST) {
    // allow fullscreen even on results screen
    if (r().hoverUi && r().hoverUi.action === 'fullscreen') {
      TD.toggleFullscreen && TD.toggleFullscreen();
      return;
    }
    TD.resetGame(); return;
  }
  if (r().hoverUi) {
    const a = r().hoverUi.action;
    if (a === 'select') { r().selectedTowerType = r().hoverUi.towerType; r().selectedTower = null; if (r().tutorial.step === 0) r().tutorial.step = 1; }
    if (a === 'pause') TD.togglePause();
    if (a === 'speed1') r().speedMul = 1;
    if (a === 'speed2') r().speedMul = 2;
    if (a === 'speed3') r().speedMul = 3;
    if (a === 'volume') {
      TD.initAudio();
      const cx = TD.HUD.ctrlX;
      const isT = TD.isTouch;
      const vX = cx + (isT ? 60 : 62);
      const vW = isT ? 18 : 16;
      TD.setVolume((TD.mouseX - vX) / vW);
    }
    if (a === 'mute') {
      TD.muted = !TD.muted; TD.initAudio();
      if (TD.muted) TD.bus.emit('music:stop');
      else if (r().state === TD.STATE.PLAYING || r().state === TD.STATE.PAUSED) TD.bus.emit('music:start');
    }
    if (a === 'startWave') TD.skipWavePause();
    if (a === 'upgrade' && r().selectedTower) TD.upgradeTower(r().selectedTower);
    if (a === 'sell' && r().selectedTower) TD.sellTower(r().selectedTower);
    if (a === 'repair' && r().selectedTower) TD.repairTower(r().selectedTower);
    if (a === 'cancel') { r().selectedTowerType = null; r().selectedTower = null; }
    if (a === 'fullscreen') { TD.toggleFullscreen && TD.toggleFullscreen(); }
    return;
  }
  if (r().hoverSlot) {
    if (r().hoverSlot.tower) { r().selectedTower = r().hoverSlot.tower; r().selectedTowerType = null; return; }
    if (r().selectedTowerType) TD.buildTower(r().hoverSlot, r().selectedTowerType);
    return;
  }
  if (TD.mouseY < TD.MAP_PX_H) {
    r().selectedTower = null;
    r().selectedTowerType = null;
  }
}

// ─── TD.HUD ─────────────────────────────────────────────────────
TD.drawHud = function drawHud() {
  px(0, TD.HUD_Y, TD.W, TD.HUD_H, TD.C.ui);
  px(0, TD.HUD_Y, TD.W, 1, TD.C.uiBorder);
  px(TD.HUD.statsX - 2, TD.HUD_Y + 2, 1, TD.HUD_H - 4, TD.C.uiLight);
  px(TD.HUD.ctrlX - 2, TD.HUD_Y + 2, 1, TD.HUD_H - 4, TD.C.uiLight);

  TD.TOWER_ORDER.forEach((t, i) => {
    const def = TD.TOWER_TYPES[t];
    const x = TD.towerBtnX(i), y = TD.HUD.row1;
    const sel = r().selectedTowerType === t;
    const hov = r().hoverUi && r().hoverUi.action === 'select' && r().hoverUi.towerType === t;
    px(x, y, TD.HUD.towerW, TD.HUD.towerH, sel ? TD.C.accent : hov ? TD.C.uiLight : TD.C.shadow);
    TDG.drawTowerIcon(t, x + 3, y + 3, 12);
    TD.ctx.fillStyle = TD.C.text;
    TD.ctx.font = '7px monospace';
    TD.ctx.textAlign = 'left';
    TD.ctx.fillText(def.short, x + 18, y + 10);
    TD.ctx.fillStyle = r().gold >= def.cost ? TD.C.gold : TD.C.baseDmg;
    TD.ctx.fillText(def.cost + 'g', x + 18, y + 20);
  });

  if (r().selectedTower) {
    TD.drawTowerPanel();
  } else {
    TD.drawStatsPanel();
  }

  const cx = TD.HUD.ctrlX, cy = TD.HUD.row2;
  const isT = TD.isTouch;
  // Slightly larger visuals on touch for finger comfort (without breaking desktop layout much).
  const bw = isT ? 16 : 14;
  const bh = TD.HUD.btnH + (isT ? 2 : 0);
  const btns = [
    { x: cx, w: bw, label: r().state === TD.STATE.PAUSED ? '>' : '||', action: 'pause' },
    { x: cx + 17, w: bw, label: 'x1', action: 'speed1' },
    { x: cx + 34, w: bw, label: 'x2', action: 'speed2' },
    { x: cx + 51, w: bw, label: 'x3', action: 'speed3' },
    { x: cx + 82, w: isT ? 10 : 8, label: TD.muted ? 'M' : 'S', action: 'mute' }
  ];
  btns.forEach(b => {
    const hov = r().hoverUi && r().hoverUi.action === b.action;
    px(b.x, cy, b.w, bh, hov ? TD.C.accent : TD.C.shadow);
    const speedActions = { speed1: 1, speed2: 2, speed3: 3 };
    TD.ctx.fillStyle = speedActions[b.action] === r().speedMul ? TD.C.gold : TD.C.text;
    TD.ctx.font = '7px monospace';
    TD.ctx.textAlign = 'center';
    TD.ctx.fillText(b.label, b.x + b.w / 2, cy + (isT ? 15 : 14));
  });

  // Volume bar: bigger tap target + slightly taller on touch. Position aligned with inflated rect.
  const volX = cx + (isT ? 60 : 62), volY = cy + (isT ? 5 : 7), volW = isT ? 18 : 16, volH = isT ? 10 : 8;
  const hovVol = r().hoverUi && r().hoverUi.action === 'volume';
  px(volX, volY, volW, volH, hovVol ? TD.C.uiLight : TD.C.shadow);
  px(volX + 1, volY + 2, Math.max(1, (volW - 2) * TD.VOL), volH - 4, TD.muted ? '#555' : TD.C.gold);

  const wl = TD.getWaveLabel();
  const waveText = r().wavePhase === 'pause'
    ? wl + ' · ' + Math.ceil(r().waveTimer) + 's'
    : r().gameMode === 'endless' ? wl + ' ∞' : wl + '/' + TD.getCampaignWaveCount();
  TD.ctx.fillStyle = TD.C.text;
  TD.ctx.font = '7px monospace';
  TD.ctx.textAlign = 'left';
  TD.ctx.fillText(waveText, cx, TD.HUD.row1 + 10);

  // Show preview of the wave that is about to / currently relevant for planning
  let previewIdx = r().wave;
  let previewLabel = TD.t('hud.now');
  if (r().wavePhase === 'pause') {
    previewIdx = r().wave;
    previewLabel = TD.t('hud.next');
  } else if (r().gameMode !== 'endless' && r().wave + 1 < TD.getCampaignWaveCount()) {
    previewIdx = r().wave + 1;
    previewLabel = TD.t('hud.next');
  }
  TD.drawWavePreview(cx, TD.HUD.row1 + 20, previewLabel, 50, previewIdx);
  if (r().wavePhase === 'pause' && r().state === TD.STATE.PLAYING) {
    const isT = TD.isTouch;
    const gx = cx + (isT ? 52 : 54), gy = TD.HUD.row1 - (isT ? 1 : 0);
    const hovGo = r().hoverUi && r().hoverUi.action === 'startWave';
    const gw = isT ? 28 : 26, gh = isT ? 15 : 14;
    px(gx, gy, gw, gh, hovGo ? TD.C.accent : TD.C.shadow);
    TD.ctx.fillStyle = TD.C.gold;
    TD.ctx.font = '7px monospace';
    TD.ctx.textAlign = 'center';
    TD.ctx.fillText('GO', gx + gw/2, gy + (isT ? 11 : 10));
  }
  TD.drawTowerTooltip();

  // Draw small fullscreen affordance on touch devices (top-right, over the map area)
  // Helps users hide browser UI bars so the scaled canvas becomes larger.
  if (TD.isTouch) {
    const fx = TD.W - 28, fy = 26, fw = 24, fh = 18;
    const hov = r().hoverUi && r().hoverUi.action === 'fullscreen';
    px(fx, fy, fw, fh, hov ? TD.C.accent : 'rgba(42,42,62,0.85)');
    TD.ctx.strokeStyle = TD.C.uiBorder;
    TD.ctx.strokeRect(fx, fy, fw, fh);
    // Simple pixel fullscreen icon (works reliably)
    TD.ctx.fillStyle = TD.C.gold;
    TD.ctx.fillRect(fx + 4, fy + 4, fw - 8, 2);
    TD.ctx.fillRect(fx + 4, fy + fh - 6, fw - 8, 2);
    TD.ctx.fillRect(fx + 4, fy + 4, 2, fh - 8);
    TD.ctx.fillRect(fx + fw - 6, fy + 4, 2, fh - 8);
    // inner "expand" marks
    TD.ctx.fillRect(fx + 7, fy + 7, 3, 1);
    TD.ctx.fillRect(fx + 7, fy + 7, 1, 3);
    TD.ctx.fillRect(fx + fw - 10, fy + fh - 8, 3, 1);
    TD.ctx.fillRect(fx + fw - 8, fy + fh - 10, 1, 3);
  }
}

TD.drawWavePreview = function drawWavePreview(x, y, label, maxW, waveIdx) {
  const idx = (waveIdx != null) ? waveIdx : r().wave;
  const summary = TD.getWaveSummary(idx);
  TD.ctx.fillStyle = '#888';
  TD.ctx.font = '6px monospace';
  TD.ctx.textAlign = 'left';
  TD.ctx.fillText(label, x, y);
  let ox = x + label.length * 4 + 8;
  for (const item of summary) {
    if (maxW && ox > x + maxW) break;
    const def = TD.ENEMY_TYPES[item.type];
    px(ox, y - 6, 5, 5, def.color);
    TD.ctx.fillStyle = TD.C.text;
    TD.ctx.fillText(item.count + def.short, ox + 7, y);
    ox += 20;
  }
}

TD.drawStatsPanel = function drawStatsPanel() {
  const sx = TD.HUD.statsX, y1 = TD.HUD.row1 + 4;
  TDG.drawCoin(sx + 6, y1 + 6, 5);
  TD.ctx.fillStyle = r().goldFlash > 0 ? TD.C.baseDmg : TD.C.gold;
  TD.ctx.font = 'bold 9px monospace';
  TD.ctx.textAlign = 'left';
  TD.ctx.fillText(r().gold + 'g', sx + 16, y1 + 10);

  TD.ctx.fillStyle = r().baseFlash > 0 ? TD.C.baseDmg : TD.C.text;
  TD.ctx.font = '7px monospace';
  TD.ctx.fillText('HP', sx + 2, y1 + 22);
  px(sx + 18, y1 + 16, 50, 6, TD.C.hpBg);
  px(sx + 18, y1 + 16, 50 * (r().baseHp / TD.BASE_HP_MAX), 6, TD.C.hp);
  TD.ctx.fillText(r().baseHp + '/' + TD.BASE_HP_MAX, sx + 72, y1 + 22);
}

TD.drawTowerPanel = function drawTowerPanel() {
  const t = r().selectedTower, def = TD.TOWER_TYPES[t.type];
  const sx = TD.HUD.statsX;
  TDG.drawTowerIcon(t.type, sx + 2, TD.HUD.row1 + 5, 12);
  TD.ctx.fillStyle = TD.C.text;
  TD.ctx.font = '7px monospace';
  TD.ctx.textAlign = 'left';
  const modeLabel = TD.getTargetModeLabel ? TD.getTargetModeLabel(t.targetMode) : 'F';
  let label = def.name + ' L' + t.level + ' [' + modeLabel + ']';
  if (typeof t.integrity === 'number' && t.maxIntegrity && t.integrity < t.maxIntegrity * 0.98) {
    const pct = Math.floor(t.integrity / t.maxIntegrity * 100);
    label += ' ' + pct + '%';
  }
  TD.ctx.fillText(label, sx + 18, TD.HUD.row1 + 12);
  TD.ctx.fillStyle = TD.C.gold;
  TD.ctx.fillStyle = r().baseFlash > 0 ? TD.C.baseDmg : TD.C.text;
  TD.ctx.fillText('R' + def.range[t.level - 1] + ' · ' + r().gold + 'g · HP' + r().baseHp, sx + 18, TD.HUD.row1 + 22);
  // mode hint (small, only when selected)
  TD.ctx.fillStyle = '#aaa';
  TD.ctx.font = '6px monospace';
  TD.ctx.fillText('T: cycle target (' + modeLabel + ')', sx + 18, TD.HUD.row1 + 30);

  const py = TD.HUD.row2 + 3;
  const upCost = t.level < 3 ? def.upgrades[t.level - 1] : null;
  const refund = TD.getSellValue ? TD.getSellValue(t) : Math.floor(t.invested * TD.SELL_RATIO);
  const hovUp = r().hoverUi && r().hoverUi.action === 'upgrade';
  const hovSell = r().hoverUi && r().hoverUi.action === 'sell';
  const canRepair = typeof t.integrity === 'number' && t.maxIntegrity && t.integrity < t.maxIntegrity;
  const hovRepair = canRepair && r().hoverUi && r().hoverUi.action === 'repair';

  if (canRepair) {
    px(sx, py, 34, 16, hovUp ? TD.C.accent : TD.C.shadow);
    TD.ctx.fillStyle = upCost && r().gold >= upCost ? TD.C.text : '#888';
    TD.ctx.font = '7px monospace';
    TD.ctx.textAlign = 'center';
    TD.ctx.fillText(upCost ? 'U ' + upCost + 'g' : 'MAX', sx + 17, py + 11);

    const repairCost = TD.getRepairCost ? TD.getRepairCost(t) : Math.max(5, Math.ceil((t.maxIntegrity - t.integrity) * 0.8));
    px(sx + 36, py, 38, 16, hovRepair ? TD.C.accent : TD.C.shadow);
    TD.ctx.fillStyle = r().gold >= repairCost ? TD.C.text : '#888';
    TD.ctx.fillText('REP ' + repairCost + 'g', sx + 55, py + 11);

    px(sx + 76, py, 34, 16, hovSell ? TD.C.accent : TD.C.shadow);
    TD.ctx.fillStyle = TD.C.gold;
    TD.ctx.fillText('S +' + refund + 'g', sx + 93, py + 11);
  } else {
    px(sx, py, 54, 16, hovUp ? TD.C.accent : TD.C.shadow);
    TD.ctx.fillStyle = upCost && r().gold >= upCost ? TD.C.text : '#888';
    TD.ctx.font = '7px monospace';
    TD.ctx.textAlign = 'center';
    TD.ctx.fillText(upCost ? 'UP ' + upCost + 'g' : 'MAX', sx + 27, py + 11);

    px(sx + 58, py, 54, 16, hovSell ? TD.C.accent : TD.C.shadow);
    TD.ctx.fillStyle = TD.C.gold;
    TD.ctx.fillText('SELL +' + refund + 'g', sx + 85, py + 11);
  }
}

TD.drawTargetFeedback = function drawTargetFeedback() {
  if (r().state !== TD.STATE.PLAYING && r().state !== TD.STATE.PAUSED) return;
  const ctx = TD.ctx;
  const markBlocked = (ex, ey) => {
    ctx.strokeStyle = 'rgba(255,80,80,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 4, ey + 4);
    ctx.moveTo(ex + 4, ey - 4); ctx.lineTo(ex - 4, ey + 4); ctx.stroke();
  };
  const checkType = (type, slot) => {
    if (!type || !slot) return;
    const range = TD.TOWER_TYPES[type].range[0] * TD.TILE;
    for (const e of r().enemies) {
      if (!e.alive) continue;
      const p = TD.enemyPos(e);
      if (Math.hypot(p[0] - slot.x, p[1] - slot.y) > range) continue;
      if (!TD.canTowerHit(type, e)) markBlocked(p[0], p[1] - 6);
    }
  };
  if (r().selectedTowerType && r().hoverSlot) checkType(r().selectedTowerType, r().hoverSlot);
  if (r().selectedTower) checkType(r().selectedTower.type, r().selectedTower.slot);
};

TD.drawTutorial = function drawTutorial() {
  if (r().tutorial.dismissed || r().state !== TD.STATE.PLAYING) return;
  const msgs = [0, 1, 2, 3].map(i => TD.t('tut.' + i));
  if (r().tutorial.step >= msgs.length) return;
  const bw = 210, bh = 18;
  px(4, 4, bw, bh, 'rgba(42,42,62,0.88)');
  TD.ctx.strokeStyle = TD.C.gold;
  TD.ctx.strokeRect(4, 4, bw, bh);
  TD.ctx.fillStyle = TD.C.text;
  TD.ctx.font = '7px monospace';
  TD.ctx.textAlign = 'left';
  TD.ctx.fillText(msgs[r().tutorial.step], 10, 16);
}

TD.drawMenu = function drawMenu() {
  const u = TD.MENU_UI;
  const cy = u.ctrlY;
  const diffY = cy + u.modeH + 5;
  const startY = diffY + u.diffH + 5;

  TD.ctx.fillStyle = 'rgba(26,26,46,0.92)';
  TD.ctx.fillRect(0, 0, TD.W, TD.H);
  TD.ctx.textAlign = 'center';

  TD.ctx.fillStyle = TD.C.gold;
  TD.ctx.font = 'bold 15px monospace';
  TD.ctx.fillText('TOWER DEFENSE', TD.W / 2, 17);
  TD.ctx.fillStyle = '#888';
  TD.ctx.font = '6px monospace';
  TD.ctx.fillText(TD.t('tagline'), TD.W / 2, 28);

  TD.ctx.fillStyle = '#555';
  TD.ctx.font = '5px monospace';
  TD.ctx.fillText(TD.t('menu.map'), TD.W / 2, u.mapY - 3);

  TD.MAP_IDS.forEach((id, i) => {
    const x = TD.menuMapX(i);
    const m = TD.MAPS[id];
    const sel = r().menuMap === id;
    const hov = r().hoverMenu && r().hoverMenu.action === 'map' && r().hoverMenu.mapId === id;
    if (sel || hov) px(x - 1, u.mapY - 1, u.mapW + 2, u.mapH + 2, sel ? 'rgba(200,181,96,0.15)' : 'rgba(255,255,255,0.04)');
    TDG.drawMapPreview(id, x, u.mapY, u.mapW, u.mapH, sel);
    px(x, u.mapY + u.mapH - 9, u.mapW, 9, 'rgba(0,0,0,0.6)');
    TD.ctx.fillStyle = sel ? TD.C.gold : TD.C.text;
    TD.ctx.font = '6px monospace';
    TD.ctx.textAlign = 'center';
    TD.ctx.fillText(m.name, x + u.mapW / 2, u.mapY + u.mapH - 2);
    const stars = TD.getBestStars(id);
    if (stars > 0) TDG.drawStars(x + u.mapW / 2, u.mapY + 7, stars, 3);
    const be = TD.getBestEndless(id);
    if (be > 0) {
      TD.ctx.fillStyle = '#bbb';
      TD.ctx.font = '5px monospace';
      TD.ctx.textAlign = 'right';
      TD.ctx.fillText('E' + be, x + u.mapW - 2, u.mapY + 6);
    }
  });

  px(24, cy - 5, TD.W - 48, 1, 'rgba(200,181,96,0.18)');

  const hovCamp = r().hoverMenu && r().hoverMenu.action === 'mode' && r().hoverMenu.mode === 'campaign';
  const hovEnd = r().hoverMenu && r().hoverMenu.action === 'mode' && r().hoverMenu.mode === 'endless';
  px(TD.W / 2 - u.modeW - 2, cy, u.modeW, u.modeH, r().menuMode === 'campaign' ? TD.C.accent : hovCamp ? TD.C.uiLight : TD.C.shadow);
  px(TD.W / 2 + 2, cy, u.modeW, u.modeH, r().menuMode === 'endless' ? TD.C.accent : hovEnd ? TD.C.uiLight : TD.C.shadow);
  TD.ctx.font = '7px monospace';
  TD.ctx.fillStyle = r().menuMode === 'campaign' ? TD.C.gold : TD.C.text;
  TD.ctx.fillText('Campaign', TD.W / 2 - u.modeW / 2 - 2, cy + 11);
  TD.ctx.fillStyle = r().menuMode === 'endless' ? TD.C.gold : TD.C.text;
  TD.ctx.fillText('Endless', TD.W / 2 + u.modeW / 2 + 2, cy + 11);

  const diff = TD.DIFFICULTY[r().menuDifficulty] || TD.DIFFICULTY.normal;
  const hovDiff = r().hoverMenu && r().hoverMenu.action === 'difficulty';
  px(TD.W / 2 - 36, diffY, 72, u.diffH, hovDiff ? TD.C.accent : TD.C.shadow);
  TD.ctx.fillStyle = r().menuDifficulty === 'easy' ? TD.C.gold : TD.C.text;
  TD.ctx.font = '6px monospace';
  TD.ctx.fillText(TD.getDiffLabel(r().menuDifficulty), TD.W / 2, diffY + 10);

  const hovStart = r().hoverMenu && r().hoverMenu.action === 'start';
  px(TD.W / 2 - 46, startY, 92, u.startH, hovStart ? TD.C.accent : TD.C.ui);
  TD.ctx.strokeStyle = TD.C.gold;
  TD.ctx.lineWidth = 1;
  TD.ctx.strokeRect(TD.W / 2 - 46, startY, 92, u.startH);
  TD.ctx.fillStyle = TD.C.gold;
  TD.ctx.font = 'bold 8px monospace';
  TD.ctx.fillText('START', TD.W / 2, startY + 13);

  // Variant seed display + reroll (pure random on waves/enemies for noticeable variety on same map)
  if (!r().menuSeed) r().menuSeed = TD.generateSeed ? TD.generateSeed() : Math.floor(Math.random()*0xfffff).toString(16);
  const seedY = startY + u.startH + 4;
  const hovSeed = r().hoverMenu && r().hoverMenu.action === 'rerollSeed';
  px(TD.W / 2 - 55, seedY, 110, 12, hovSeed ? TD.C.accent : TD.C.shadow);
  TD.ctx.fillStyle = TD.C.text;
  TD.ctx.font = '5px monospace';
  TD.ctx.textAlign = 'center';
  TD.ctx.fillText('Variant: ' + r().menuSeed + ' (tap to reroll)', TD.W / 2, seedY + 8);

  const infoY = seedY + 14 + u.sectionGap;  // push the records box down to avoid overlap with the new Variant line
  const bx = 20, by = infoY, bw = TD.W - 40, bh = u.infoH;
  px(bx, by, bw, bh, 'rgba(42,42,62,0.8)');
  TD.ctx.strokeStyle = TD.C.uiBorder;
  TD.ctx.strokeRect(bx, by, bw, bh);
  px(bx + 6, by + 21, bw - 12, 1, 'rgba(200,181,96,0.15)');

  const mapName = TD.MAPS[r().menuMap]?.name || r().menuMap;
  const bestWv = TD.getBestWave(r().menuMap);
  const bt = TD.getBestTime(r().menuMap);
  const mapWaves = TD.MAPS[r().menuMap]?.waves?.length || TD.getCampaignWaveCount();
  const modeLabel = r().menuMode === 'endless' ? 'Endless' : 'Campaign';
  const diffLabel = TD.getDiffLabel(r().menuDifficulty);

  TD.ctx.textAlign = 'left';
  TD.ctx.fillStyle = TD.C.gold;
  TD.ctx.font = 'bold 7px monospace';
  TD.ctx.fillText(mapName, bx + 8, by + 12);
  TD.ctx.textAlign = 'right';
  if (TD.getAchievementCount) {
    const achN = TD.getAchievementCount() + '/' + TD.ACHIEVEMENTS.length;
    const achTw = achN.length * 3 + 10;
    px(bx + bw - achTw, by + 4, 5, 5, TD.C.gold);
    px(bx + bw - achTw + 1, by + 3, 3, 2, TD.C.gold);
    TD.ctx.fillStyle = '#888';
    TD.ctx.font = '5px monospace';
    TD.ctx.fillText(achN, bx + bw - 8, by + 10);
    TD.ctx.fillStyle = '#aaa';
    TD.ctx.font = '6px monospace';
    TD.ctx.fillText(modeLabel + ' · ' + diffLabel, bx + bw - 8, by + 19);
  } else {
    TD.ctx.fillStyle = '#999';
    TD.ctx.font = '6px monospace';
    TD.ctx.fillText(modeLabel + ' · ' + diffLabel, bx + bw - 8, by + 12);
  }

  TD.ctx.textAlign = 'center';
  TD.ctx.fillStyle = '#aaa';
  TD.ctx.font = '6px monospace';
  const recText = r().menuMode === 'endless'
    ? TD.t('menu.recordEndless', { n: TD.getBestEndless(r().menuMap) || '—' })
    : TD.t('menu.recordCampaign', {
      best: bestWv || '—', total: mapWaves,
      time: bt > 0 ? TD.t('rec.sep') + TD.formatTime(bt) : ''
    });
  TD.ctx.fillText(recText, TD.W / 2, by + 33);
  TDG.drawStars(TD.W / 2, by + 45, TD.getBestStars(r().menuMap), 6);

  TD.ctx.fillStyle = '#666';
  TD.ctx.font = '5px monospace';
  TD.ctx.fillText(TD.t('menu.starsLegend'), TD.W / 2, by + bh - 6);

  TD.ctx.fillStyle = '#555';
  TD.ctx.font = '5px monospace';
  TD.ctx.textAlign = 'center';
  TD.ctx.fillText(TD.t('menu.hint1'), TD.W / 2, TD.H - 11);
  TD.ctx.fillText(TD.t('menu.hint2'), TD.W / 2, TD.H - 3);

  // Demo mode info on main screen (not only when active)
  if (!TD.isDemo) {
    TD.ctx.fillStyle = '#777';
    TD.ctx.font = '5px monospace';
    TD.ctx.fillText(TD.t('menu.demoHint'), TD.W / 2, TD.H - 19);
  }

  // Fullscreen button also visible in menu on touch devices
  if (TD.isTouch) {
    const fx = TD.W - 28, fy = 26, fw = 24, fh = 18;
    const hov = (r().hoverMenu && r().hoverMenu.action === 'fullscreen') || (r().hoverUi && r().hoverUi.action === 'fullscreen');
    px(fx, fy, fw, fh, hov ? TD.C.accent : 'rgba(42,42,62,0.85)');
    TD.ctx.strokeStyle = TD.C.uiBorder;
    TD.ctx.strokeRect(fx, fy, fw, fh);
    // Simple pixel fullscreen icon (works reliably)
    TD.ctx.fillStyle = TD.C.gold;
    TD.ctx.fillRect(fx + 4, fy + 4, fw - 8, 2);
    TD.ctx.fillRect(fx + 4, fy + fh - 6, fw - 8, 2);
    TD.ctx.fillRect(fx + 4, fy + 4, 2, fh - 8);
    TD.ctx.fillRect(fx + fw - 6, fy + 4, 2, fh - 8);
    // inner "expand" marks
    TD.ctx.fillRect(fx + 7, fy + 7, 3, 1);
    TD.ctx.fillRect(fx + 7, fy + 7, 1, 3);
    TD.ctx.fillRect(fx + fw - 10, fy + fh - 8, 3, 1);
    TD.ctx.fillRect(fx + fw - 8, fy + fh - 10, 1, 3);
  }
}

TD.drawResultsScreen = function drawResultsScreen() {
  const result = r().lastRunResult;
  if (!result) return;
  const totalWaves = TD.getCampaignWaveCount();
  TD.ctx.fillStyle = 'rgba(26,26,46,0.88)';
  TD.ctx.fillRect(0, 0, TD.W, TD.H);
  const boxH = result.won && result.mode === 'campaign' ? 164 : 132; // extra room to reduce risk of text overlapping stars/lines on tight canvas
  px(TD.W / 2 - 100, TD.H / 2 - 72, 200, boxH, 'rgba(42,42,62,0.95)');
  TD.ctx.strokeStyle = TD.C.uiBorder;
  TD.ctx.strokeRect(TD.W / 2 - 100, TD.H / 2 - 72, 200, boxH);

  TD.ctx.fillStyle = result.won ? TD.C.gold : TD.C.baseDmg;
  TD.ctx.font = 'bold 18px monospace';
  TD.ctx.textAlign = 'center';
  TD.ctx.fillText(result.won ? 'VICTORY!' : 'DEFEAT', TD.W / 2, TD.H / 2 - 48);

  const mapName = TD.MAPS[result.mapId]?.name || result.mapId;
  if (result.won && result.mode === 'campaign') {
    TD.ctx.fillStyle = TD.C.text;
    TD.ctx.font = '8px monospace';
    TD.ctx.fillText(mapName, TD.W / 2, TD.H / 2 - 32);
    TDG.drawStars(TD.W / 2, TD.H / 2 - 16, result.stars, 14);

    const best = TD.getBestStars(result.mapId);
    if (best > 0 && best !== result.stars) {
      // Moved higher (was H/2-4 which collided with stars and first stat line at H/2-8).
      // Safer position above the stars row with breathing room.
      TD.ctx.fillStyle = '#777';
      TD.ctx.font = '6px monospace';
      TD.ctx.fillText(TD.t('result.bestStars', { n: best }), TD.W / 2, TD.H / 2 - 28);
    }
  }

  TD.ctx.fillStyle = TD.C.text;
  TD.ctx.font = '8px monospace';
  const bestEndless = TD.getBestEndless(result.mapId);
  const bestTime = TD.getBestTime(result.mapId);
  const waveLine = result.mode === 'endless'
    ? TD.t('result.waveEndless', {
      wave: result.wave,
      best: bestEndless > 0 ? TD.t('result.bestEndless', { n: bestEndless }) : ''
    })
    : result.won ? totalWaves + '/' + totalWaves + TD.t('rec.sep') + mapName
    : TD.t('result.waveCampaign', { wave: result.wave, total: totalWaves, map: mapName });
  const lines = result.won && result.mode === 'campaign' ? [
    TD.t('result.time', {
      time: TD.formatTime(result.time),
      best: bestTime > 0 ? TD.t('result.bestTime', { time: TD.formatTime(bestTime) }) : ''
    }),
    TD.t('result.killsCombo', { kills: result.kills, combo: result.maxCombo }),
    TD.t('result.baseHp', { hp: result.baseHp, max: TD.BASE_HP_MAX }),
    TD.t('result.sellsPauses', { sells: result.sells, pauses: result.pauses })
  ] : [
    waveLine,
    TD.t('result.kills', {
      kills: result.kills,
      combo: result.maxCombo ? '  Max combo: ' + result.maxCombo : ''
    }),
    TD.t('result.time', { time: TD.formatTime(result.time), best: '' })
  ];
  if (result.seed) lines.push('Seed: ' + result.seed);
  lines.forEach((ln, i) => TD.ctx.fillText(ln, TD.W / 2, TD.H / 2 - 8 + i * 12));

  // show tower losses if any (for the new vulnerability fantasy)
  if (result.towersLost > 0) {
    TD.ctx.fillStyle = '#a66';
    TD.ctx.font = '6px monospace';
    TD.ctx.fillText('Towers lost: ' + result.towersLost, TD.W / 2, TD.H / 2 + 8 + lines.length * 12);
  }

  if (result.won && result.mode === 'campaign') {
    TD.ctx.fillStyle = '#777';
    TD.ctx.font = '6px monospace';
    if (result.stars < 3) {
      const tips = [];
      if (result.baseHp < TD.BASE_HP_MAX) tips.push(TD.t('result.tipHp'));
      if (result.sells > 0) tips.push(TD.t('result.tipNoSell'));
      if (result.pauses > 0) tips.push(TD.t('result.tipNoPause'));
      TD.ctx.fillText(TD.t('result.stillPossible', { tips: tips.join('  ') }), TD.W / 2, TD.H / 2 + 44);
    } else {
      TD.ctx.fillText(TD.t('result.perfect'), TD.W / 2, TD.H / 2 + 44);
    }
  }

  TD.ctx.fillStyle = '#666';
  TD.ctx.font = '7px monospace';
  TD.ctx.fillText(TD.t('result.menu'), TD.W / 2, TD.H / 2 + (result.won && result.mode === 'campaign' ? 60 : 48));
}

TD.drawPause = function drawPause() {
  TD.ctx.fillStyle = 'rgba(26,26,46,0.5)';
  TD.ctx.fillRect(0, 0, TD.W, TD.MAP_PX_H);
  TD.ctx.fillStyle = TD.C.gold;
  TD.ctx.font = 'bold 14px monospace';
  TD.ctx.textAlign = 'center';
  TD.ctx.fillText('PAUSED', TD.W / 2, TD.MAP_PX_H / 2 - 36);

  // Full gameplay help on pause
  TD.ctx.fillStyle = TD.C.text;
  TD.ctx.font = '6px monospace';
  const help = [
    'Space: resume   N: next wave early   1-3: speed',
    'Select tower: UP / SELL (or R key)',
    'T (on tower): cycle TARGET MODE',
    'F: Farthest (threat)  S: Fastest  H: Strongest  C: Closest',
    '3★ = full HP + 0 sells + 0 pauses. FK=air, CN=groups.'
  ];
  help.forEach((ln, i) => {
    TD.ctx.fillText(ln, TD.W / 2, TD.MAP_PX_H / 2 - 8 + i * 9);
  });
}

TD.drawTowerModeHints = function drawTowerModeHints() {
  const towers = r().towers || [];
  if (!towers.length) return;
  const ctx = TD.ctx;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 5px monospace';
  for (const t of towers) {
    if (!t._modeHintLife || t._modeHintLife <= 0.05) continue;
    const alpha = Math.max(0.2, Math.min(1, t._modeHintLife));
    ctx.globalAlpha = alpha;
    const x = t.slot.x, y = t.slot.y - 13;
    const m = t._modeHintMode || 'far';
    const label = TD.getTargetModeLabel ? TD.getTargetModeLabel(m) : 'F';
    const names = { far: 'FARTHEST', fast: 'FASTEST', strong: 'STRONGEST', close: 'CLOSEST' };
    const name = names[m] || 'TARGET';
    ctx.fillStyle = '#ffdd88';
    ctx.fillText('[' + label + '] ' + name, x, y);
    // small underline effect for visibility
    ctx.fillStyle = 'rgba(200,180,100,0.6)';
    ctx.fillRect(x - 22, y + 2, 44, 1);
  }
  ctx.restore();
}

TD.isPortraitPhone = function isPortraitPhone() {
  if (!TD.isTouch) return false;
  const w = window.innerWidth || TD.W;
  const h = window.innerHeight || TD.H;
  // Portrait or very tall narrow + low effective scale
  return (h > w * 1.15) && (Math.min(w / TD.W, h / TD.H) < 1.6);
};

TD.drawMobileHints = function drawMobileHints() {
  if (!TD.isPortraitPhone()) return;
  const ctx = TD.ctx;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, TD.W, 22);
  ctx.fillStyle = '#ffdd88';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('↻ ПОВЕРНИ → або тапни квадрат угорі щоб сховати смужки браузера', TD.W / 2, 15);
  ctx.restore();
};

TD.drawDemoOverlay = function drawDemoOverlay() {
  if (!TD.isDemo) return;
  const ctx = TD.ctx;
  ctx.save();
  ctx.fillStyle = TD.C.gold;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(TD.t('demo.label'), TD.W - 6, 10);

  const audioReady = TD.audioCtx && TD.audioCtx.state === 'running' && TD.musicActive;
  if (!audioReady) {
    // On initial ?demo=1 load, show a non-click hint (mouse click exits demo)
    ctx.textAlign = 'center';
    ctx.font = '6px monospace';
    ctx.fillStyle = '#bbaa77';
    ctx.fillText(TD.t('demo.soundHint'), TD.W / 2, TD.H - 18);
  } else if (r().state === TD.STATE.MENU) {
    ctx.textAlign = 'center';
    ctx.font = '6px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(TD.t('demo.exitHint'), TD.W / 2, TD.H - 18);
  }
  ctx.restore();
};

TD.bindInput = function bindInput() {
  let mouseDown = false;
  const onMove = (mx, my) => {
    [TD.mouseX, TD.mouseY] = TD.toGame(mx, my);
    TD.updateHover();
    // Live volume adjust while dragging over the slider (or moving touch over it)
    if ((mouseDown || TD.isTouch) && r().hoverUi && r().hoverUi.action === 'volume') {
      TD.initAudio();
      // Use visual bar position for accurate 0..1 calc (hit rect may be inflated for touch).
      const cx = TD.HUD.ctrlX;
      const isT = TD.isTouch;
      const vX = cx + (isT ? 60 : 62);
      const vW = isT ? 18 : 16;
      let v = (TD.mouseX - vX) / vW;
      TD.setVolume(v);
    }
  };
  const onTap = (mx, my) => {
    TD._audioUserActivated = true;
    TD.initAudio(); [TD.mouseX, TD.mouseY] = TD.toGame(mx, my); TD.updateHover();
    if (TD.handleMapEditorClick) TD.handleMapEditorClick();
    TD.handleClick();
  };
  const clearHover = () => { r().hoverSlot = null; r().hoverUi = null; r().hoverMenu = null; };
  TD.canvas.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  TD.canvas.addEventListener('mousedown', () => { mouseDown = true; });
  TD.canvas.addEventListener('mouseup', () => { mouseDown = false; });
  TD.canvas.addEventListener('click', e => onTap(e.clientX, e.clientY));
  TD.canvas.addEventListener('contextmenu', e => { e.preventDefault(); r().selectedTowerType = null; r().selectedTower = null; });
  TD.canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    TD.isTouch = true;
    if (e.touches.length) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  TD.canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  TD.canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (e.changedTouches.length) onTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }, { passive: false });
  TD.canvas.addEventListener('touchcancel', e => { e.preventDefault(); clearHover(); }, { passive: false });
  document.addEventListener('keydown', e => {
    // Demo mode: F4 toggles; any other input exits demo (attract behavior)
    if (TD.isDemo) {
      const alreadyActivated = TD._audioUserActivated;
      TD._audioUserActivated = true;
      TD.initAudio();
      if (TD.audioCtx && TD.audioCtx.state === 'running' && !TD.muted) {
        if (!alreadyActivated || !TD.musicActive) {
          TD.bus.emit('music:start');
        }
      }
      if (e.code === 'F4') {
        TD.toggleDemo();
        e.preventDefault();
        return;
      }
      if (!alreadyActivated) {
        // First interaction (non-F4): used to unlock audio for the attract demo.
        // Keep the demo running (with sound now) instead of immediately exiting.
        e.preventDefault();
        return;
      }
      if (e.code !== 'F3') { // allow debug toggle
        TD.exitDemo();
        e.preventDefault();
        return;
      }
    }
    if (e.code === 'F4') { TD.toggleDemo(); e.preventDefault(); return; }

    if (r().state === TD.STATE.MENU) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') TD.cycleMenuMap(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') TD.cycleMenuMap(1);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') r().menuMode = 'campaign';
      if (e.code === 'ArrowDown' || e.code === 'KeyS') r().menuMode = 'endless';
      if (e.code === 'KeyQ') TD.cycleMenuDifficulty();
      if (e.code === 'Space' || e.code === 'Enter') { TD.initAudio(); TD.startGame(r().menuMap, r().menuMode); }
      return;
    }
    if (r().state === TD.STATE.WON || r().state === TD.STATE.LOST) { if (e.code === 'Space' || e.code === 'Enter') TD.resetGame(); return; }
    if (e.code === 'Space') { TD.togglePause(); e.preventDefault(); }
    if (e.code === 'Digit1') r().speedMul = 1;
    if (e.code === 'Digit2') r().speedMul = 2;
    if (e.code === 'Digit3') r().speedMul = 3;
    if (e.code === 'Escape') { r().selectedTowerType = null; r().selectedTower = null; }
    if (e.code === 'KeyT' && r().selectedTower) {
      TD.cycleTowerTargetMode(r().selectedTower);
      const t = r().selectedTower;
      t._modeHintMode = t.targetMode || 'far';
      t._modeHintLife = 1.5;
      TD.bus.emit('sfx', 'upgrade');
      e.preventDefault();
    }
    if (e.code === 'KeyR' && r().selectedTower) { TD.sellTower(r().selectedTower); r().selectedTower = null; e.preventDefault(); }
    if (e.code === 'KeyN') TD.skipWavePause();
    if (e.code === 'KeyV') { TD.initAudio(); TD.cycleVolume(); }
    if (e.code === 'F3') { TD.toggleDebug(); e.preventDefault(); }
    if (e.code === 'KeyE' && TD.debug) TD.toggleMapEditor();
    if (e.code === 'KeyC' && TD.debug && TD.mapEditor) {
      const m = TD.MAPS[TD.currentMapId];
      if (m) console.log('corners:', JSON.stringify(m.corners));
    }
    // Quick toggle for tower damage fantasy testing (debug only)
    if (TD.debug && e.code === 'KeyD') {
      TD.TOWER_DAMAGE_ENABLED = !TD.TOWER_DAMAGE_ENABLED;
      TD.TOWER_DAMAGE_CHANCE_MULT = TD.TOWER_DAMAGE_ENABLED ? 1.0 : 0;
      console.log('TOWER_DAMAGE_ENABLED =', TD.TOWER_DAMAGE_ENABLED, 'mult=', TD.TOWER_DAMAGE_CHANCE_MULT);
      e.preventDefault();
    }
  });
};
})();
