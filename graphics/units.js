(() => {
'use strict';
const S = window.__TDG_S;
const px = window.TDG.px;
const pal = window.TDG.pal;
Object.assign(window.TDG, {
  drawTowerSprite(t, animTime = 0) {
    const { x, y } = t.slot, lv = t.level, ang = t.angle || 0;
    const fireRec = (t.fireFlash || 0) * 3;
    const hitRec = (t.hitFlash || 0) * 2.5;
    const recoil = fireRec + hitRec * 0.6;
    const flash = Math.max(t.fireFlash || 0, t.hitFlash || 0);
    const idle = Math.sin(animTime * 2 + x * 0.1) * 0.5;
    const dmg = (t.integrity != null && t.maxIntegrity) ? (1 - (t.integrity / t.maxIntegrity)) : 0; // 0..1 damage factor
    px(x - 6, y + 4, 12, 3, 'rgba(0,0,0,0.25)');
    S.ctx.save();
    S.ctx.translate(x, y + idle);

    // 1px outline “shell” so towers read at itch 2× and against busy maps
    const shell = (ox, oy, w, h, fill, edge) => {
      if (edge) px(ox - 1, oy, 1, h, edge);
      if (edge) px(ox + w, oy, 1, h, edge);
      px(ox, oy, w, h, fill);
    };

    if (t.type === 'arrow') {
      shell(-5, -2, 10, 8, '#6a4a2a', '#3a2818');
      px(-4, -6, 8, 5, S.C.arrow);
      px(-3, -5, 6, 3, '#7aa8d0'); // face plate
      if (lv >= 2) {
        px(-7, -3, 2, 6, '#5a3a1a'); px(5, -3, 2, 6, '#5a3a1a'); // limbs wider
        px(-6, -7, 2, 3, S.C.gold); px(-2, -8, 5, 2, '#4a3a2a');
      }
      if (lv >= 3) {
        px(-8, -6, 3, 8, '#4a2a10'); px(5, -6, 3, 8, '#4a2a10');
        px(4, -8, 3, 3, S.C.gold); px(-7, -8, 3, 2, S.C.gold);
        px(-1, -9, 3, 2, '#fff8'); // crest
      }
      S.ctx.rotate(ang);
      px(0 - recoil, -1, 8 + recoil, 2, '#8a6a4a');
      px(6 - recoil, -2, 4, 4, S.C.text);
      if (flash > 0) {
        px(8 - recoil, -3, 4, 4, 'rgba(255,220,100,0.75)');
        px(10 - recoil, -1, 3, 2, 'rgba(255,255,200,0.55)');
      }
      if (dmg > 0.3) px(-3, -4, 1, 4, '#222');
      if (dmg > 0.6) px(2, -5, 2, 1, '#222');
    } else if (t.type === 'cannon') {
      shell(-7, 0, 14, 7, '#5a5a5a', '#2a2a2a');
      px(-5, -4, 10, 5, S.C.cannon);
      if (lv >= 2) {
        px(-8, 0, 16, 3, '#4a4a4a');
        px(-4, -6, 8, 3, '#3a3a3a');
        px(-6, -5, 2, 2, '#888'); px(4, -5, 2, 2, '#888');
      }
      if (lv >= 3) {
        px(-9, -2, 4, 5, S.C.gold); px(5, -2, 4, 5, S.C.gold);
        px(-3, -8, 6, 3, '#2a2a2a');
        px(-1, -9, 2, 2, '#ffaa44'); // fuse glow
      }
      S.ctx.rotate(ang);
      px(-2 - recoil * 1.5, -2, 10 + recoil, 4, '#3a2a1a');
      px(6 - recoil * 1.5, -3, 5, 6, '#2a1a0a');
      if (flash > 0) {
        px(10 - recoil, -4, 6, 6, 'rgba(80,60,40,0.65)');
        px(12 - recoil, -3, 5, 4, 'rgba(255,180,60,0.55)');
        px(14 - recoil, -2, 3, 2, 'rgba(255,240,180,0.5)');
      }
      if (dmg > 0.4) px(-1, 1, 3, 1, '#222');
    } else if (t.type === 'frost') {
      const spin = animTime * 3;
      shell(-5, -3, 10, 9, '#a0d8ef', '#5088a8');
      px(-3, -5, 6, 4, S.C.frost); px(-4, 2, 8, 3, '#70b8d8');
      if (lv >= 2) {
        px(-7, -5, 3, 4, '#c0f0ff'); px(4, -5, 3, 4, '#c0f0ff');
        px(-1, -2, 3, 3, '#e8ffff');
      }
      if (lv >= 3) {
        px(-1, -9, 3, 4, '#fff');
        px(-8, -6, 3, 7, '#9ad0f0'); px(5, -5, 3, 6, '#9ad0f0');
        px(-2, -10, 4, 2, 'rgba(200,240,255,0.7)');
      }
      S.ctx.rotate(ang);
      px(2 - recoil, -1, 6, 2, '#c0e8ff');
      if (flash > 0) {
        px(7, -3, 3, 3, '#fff');
        px(9, -1, 3, 3, '#b0e8ff');
        px(11, 0, 2, 2, 'rgba(255,255,255,0.6)');
      }
      const orb = Math.sin(spin) * 2;
      px(-2 + orb, -8, 2, 2, 'rgba(200,240,255,0.7)');
      if (lv >= 2) px(1 - orb, -7, 2, 2, 'rgba(180,230,255,0.5)');
      if (dmg > 0.35) { px(-4, -4, 1, 3, '#4a6a88'); px(1, 0, 2, 1, '#4a6a88'); }
    } else if (t.type === 'flak') {
      shell(-6, 0, 12, 6, '#5a5a48', '#2a2a20');
      px(-4, -4, 8, 5, S.C.flak);
      if (lv >= 2) {
        px(-8, -4, 4, 4, S.C.gold); px(4, -4, 4, 4, S.C.gold);
        px(-2, -7, 4, 3, '#3a3a28');
      }
      if (lv >= 3) {
        px(-6, -8, 12, 2, '#6a6a58'); // radar dish
        px(-1, -10, 3, 3, '#c9a227');
        px(-7, 2, 3, 3, '#888'); px(4, 2, 3, 3, '#888');
      }
      S.ctx.rotate(ang);
      px(-1 - recoil, -2, 9 + recoil, 3, '#4a4a38');
      px(7 - recoil, -3, 4, 5, '#3a3a28');
      if (lv >= 2) px(-1 - recoil, 1, 7 + recoil, 2, '#3a3a28'); // second barrel
      if (flash > 0) {
        px(10 - recoil, -4, 5, 5, 'rgba(255,220,80,0.65)');
        px(12 - recoil, -2, 3, 3, 'rgba(255,255,200,0.55)');
      }
      if (dmg > 0.5) px(-2, -1, 2, 2, '#222');
    } else {
      // sniper — tall silhouette, long barrel reads as sniper
      shell(-4, -2, 8, 12, S.C.sniper, '#0a0a18');
      px(-3, -10, 6, 9, '#1a1a3a');
      if (lv >= 2) {
        px(-6, -8, 12, 3, '#3a3a5a'); // wide scope
        px(-7, 2, 3, 3, '#2a2a3a'); px(4, 2, 3, 3, '#2a2a3a');
      }
      if (lv >= 3) {
        px(-2, -14, 5, 5, S.C.gold);
        px(-8, -12, 2, 10, '#111');
        px(4, -4, 3, 3, S.C.gold);
        px(-1, -15, 2, 2, '#fff8');
      }
      S.ctx.rotate(ang);
      px(-1 - recoil * 2, -1, 12 + recoil * 2, 2, '#4a4a6a');
      px(9 - recoil * 2, -2, 4, 4, '#2a2a4a');
      if (flash > 0) {
        S.ctx.strokeStyle = 'rgba(255,255,200,0.9)'; S.ctx.lineWidth = 1;
        S.ctx.beginPath(); S.ctx.moveTo(11 - recoil * 2, -1);
        S.ctx.lineTo(18 - recoil * 2, -1); S.ctx.stroke();
        px(14 - recoil * 2, -2, 3, 3, 'rgba(255,255,220,0.5)');
      }
      if (dmg > 0.3) px(-2, 2, 1, 4, '#111');
    }
    S.ctx.restore();
    // Level pip — clearer badge
    const badgeW = lv >= 3 ? 9 : 7;
    px(x - badgeW / 2, y + 5, badgeW, 6, 'rgba(20,20,32,0.75)');
    S.ctx.fillStyle = lv >= 3 ? S.C.gold : S.C.text;
    S.ctx.font = 'bold 6px monospace';
    S.ctx.textAlign = 'center';
    S.ctx.fillText('' + lv, x, y + 10);

    // subtle damage smoke on heavily damaged towers (even before full system)
    if (dmg > 0.65 && Math.sin(animTime * 4 + x) > 0.6) {
      S.ctx.globalAlpha = 0.25 + (dmg - 0.65) * 0.4;
      px(x - 1, y - 11, 2, 2, '#555');
      S.ctx.globalAlpha = 1;
    }
  },

  drawBossSprite(x, y, e, bob, animTime) {
    const v = e.bossVariant || 0;
    const pulse = Math.sin(animTime * 4 + e.id) * 1.5;
    const bt = Math.floor(animTime * 8) % 2;

    if (e.shieldTimer > 0) {
      S.ctx.strokeStyle = 'rgba(100,180,255,0.85)'; S.ctx.lineWidth = 2;
      S.ctx.beginPath(); S.ctx.arc(x, y + bob, e.size + 6 + pulse * 0.3, 0, Math.PI * 2); S.ctx.stroke();
    }
    if (e.regen > 0 && e.hp / e.maxHp < e.regenBelow) {
      S.ctx.strokeStyle = 'rgba(80,220,100,0.5)'; S.ctx.lineWidth = 1;
      S.ctx.beginPath(); S.ctx.arc(x, y + bob, e.size + 4, 0, Math.PI * 2); S.ctx.stroke();
    }

    if (v === 0) {
      px(x - 11, y - 11 + bob, 22, 22, '#4a1838');
      px(x - 9, y - 9 + bob, 18, 18, e.color);
      px(x - 7, y - 16 + bob, 14, 6, '#8b2020');
      px(x - 5, y - 18 + bob, 4, 3, S.C.gold); px(x + 1, y - 18 + bob, 4, 3, S.C.gold);
      px(x - 8, y - 4 + bob, 16, 10, '#6a2848');
      px(x - 2, y - 2 + bob, 2, 2, '#ff6666'); px(x + 1, y - 2 + bob, 2, 2, '#ff6666');
      px(x - 12, y - 2 + bob, 4, 10, '#5a3040');
      px(x + 8, y - 2 + bob, 4, 10, '#5a3040');
      px(x - 9 + bt, y + 6, 4, 4, '#3a1028');
      px(x + 5 - bt, y + 6, 4, 4, '#3a1028');
    } else if (v === 1) {
      S.ctx.globalAlpha = 0.2 + Math.sin(animTime * 6) * 0.1;
      px(x - 12, y - 14 + bob, 24, 26, '#2a0840');
      S.ctx.globalAlpha = 1;
      px(x - 9, y - 10 + bob, 18, 20, '#4a1868');
      px(x - 6, y - 16 + bob, 12, 8, '#1a0828');
      px(x - 3, y - 14 + bob, 6, 5, '#e8e8f0');
      px(x - 1, y - 12 + bob, 2, 2, '#440044');
      px(x - 8, y + 2 + bob, 16, 8, '#5a2080');
      px(x - 2, y - 1 + bob, 2, 2, '#cc66ff'); px(x + 1, y - 1 + bob, 2, 2, '#cc66ff');
      px(x - 10, y - 4 + bob, 3, 3, '#aa44ff');
      px(x + 7, y - 6 + bob, 3, 3, '#aa44ff');
      if (Math.sin(animTime * 5) > 0) {
        px(x - 4, y - 20 + bob + pulse, 2, 2, '#aa66ff');
        px(x + 2, y - 22 + bob - pulse, 2, 2, '#8844cc');
      }
    } else {
      px(x - 12, y - 12 + bob, 24, 24, '#3a2818');
      px(x - 10, y - 10 + bob, 20, 20, '#6a5030');
      px(x - 8, y - 18 + bob, 6, 6, '#4a3820');
      px(x + 2, y - 18 + bob, 6, 6, '#4a3820');
      px(x - 6, y - 16 + bob, 12, 4, S.C.gold);
      px(x - 7, y - 6 + bob, 14, 12, '#5a4028');
      px(x - 3, y - 4 + bob, 6, 5, '#8a6840');
      px(x - 2, y - 2 + bob, 2, 2, '#ffaa44'); px(x + 1, y - 2 + bob, 2, 2, '#ffaa44');
      px(x - 11, y + 2 + bob, 5, 8, '#4a3018');
      px(x + 6, y + 2 + bob, 5, 8, '#4a3018');
      px(x - 10 + bt, y + 8, 20, 3, '#3a2810');
      if (e.shieldTimer > 0) {
        px(x - 13, y - 8 + bob, 3, 16, 'rgba(100,180,255,0.4)');
        px(x + 10, y - 8 + bob, 3, 16, 'rgba(100,180,255,0.4)');
      }
    }
  },

  drawEnemyDeath(e, animTime) {
    const prog = 1 - e.deathTimer / e.deathDur;
    const x = e.deathX;
    const y = e.deathY + prog * prog * 10;
    const alpha = Math.max(0, 1 - prog * 1.15);
    const flash = prog < 0.15 ? 1 - prog / 0.15 : 0;
    const scatter = prog * 14;
    const rot = prog * Math.PI * 0.5 * (e.id % 2 ? 1 : -1);

    S.ctx.save();
    S.ctx.translate(x, y);
    S.ctx.rotate(rot);
    S.ctx.globalAlpha = alpha;

    if (flash > 0) {
      const fs = e.size + 4;
      px(-fs, -fs, fs * 2, fs * 2, 'rgba(255,255,255,' + (flash * 0.7) + ')');
    }

    const fragments = e.type === 'boss' ? 10 : e.type === 'tank' ? 7 : 5;
    for (let i = 0; i < fragments; i++) {
      const ang = (i / fragments) * Math.PI * 2 + e.id;
      const dist = scatter * (0.6 + (i % 3) * 0.2);
      const fx = Math.cos(ang) * dist;
      const fy = Math.sin(ang) * dist - prog * 6;
      const sz = e.type === 'boss' ? 3 + (i % 2) : 2;
      px(fx - sz / 2, fy - sz / 2, sz, sz, i % 2 ? e.color : 'rgba(255,255,255,0.35)');
    }

    if (prog < 0.55) {
      const shrink = 1 - prog * 1.4;
      const s = e.size * shrink;
      if (e.type === 'boss') {
        window.TDG.drawBossSprite(0, 0, e, 0, animTime);
      } else if (e.type === 'grunt') {
        px(-s, -s, s * 2, s * 2, e.color);
        px(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2, '#c04030');
      } else if (e.type === 'flyer') {
        px(-s, -s * 0.5, s * 2, s, e.color);
      } else if (e.type === 'runner') {
        px(-s * 0.6, -s, s * 1.2, s * 2, e.color);
      } else if (e.type === 'armored') {
        px(-s * 1.1, -s, s * 2.2, s * 1.1, e.color);
      } else if (e.type === 'tank') {
        px(-s * 1.4, -s, s * 2.8, s * 1.4, e.color);
      }
    }

    if (prog > 0.35) {
      const ghost = (prog - 0.35) / 0.65;
      S.ctx.globalAlpha = alpha * ghost * 0.5;
      px(-2, -8 - ghost * 12, 4, 4, e.type === 'boss' ? S.C.gold : 'rgba(255,255,255,0.3)');
      px(-1, -10 - ghost * 14, 2, 2, 'rgba(255,255,255,0.45)');
    }

    S.ctx.restore();
    S.ctx.globalAlpha = 1;
  },

  drawEnemySprite(e, getPos, animTime = 0) {
    if (e.dying) {
      window.TDG.drawEnemyDeath(e, animTime);
      return;
    }
    const [x, y] = getPos(e);
    const face = e.facing || 0;
    const lx = Math.cos(face) * 1.2;
    const ly = Math.sin(face) * 0.6;
    if (e.flying) px(x - 4 + lx, y + 22, 8, 2, 'rgba(0,0,0,0.18)');
    const walk = Math.floor((animTime * e.speed * 0.12 + e.id * 0.7) % 4);
    const bob = (walk === 1 || walk === 3) ? -1 : 0;
    const legL = walk === 0 ? 0 : walk === 1 ? 2 : walk === 2 ? 0 : -2;
    const legR = -legL;
    const bx = x + lx, by = y + bob + ly;
    if (e.type === 'runner' && e.speed > 50) {
      px(bx - Math.cos(face) * 5, by + Math.sin(face) * 2, 3, 2, 'rgba(255,255,255,0.12)');
      px(bx - Math.cos(face) * 9, by + Math.sin(face) * 3, 2, 1, 'rgba(255,255,255,0.08)');
    }
    px(bx - e.size, by + e.size - 1, e.size * 2, 2, 'rgba(0,0,0,0.2)');
    if (e.slowTimer > 0) {
      S.ctx.strokeStyle = 'rgba(135,206,235,0.6)'; S.ctx.lineWidth = 1;
      S.ctx.beginPath(); S.ctx.arc(bx, by, e.size + 3, 0, Math.PI * 2); S.ctx.stroke();
    }
    if (e.type === 'grunt') {
      // Stocky square body — slow silhouette
      px(bx - 6, by - 5, 12, 11, '#3a1810');
      px(bx - 5, by - 5, 10, 10, e.color);
      px(bx - 3, by - 3, 6, 6, '#c04030');
      px(bx - 2, by - 2, 2, 2, '#ffe0a0'); px(bx + 1, by - 2, 2, 2, '#ffe0a0');
      px(bx - 1, by + 1, 2, 2, '#8a2018'); // mouth
      px(bx - 4, by + 3 + legL, 3, 3, '#a03020');
      px(bx + 1, by + 3 + legR, 3, 3, '#a03020');
    } else if (e.type === 'flyer') {
      const flap = Math.sin(animTime * 12 + e.id) * 2;
      px(x - 5, y - 3 + bob + flap * 0.3, 10, 4, 'rgba(120,180,255,0.4)');
      px(x - 4, y - 2 + bob, 8, 6, e.color);
      px(x - 3, y - 1 + bob, 6, 3, '#9ad0ff');
      px(x - 7, y - 4 + bob - flap, 5, 3, '#a0d0ff');
      px(x + 2, y - 4 + bob + flap, 5, 3, '#a0d0ff');
      px(x - 1, y + bob, 2, 2, '#fff');
      px(x - 2, y + 3 + bob, 4, 2, 'rgba(160,200,255,0.35)'); // belly glow
    } else if (e.type === 'runner') {
      // Tall thin + motion streak
      px(bx - 4, by - 7, 8, 12, '#5a2018');
      px(bx - 3, by - 6, 6, 10, e.color);
      px(bx - 2, by - 4, 4, 3, '#ffc0a0');
      px(bx - 1, by - 3, 1, 1, '#fff'); // eye
      px(bx - 4, by + 1 + legL, 2, 5, e.color);
      px(bx + 2, by + 1 + legR, 2, 5, e.color);
      if (walk % 2 === 0) px(bx + 3, by - 2, 3, 2, 'rgba(255,255,255,0.35)');
      if (e.speed > 50) {
        px(bx - Math.cos(face) * 6, by, 3, 2, 'rgba(255,200,160,0.2)');
      }
    } else if (e.type === 'armored') {
      px(bx - 7, by - 6, 14, 12, '#3a4048');
      px(bx - 6, by - 5, 12, 10, e.color);
      px(bx - 5, by - 4, 10, 8, '#9aa8b8');
      px(bx - 4, by - 3, 3, 3, '#c0ccd8');
      px(bx + 1, by - 3, 3, 3, '#c0ccd8');
      px(bx - 2, by - 6, 4, 2, '#d0d8e0'); // helm ridge
      px(bx - 5, by + 2 + legL, 2, 4, '#5a6a78');
      px(bx + 3, by + 2 + legR, 2, 4, '#5a6a78');
    } else if (e.type === 'tank') {
      const tread = Math.floor(animTime * 8) % 2;
      px(bx - 9, by - 5, 18, 11, '#2a1008');
      px(bx - 8, by - 5, 16, 10, e.color);
      px(bx - 6, by - 7, 12, 4, '#5a2a1a');
      px(bx - 2, by - 3, 5, 4, '#3a1a0a');
      px(bx + 1, by - 4, 6, 2, '#4a2a18'); // barrel stub
      px(bx - 9, by + 1 + tread, 3, 3, '#4a2a1a');
      px(bx + 6, by + 1 + (1 - tread), 3, 3, '#4a2a1a');
      px(bx - 8, by + 4, 16, 2, '#3a1a0a');
    } else {
      window.TDG.drawBossSprite(bx, by, e, bob, animTime);
    }
    if (e.isMinion) px(bx - 1, by + e.size - 2, 2, 2, '#aa44aa');
    const hpW = e.size * 2 + 4, hpPct = e.hp / e.maxHp;
    px(bx - hpW / 2, by - e.size - 6, hpW, 3, S.C.hpBg);
    px(bx - hpW / 2, by - e.size - 6, hpW * hpPct, 3, S.C.hp);
  },

  drawTowerIcon(type, x, y, sz) {
    const c = S.TT[type].color;
    if (type === 'arrow') { px(x, y + 2, sz, sz - 2, c); px(x + 2, y, sz - 4, 3, c); }
    else if (type === 'cannon') { px(x, y + 4, sz, sz - 4, '#5a5a5a'); px(x + 1, y + 1, sz - 2, 4, c); }
    else if (type === 'frost') { px(x + 1, y + 1, sz - 2, sz - 2, c); px(x + 3, y, 3, 3, '#fff'); }
    else if (type === 'flak') { px(x + 1, y + 3, sz - 2, sz - 4, '#5a5a48'); px(x + 2, y, sz - 4, 4, c); }
    else { px(x + 2, y, sz - 4, sz, c); px(x + 3, y - 2, 2, 4, '#4a4a6a'); }
  },

  drawGhost(selType, slot, range) {
    if (!selType || !slot || slot.tower) return;
    S.ctx.strokeStyle = 'rgba(200,181,96,0.35)'; S.ctx.lineWidth = 1;
    S.ctx.beginPath(); S.ctx.arc(slot.x, slot.y, range, 0, Math.PI * 2); S.ctx.stroke();
    S.ctx.globalAlpha = 0.45;
    window.TDG.drawTowerIcon(selType, slot.x - 6, slot.y - 6, 12);
    S.ctx.globalAlpha = 1;
  },

  drawRangeRing(tower, range) {
    if (!tower) return;
    S.ctx.strokeStyle = 'rgba(200,181,96,0.45)'; S.ctx.lineWidth = 1;
    S.ctx.setLineDash([3, 3]);
    S.ctx.beginPath();
    S.ctx.arc(tower.slot.x, tower.slot.y, range, 0, Math.PI * 2);
    S.ctx.stroke();
    S.ctx.setLineDash([]);
  },

});
})();
