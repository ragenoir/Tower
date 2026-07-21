(() => {
'use strict';
const S = window.__TDG_S;
const px = window.TDG.px;
const pal = window.TDG.pal;
Object.assign(window.TDG, {
  drawProjectiles(projectiles, animTime = 0) {
    for (const p of projectiles) {
      if (!p.alive) continue;
      if (p.type === 'cannon') {
        if (p.trail) for (let i = 0; i < p.trail.length; i++) {
          const t = p.trail[i];
          S.ctx.globalAlpha = 0.2 + (i / p.trail.length) * 0.4;
          px(t.x - 2, t.y - 2, 4, 4, 'rgba(40,30,20,0.6)');
        }
        S.ctx.globalAlpha = 1;
        px(p.x - 4, p.y - 4, 8, 8, '#2a1a0a');
        px(p.x - 2, p.y - 2, 4, 4, '#4a3a2a');
        if (Math.sin(animTime * 20 + p.id) > 0.5) px(p.x - 1, p.y - 5, 2, 2, 'rgba(200,150,80,0.4)');
      } else if (p.type === 'sniper') {
        const dx = p.tx - p.x, dy = p.ty - p.y, len = Math.hypot(dx, dy) || 1;
        S.ctx.strokeStyle = S.C.sniper; S.ctx.lineWidth = 2;
        S.ctx.beginPath(); S.ctx.moveTo(p.x, p.y);
        S.ctx.lineTo(p.x + (dx / len) * 12, p.y + (dy / len) * 12); S.ctx.stroke();
        S.ctx.strokeStyle = 'rgba(255,255,255,0.4)'; S.ctx.lineWidth = 1;
        S.ctx.beginPath(); S.ctx.moveTo(p.x, p.y);
        S.ctx.lineTo(p.x + (dx / len) * 8, p.y + (dy / len) * 8); S.ctx.stroke();
      } else if (p.type === 'frost') {
        const spin = animTime * 8 + p.id;
        px(p.x - 3, p.y - 3, 6, 6, '#b0e8ff');
        px(p.x - 1 + Math.sin(spin) * 2, p.y - 1, 2, 2, '#fff');
        px(p.x + 1, p.y + 1 + Math.cos(spin) * 2, 2, 2, '#d0f0ff');
      } else {
        const dx = p.tx - p.x, dy = p.ty - p.y, len = Math.hypot(dx, dy) || 1;
        S.ctx.strokeStyle = S.C.arrow; S.ctx.lineWidth = 2;
        S.ctx.beginPath(); S.ctx.moveTo(p.x, p.y);
        S.ctx.lineTo(p.x + (dx / len) * 8, p.y + (dy / len) * 8); S.ctx.stroke();
        px(p.x - 1, p.y - 1, 2, 2, '#fff8');
      }
    }
  },

  drawParticles(particles) {
    for (const p of particles) {
      if (p.delay != null && p.delay > 0) continue;
      const lifeNorm = Math.min(1, p.life / 0.5);
      S.ctx.globalAlpha = lifeNorm;
      const s = p.size || 2;
      const kind = p.kind || 'puff';
      if (kind === 'spark') {
        const len = Math.min(6, Math.hypot(p.vx || 0, p.vy || 0) * 0.08 + s);
        const ang = Math.atan2(p.vy || 0, p.vx || 1);
        S.ctx.save();
        S.ctx.translate(p.x, p.y);
        S.ctx.rotate(ang);
        px(-len * 0.3, -s / 2, len, Math.max(1, s * 0.7), p.color);
        px(len * 0.4, -0.5, 1, 1, '#fff');
        S.ctx.restore();
      } else if (kind === 'fw') {
        // Firework star: plus-shape that shrinks with life
        const fs = Math.max(1, s * (0.6 + lifeNorm * 0.6));
        px(p.x - fs / 2, p.y - 0.5, fs, 1, p.color);
        px(p.x - 0.5, p.y - fs / 2, 1, fs, p.color);
        if (lifeNorm > 0.5) px(p.x - 1, p.y - 1, 2, 2, '#fff');
      } else if (kind === 'soul') {
        px(p.x - s / 2, p.y - s / 2, s, s, p.color);
        px(p.x - 1, p.y - s - 1, 2, 2, 'rgba(255,255,255,0.45)');
      } else {
        px(p.x - s / 2, p.y - s / 2, s, s, p.color);
        if (s >= 2) px(p.x - 1, p.y - 1, 2, 2, 'rgba(255,255,255,0.25)');
      }
    }
    S.ctx.globalAlpha = 1;
  },

  drawSpawnFlash(spawnPos, flash) {
    if (flash <= 0) return;
    S.ctx.globalAlpha = flash * 0.6;
    S.ctx.strokeStyle = S.C.gold; S.ctx.lineWidth = 2;
    S.ctx.beginPath();
    S.ctx.arc(spawnPos[0], spawnPos[1], 14 + (0.8 - flash) * 20, 0, Math.PI * 2);
    S.ctx.stroke();
    S.ctx.globalAlpha = 1;
  },

  drawWaveBanner(banner, mapH) {
    if (!banner || banner.life <= 0) return;
    const alpha = Math.min(1, banner.life);
    const bx = 192 - 40, by = mapH / 3 - 10;
    S.ctx.globalAlpha = alpha * 0.8;
    px(bx, by, 80, 22, 'rgba(42,42,62,0.85)');
    S.ctx.strokeStyle = S.C.gold; S.ctx.strokeRect(bx, by, 80, 22);
    S.ctx.globalAlpha = alpha;
    S.ctx.fillStyle = S.C.gold; S.ctx.font = 'bold 12px monospace'; S.ctx.textAlign = 'center';
    S.ctx.fillText(banner.text, 192, by + 15);
    S.ctx.globalAlpha = 1;
  },

  drawComboBanner(display) {
    if (!display || display.life <= 0) return;
    const maxL = display.maxLife || 1.2;
    const t = 1 - Math.min(1, display.life / maxL); // 0..1 age
    // Pop in then settle
    const pop = t < 0.15 ? 1 + (0.15 - t) * 2.2 : 1;
    const alpha = Math.min(1, display.life * 1.4);
    const tier = display.tier || 1;
    const cx = 192;
    const cy = 30;
    S.ctx.save();
    S.ctx.globalAlpha = alpha;
    // Expanding ring flash on birth
    if (t < 0.35) {
      const ringA = (1 - t / 0.35) * 0.55;
      S.ctx.globalAlpha = alpha * ringA;
      S.ctx.strokeStyle = tier >= 3 ? '#ff88cc' : S.C.gold;
      S.ctx.lineWidth = 1 + Math.min(2, tier);
      S.ctx.beginPath();
      S.ctx.arc(cx, cy, 12 + t * (40 + tier * 10), 0, Math.PI * 2);
      S.ctx.stroke();
      if (tier >= 2) {
        S.ctx.beginPath();
        S.ctx.arc(cx, cy, 6 + t * (28 + tier * 8), 0, Math.PI * 2);
        S.ctx.stroke();
      }
    }
    S.ctx.globalAlpha = alpha;
    const fontSize = Math.round((tier >= 3 ? 14 : tier >= 2 ? 12 : 10) * pop);
    S.ctx.font = 'bold ' + fontSize + 'px monospace';
    S.ctx.textAlign = 'center';
    // outline
    S.ctx.fillStyle = '#000';
    const tx = display.text || '';
    S.ctx.fillText(tx, cx + 1, cy);
    S.ctx.fillText(tx, cx - 1, cy);
    S.ctx.fillText(tx, cx, cy + 1);
    S.ctx.fillText(tx, cx, cy - 1);
    S.ctx.fillStyle = tier >= 4 ? '#ff66aa' : tier >= 3 ? '#ffcc66' : S.C.gold;
    S.ctx.fillText(tx, cx, cy);
    // small star pips for tier
    if (tier >= 2) {
      S.ctx.font = 'bold 8px monospace';
      S.ctx.fillStyle = S.C.gold;
      const stars = '★'.repeat(Math.min(4, tier));
      S.ctx.fillText(stars, cx, cy + 12);
    }
    S.ctx.restore();
    S.ctx.globalAlpha = 1;
  },

  drawMapPreview(mapId, x, y, w, h, selected) {
    const MAPS_PREVIEW = {
      meadow: ['GGGGGGGG', 'GGDGGGGG', 'GGDGGGGG', 'GGDDDDGG', 'GGGGGDGG', 'GGGGDDGG', 'GGGDDDGG', 'GGGGDDGG'],
      canyon: ['GGGGGGGG', 'GGDDDDGG', 'GGGGGGDG', 'GGWWWGGG', 'GGDGGGDG', 'GGDGGGDD', 'GGGGGDDD', 'GGGGGDDG'],
      ruins:  ['GGGGGGGG', 'GGDDGGGG', 'GGDDGGGG', 'GGGDDGGG', 'GGWWWGGG', 'GGDDGGGG', 'GGGDDDGG', 'GGGGGDDG'],
      rift:   ['GGDDDDGG', 'GGDWWWDG', 'GGDWWWDG', 'GGDWDWDG', 'GGDWWWDG', 'GGDDDDGG', 'GGDGGGDG', 'GGDDDDGG'],
      conflux:['GDDDDDGG', 'GGGGGDGG', 'GDDDDDGG', 'GDGGGWDG', 'GDDDDDGG', 'GGGGGDGG', 'GDDDDDDG', 'GGGGGDDG']
    };
    const rows = MAPS_PREVIEW[mapId] || MAPS_PREVIEW.meadow;
    const tw = w / 8, th = h / rows.length;
    px(x - 1, y - 1, w + 2, h + 2, selected ? S.C.gold : '#444');
    const oldTheme = S.theme;
    S.theme = mapId;
    const p = pal();
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < 8; c++) {
        const ch = rows[r][c] || 'G';
        const col = ch === 'D' ? p.road : ch === 'W' ? '#3a5a7a' : ch === 'B' ? S.C.slot : p.grass[(c + r) % 3];
        px(x + c * tw, y + r * th, Math.ceil(tw), Math.ceil(th), col);
      }
    }
    S.theme = oldTheme;
  },

});
})();
