(() => {
'use strict';
const TD = window.TD;

TD.audioCtx = null;
TD.muted = false;
// Chill = low-tension music (no anxiety risers), softer SFX. Persisted.
TD.chillAudio = localStorage.getItem('chillAudio') === '1';
TD.VOL = parseFloat(localStorage.getItem('volume') || '0.3');
TD.MUSIC_VOL = 1.0;
TD.SFX_VOL = TD.chillAudio ? 0.62 : 1.0;
TD._noiseBuf = null;
TD._audioReady = null;

TD.setVolume = function setVolume(v) {
  TD.VOL = Math.max(0, Math.min(1, v));
  localStorage.setItem('volume', TD.VOL.toFixed(2));
};

TD.cycleVolume = function cycleVolume() {
  const steps = [0, 0.12, 0.25, 0.4, 0.6];
  let i = steps.findIndex(s => Math.abs(s - TD.VOL) < 0.05);
  if (i < 0) i = 1;
  TD.setVolume(steps[(i + 1) % steps.length]);
};

/** Apply chill flag to SFX gain + tension. Call after load / toggle. */
TD.applyChillAudio = function applyChillAudio() {
  TD.SFX_VOL = TD.chillAudio && !TD.muted ? 0.62 : 1.0;
  if (TD.chillAudio && TD.run) {
    TD.run.musicTension = Math.min(TD.run.musicTension || 0, 0.2);
    TD.run.musicTensionTier = 0;
    TD._musicTierPrev = 0;
  }
};

/**
 * Mute button 3-state: Sound (S) → Chill (C) → Mute (M) → Sound.
 * Returns mode string: 'normal' | 'chill' | 'muted'
 */
TD.cycleAudioMode = function cycleAudioMode() {
  TD.initAudio();
  if (TD.muted) {
    TD.muted = false;
    TD.chillAudio = false;
  } else if (TD.chillAudio) {
    TD.chillAudio = false;
    TD.muted = true;
  } else {
    TD.chillAudio = true;
  }
  localStorage.setItem('chillAudio', TD.chillAudio ? '1' : '0');
  TD.applyChillAudio();
  if (TD.muted) {
    TD.bus.emit('music:stop');
  } else {
    const st = TD.run && TD.run.state;
    if (st === TD.STATE.PLAYING || st === TD.STATE.PAUSED) {
      TD.bus.emit('music:start');
    }
  }
  return TD.muted ? 'muted' : (TD.chillAudio ? 'chill' : 'normal');
};

TD.getAudioMode = function getAudioMode() {
  if (TD.muted) return 'muted';
  if (TD.chillAudio) return 'chill';
  return 'normal';
};

TD.getAudioModeLabel = function getAudioModeLabel() {
  const m = TD.getAudioMode();
  return m === 'muted' ? 'M' : m === 'chill' ? 'C' : 'S';
};

TD.pitchVar = function pitchVar(base, spread = 0.06) {
  return base * (1 + (Math.random() - 0.5) * spread);
};

TD._getPanFromX = function _getPanFromX(x) {
  if (typeof x !== 'number' || !TD.W) return 0;
  const center = TD.W / 2;
  let p = (x - center) / (TD.W / 2);
  return Math.max(-1, Math.min(1, p));
};

TD._getVolMulForPan = function _getVolMulForPan(pan) {
  // slight distance falloff for more depth
  return 1 - Math.abs(pan) * 0.12;
};

// Simple music ducking for impact (priority 2)
TD.duckMusic = function duckMusic(durationMs = 160, strength = 0.4) {
  if (!TD.musicActive || !TD.audioCtx) return;
  const t = TD.audioCtx.currentTime;
  const target = Math.max(0.15, 1 - strength);

  if (TD._droneGain) {
    const prevDrone = TD._droneGain.gain.value || 0.1;
    TD._droneGain.gain.setTargetAtTime(prevDrone * target, t, 0.015);
    setTimeout(() => {
      if (TD._droneGain && TD.audioCtx) {
        TD._droneGain.gain.setTargetAtTime(prevDrone, TD.audioCtx.currentTime, 0.1);
      }
    }, durationMs);
  }
  if (TD._padGain) {
    const prevPad = TD._padGain.gain.value || 1;
    TD._padGain.gain.setTargetAtTime(prevPad * target, t, 0.015);
    setTimeout(() => {
      if (TD._padGain && TD.audioCtx) {
        TD._padGain.gain.setTargetAtTime(prevPad, TD.audioCtx.currentTime, 0.1);
      }
    }, durationMs);
  }
};

TD._ambient = null;

TD.startAmbient = function startAmbient(mapId) {
  TD.stopAmbient();
  if (TD.muted || !TD.audioCtx) return;
  const ctx = TD.audioCtx;
  const gain = ctx.createGain();
  gain.gain.value = 0.035 * TD.VOL;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  let source;
  let isNoise = false;

  if (mapId === 'conflux') {
    // subtle purple-space hum (reuse noise with darker filter)
  } else if (mapId === 'canyon') {
    // wind - noise
    TD.ensureNoiseBuf();
    source = ctx.createBufferSource();
    source.buffer = TD._noiseBuf;
    source.loop = true;
    isNoise = true;
    filter.frequency.value = 650;
  } else if (mapId === 'ruins') {
    // eerie low
    source = ctx.createOscillator();
    source.type = 'sine';
    source.frequency.value = 48;
    filter.frequency.value = 320;
  } else {
    // meadow - soft air
    source = ctx.createOscillator();
    source.type = 'sine';
    source.frequency.value = 95;
    filter.frequency.value = 950;
  }

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  if (isNoise) {
    source.start();
  } else {
    source.start();
  }

  TD._ambient = { source, gain, filter, mapId, isNoise };
};

TD.stopAmbient = function stopAmbient() {
  if (!TD._ambient || !TD.audioCtx) { TD._ambient = null; return; }
  const { source, gain, filter } = TD._ambient;
  try {
    if (gain) gain.gain.setTargetAtTime(0, TD.audioCtx.currentTime, 0.04);
    if (source) {
      setTimeout(() => {
        try {
          if (source.stop) source.stop();
          if (source.disconnect) source.disconnect();
        } catch(e){}
      }, 80);
    }
    if (filter && filter.disconnect) filter.disconnect();
    if (gain && gain.disconnect) gain.disconnect();
  } catch(e){}
  TD._ambient = null;
};

TD.ensureNoiseBuf = function ensureNoiseBuf() {
  if (TD._noiseBuf || !TD.audioCtx) return;
  const sr = TD.audioCtx.sampleRate;
  TD._noiseBuf = TD.audioCtx.createBuffer(1, Math.ceil(sr * 0.12), sr);
  const d = TD._noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
};

TD.ensureAudio = function ensureAudio() {
  if (!TD.audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    TD.audioCtx = new Ctx({ latencyHint: 'interactive' });
    TD._audioReady = TD.audioCtx.resume();
    TD.ensureNoiseBuf();
    const warm = TD.audioCtx.createBufferSource();
    warm.buffer = TD.audioCtx.createBuffer(1, 1, TD.audioCtx.sampleRate);
    warm.connect(TD.audioCtx.destination);
    warm.start(0);
  } else if (TD.audioCtx.state === 'suspended') {
    TD._audioReady = TD.audioCtx.resume();
  }
  return TD._audioReady || Promise.resolve();
};

TD.initAudio = function initAudio() {
  TD.ensureAudio();
};

TD._playAt = function _playAt(fn) {
  if (TD.muted || !TD.audioCtx) return;
  const run = () => fn(TD.audioCtx.currentTime);
  if (TD.audioCtx.state === 'running') run();
  else TD.ensureAudio().then(run);
};

TD._toneAt = function _toneAt(t, freq, dur, type, vol, pan = 0) {
  const o = TD.audioCtx.createOscillator(), g = TD.audioCtx.createGain();
  const p = TD.audioCtx.createStereoPanner();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  p.pan.value = Math.max(-1, Math.min(1, pan));
  o.connect(g);
  g.connect(p);
  p.connect(TD.audioCtx.destination);
  o.start(t);
  o.stop(t + dur);
};

TD._noiseAt = function _noiseAt(t, dur, vol, pan = 0) {
  TD.ensureNoiseBuf();
  const src = TD.audioCtx.createBufferSource(), g = TD.audioCtx.createGain();
  const p = TD.audioCtx.createStereoPanner();
  src.buffer = TD._noiseBuf;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  p.pan.value = Math.max(-1, Math.min(1, pan));
  src.connect(g);
  g.connect(p);
  p.connect(TD.audioCtx.destination);
  src.start(t, 0, dur);
};

TD.playTone = function playTone(freq, dur, type = 'square', vol = TD.VOL, pan = 0) {
  TD.initAudio();
  if (TD.muted || !TD.audioCtx) return;
  const speed = (TD.run && TD.run.speedMul) || 1;
  const adjDur = dur / Math.max(1, speed);
  const adjFreq = freq * (1 + Math.max(0, speed - 1) * 0.08);
  const finalVol = vol * TD.SFX_VOL * TD.VOL;
  TD._playAt(t => TD._toneAt(t, adjFreq, adjDur, type, finalVol, pan));
};

TD.playNoise = function playNoise(dur, vol = TD.VOL * 0.5, pan = 0) {
  TD.initAudio();
  if (TD.muted || !TD.audioCtx) return;
  const speed = (TD.run && TD.run.speedMul) || 1;
  const adjDur = dur / Math.max(1, speed);
  const finalVol = vol * TD.SFX_VOL * TD.VOL;
  TD._playAt(t => TD._noiseAt(t, adjDur, finalVol, pan));
};

TD.playSweep = function playSweep(f0, f1, dur, type = 'sawtooth', vol = TD.VOL, pan = 0) {
  TD.initAudio();
  if (TD.muted || !TD.audioCtx) return;
  const speed = (TD.run && TD.run.speedMul) || 1;
  const adjDur = dur / Math.max(1, speed);
  const adjF0 = f0 * (1 + Math.max(0, speed - 1) * 0.08);
  const adjF1 = f1 * (1 + Math.max(0, speed - 1) * 0.08);
  const finalVol = vol * TD.SFX_VOL * TD.VOL;
  TD._playAt(t => {
    const o = TD.audioCtx.createOscillator(), g = TD.audioCtx.createGain();
    const p = TD.audioCtx.createStereoPanner();
    o.type = type;
    o.frequency.setValueAtTime(adjF0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, adjF1), t + adjDur);
    g.gain.setValueAtTime(finalVol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + adjDur);
    p.pan.value = Math.max(-1, Math.min(1, pan));
    o.connect(g);
    g.connect(p);
    p.connect(TD.audioCtx.destination);
    o.start(t);
    o.stop(t + adjDur);
  });
};

TD.SFX = {
  arrow: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan);
    TD.playTone(TD.pitchVar(820, 0.05), 0.035, 'square', v * 0.85, pan); // sharp attack
    TD.playNoise(0.018, v * 0.4, pan); // whoosh/impact layer
  },
  cannon: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan);
    TD.playNoise(0.09, v * 0.9, pan); // boom
    TD.playTone(TD.pitchVar(95), 0.14, 'sine', v * 0.8, pan);
    TD.playTone(TD.pitchVar(55), 0.18, 'sine', v * 0.5, pan); // sub
  },
  build: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD.SFX_VOL * TD._getVolMulForPan(pan);
    [440, 554, 659, 880].forEach((f, i) => setTimeout(() => TD.playTone(f, 0.12, 'sine', v * 0.6, pan), i * 70));
    TD.playNoise(0.05, v * 0.3, pan);
  },
  upgrade: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD.SFX_VOL * TD._getVolMulForPan(pan) * 0.55;
    TD.initAudio();
    if (TD.muted || !TD.audioCtx) return;
    TD._playAt(t => [554, 698, 880].forEach((f, i) => TD._toneAt(t + i * 0.07, f, 0.09, 'sine', v, pan)));
  },
  sell: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD.SFX_VOL * TD._getVolMulForPan(pan);
    TD.initAudio();
    if (TD.muted || !TD.audioCtx) return;
    TD._playAt(t => {
      TD._noiseAt(t, 0.05, v * 0.2, pan);
      TD._toneAt(t, 380, 0.06, 'sine', v * 0.4, pan);
      TD._toneAt(t + 0.07, 280, 0.08, 'sine', v * 0.35, pan);
    });
  },
  kill: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan);
    const t = opts.type || '';
    const base = t === 'boss' ? 60 : (t === 'tank' ? 95 : 130);
    TD.playTone(TD.pitchVar(base), 0.05, 'sine', v * 0.35, pan);
    TD.playNoise(0.03, v * 0.25, pan);
  },
  hit: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan) * 0.65;
    const t = opts.type || 'arrow';
    if (t === 'cannon') {
      TD.playNoise(0.08, v * 1.1, pan);
      TD.playTone(TD.pitchVar(90), 0.12, 'sine', v * 0.9, pan);
    } else if (t === 'sniper') {
      TD.playNoise(0.02, v * 0.6, pan);
      TD.playTone(TD.pitchVar(280, 0.08), 0.035, 'square', v, pan);
    } else {
      TD.playNoise(0.025, v * 0.7, pan);
      TD.playTone(TD.pitchVar(550, 0.1), 0.025, 'square', v, pan);
    }
  },
  baseHit: (opts = {}) => {
    const hp = opts.hp || 20;
    const severity = Math.max(0.3, (20 - hp) / 20); // more painful when low hp
    TD.duckMusic(140 + severity * 100, 0.5 + severity * 0.2);
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan);
    TD.playTone(150 + severity * 40, 0.18 + severity * 0.1, 'sawtooth', v * (1 + severity * 0.3), pan);
    if (severity > 0.5) TD.playNoise(0.08, v * 0.4, pan);
  },
  lowHp: () => {
    TD.duckMusic(400, 0.5);
    TD.initAudio();
    if (TD.muted || !TD.audioCtx) return;
    TD._playAt(t => {
      TD._toneAt(t, 180, 0.18, 'sawtooth', TD.VOL * 0.6);
      TD._toneAt(t + 0.12, 140, 0.22, 'sawtooth', TD.VOL * 0.5);
      TD._noiseAt(t + 0.05, 0.25, TD.VOL * 0.2);
    });
  },
  waveStart: () => {
    TD.duckMusic(150, 0.25);
    TD.playSweep(280, 620, 0.12, 'sine', TD.VOL * 0.35);
    TD.playSweep(180, 420, 0.18, 'sawtooth', TD.VOL * 0.2);
    TD.playNoise(0.09, TD.VOL * 0.18);
  },
  bossWarn: () => {
    TD.duckMusic(350, 0.45);
    TD.initAudio();
    if (TD.muted || !TD.audioCtx) return;
    const v = TD.VOL * 0.8;
    TD._playAt(t => {
      TD._noiseAt(t, 1.1, v * 0.35);
      // rising sweeps for tension build
      const mk = (at, f0, f1, dur=0.4) => {
        const o = TD.audioCtx.createOscillator(), g = TD.audioCtx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0, t + at);
        o.frequency.exponentialRampToValueAtTime(f1, t + at + dur);
        g.gain.setValueAtTime(v * 0.6, t + at);
        g.gain.exponentialRampToValueAtTime(0.001, t + at + dur + 0.1);
        o.connect(g);
        g.connect(TD.audioCtx.destination);
        o.start(t + at);
        o.stop(t + at + dur + 0.2);
      };
      mk(0, 80, 140, 0.5);
      mk(0.2, 95, 160, 0.45);
      mk(0.45, 70, 180, 0.6);
    });
  },
  bossSpawn: () => {
    TD.duckMusic(300, 0.7);
    const v = TD.VOL * 0.85;
    TD.playNoise(0.12, v * 0.65);
    TD.playSweep(90, 45, 0.5, 'sine', v * 0.7);
    TD.playSweep(180, 50, 0.45, 'sawtooth', v * 0.45);
  },
  win: () => {
    TD.duckMusic(200, 0.3); // in case music still fading
    // emotional rising major-ish resolution
    const notes = [523, 659, 784, 1047, 1318];
    notes.forEach((f, i) => setTimeout(() => TD.playTone(f, 0.28, 'sine', TD.VOL * 0.7), i * 120));
    setTimeout(() => TD.playSweep(523, 1318, 0.8, 'sine', TD.VOL * 0.4), 600);
  },
  lose: () => {
    // sad descending minor feel
    const notes = [440, 392, 349, 294, 262];
    notes.forEach((f, i) => setTimeout(() => TD.playTone(f, 0.35, 'sawtooth', TD.VOL * 0.65), i * 180));
    setTimeout(() => TD.playSweep(440, 220, 1.0, 'sawtooth', TD.VOL * 0.35), 500);
  },
  noGold: () => TD.playTone(200, 0.06, 'sawtooth', TD.VOL * 0.6),
  // Tower vulnerability SFX (placeholders, called only when TOWER_DAMAGE_ENABLED)
  towerHit: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan) * 0.7;
    TD.playTone(TD.pitchVar(380, 0.08), 0.06, 'square', v, pan);
    TD.playNoise(0.04, v * 0.5, pan);
  },
  towerDestroy: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan);
    TD.duckMusic(280, 0.65);
    TD.playNoise(0.14, v * 0.9, pan);
    TD.playTone(120, 0.22, 'sawtooth', v * 1.0, pan);
    TD.playSweep(180, 60, 0.5, 'sine', v * 0.5, pan);
  },
  reflect: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan) * 0.8;
    TD.playTone(880, 0.04, 'square', v, pan);
    TD.playTone(TD.pitchVar(1320, 0.1), 0.035, 'sine', v * 0.6, pan);
  },
  bossKill: (opts = {}) => {
    TD.duckMusic(220, 0.65);
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan);
    TD.playNoise(0.12, v * 0.7, pan);
    TD.playTone(80, 0.2, 'sine', v * 1.1, pan);
  },
  combo: () => {
    TD.duckMusic(80, 0.25);
    TD.playTone(660 + Math.random() * 80, 0.05, 'sine', TD.VOL * 0.5);
  },
  anticipate: (opts = {}) => {
    const pan = 0; // centered for wave events
    const v = TD.VOL * 0.18;
    TD.playSweep(340 + Math.random()*30, 500, 0.055, 'sine', v, pan);
    if (Math.random() < 0.35) TD.playNoise(0.035, v * 0.5, pan);
  },
  flak: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan);
    TD.playNoise(0.04, v * 0.6, pan); // burst
    TD.playTone(TD.pitchVar(240, 0.08), 0.045, 'square', v * 0.7, pan);
  },
  frost: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan);
    TD.playTone(TD.pitchVar(920, 0.04), 0.04, 'sine', v * 0.5, pan);
    TD.playNoise(0.02, v * 0.3, pan); // freeze crackle
  },
  sniper: (opts = {}) => {
    const pan = TD._getPanFromX(opts.x);
    const v = TD.VOL * TD._getVolMulForPan(pan);
    TD.playNoise(0.02, v * 0.5, pan);
    TD.playTone(TD.pitchVar(210, 0.03), 0.07, 'sine', v, pan);
    TD.playTone(TD.pitchVar(420), 0.025, 'square', v * 0.4, pan); // high click
  }
};

TD.musicId = null;
TD.musicActive = false;
TD.musicStep = 0;
TD._droneOsc = null;
TD._droneGain = null;
TD.MELODY = [262, 330, 392, 523, 392, 330, 294, 330, 262, 294, 349, 392];
TD.MUSIC_CFG = [
  { interval: 300, vol: 0.12, droneVol: 0, droneFreq: 55, droneType: 'sine' },
  { interval: 260, vol: 0.14, droneVol: 0.04, droneFreq: 55, droneType: 'sine' },
  { interval: 220, vol: 0.16, droneVol: 0.07, droneFreq: 65, droneType: 'sine' },
  { interval: 180, vol: 0.18, droneVol: 0.10, droneFreq: 75, droneType: 'sawtooth' }
];

// === New multi-track music system (Alan Walker-inspired melodic electronic) ===
// Fully procedural. Each track has its own motifs + character.
// Map picks randomly from its pool on start so replays differ.
TD.MUSIC_TRACKS = {
  // Distinct Alan Walker-style motifs — not just key shifts. Different shapes, rhythms, feels.
  'meadow-1': {
    id: 'meadow-1', name: 'Meadow Bloom',
    baseInterval: 275, volMul: 0.96,
    // Uplifting long-ish phrase with gentle rises (hopeful supersaw ballad feel)
    notes: [262, 294, 330, 392, 440, 392, 349, 330, 392, 349, 294, 330],
    arpOffsets: [0, 4, 7, 12, 16, 12, 7],   // soft 3rd/4th emphasis
    bassNote: 65, padDetune: 0.011
  },
  'meadow-2': {
    id: 'meadow-2', name: 'Meadow Drift',
    baseInterval: 305, volMul: 1.0,
    // Flowing, slightly wandering melodic line (more sustained emotional)
    notes: [220, 262, 311, 349, 392, 349, 311, 262, 294, 330, 262, 220],
    arpOffsets: [0, 7, 11, 14, 7, 4],
    bassNote: 55, padDetune: 0.008
  },
  'canyon-1': {
    id: 'canyon-1', name: 'Canyon Drive',
    baseInterval: 235, volMul: 1.08,
    // Driving, powerful — bigger leaps, more "epic" repeated motif with punch
    notes: [196, 220, 294, 330, 392, 330, 294, 220, 247, 294, 330, 392],
    arpOffsets: [0, 12, 7, 19, 12, 0, 7],  // wide dramatic intervals
    bassNote: 49, padDetune: 0.016
  },
  'ruins-1': {
    id: 'ruins-1', name: 'Ruins Echo',
    baseInterval: 290, volMul: 0.91,
    // Haunting, slower minor motif with long sustains and eerie intervals (classic AW dark)
    notes: [196, 233, 277, 311, 349, 311, 277, 233, 262, 233, 196, 233],
    arpOffsets: [0, 3, 7, 10, 7, 3, 12],
    bassNote: 46, padDetune: 0.019
  },
  'ruins-2': {
    id: 'ruins-2', name: 'Ruins Pulse',
    baseInterval: 255, volMul: 0.97,
    // Tense pulsing hook — short memorable 5-note idea (more "Faded" hook-like)
    notes: [208, 247, 277, 349, 311, 277, 247, 208, 262, 311, 277, 247],
    arpOffsets: [0, 5, 12, 7, 3, 10],     // tight rhythmic feel
    bassNote: 52, padDetune: 0.013
  },
  // Extra fundamentally different one (bright fast arpeggiated "spectre" energy)
  'meadow-3': {
    id: 'meadow-3', name: 'Meadow Rise',
    baseInterval: 195, volMul: 0.93,
    notes: [330, 392, 440, 523, 494, 440, 392, 349, 392, 440, 392, 330],
    arpOffsets: [0, 12, 7, 19, 12, 7, 4],  // fast wide arps, energetic
    bassNote: 62, padDetune: 0.010
  },
  // New chord-based track using user progression: G#m D#m E C#m (Alan Walker emotional chords)
  'chords-gm': {
    id: 'chords-gm', name: 'Faded Echoes',
    baseInterval: 265, volMul: 0.94,
    // Chord progression (roots for bass/lead reference)
    notes: [208, 311, 330, 277, 311, 330, 277, 208],
    arpOffsets: [0, 4, 7, 12],
    bassNote: 52,
    padDetune: 0.009,
    // Full chords for rich supersaw pads (G#m, D#m, E, C#m)
    chords: [
      [208, 247, 311],   // G#m  G# B D#
      [311, 370, 233],   // D#m  D# F# A#
      [330, 415, 247],   // E    E  G# B
      [277, 330, 208]    // C#m  C# E G#
    ]
  },
  // The Drum - Alan Walker style: Am — F — C — G
  // Right hand triads + strong pulsating root bass (A -> F -> C -> G)
  'the-drum': {
    id: 'the-drum', name: 'The Drum',
    baseInterval: 220, volMul: 0.96,   // slightly faster, drum-like pulse
    notes: [220, 262, 330, 392, 262, 330, 392, 220], // fallback / lead
    arpOffsets: [0, 7, 12, 4],
    bassNote: 220,
    padDetune: 0.008,
    pulsingBass: true,                 // special rhythmic bass hits
    // Chords: Am F C G
    chords: [
      [220, 262, 330],   // Am: A C E
      [175, 220, 262],   // F : F A C   (F3 for weight)
      [262, 330, 392],   // C : C E G
      [196, 247, 294]    // G : G B D
    ]
  },
  // Unity (Alan Walker / TheFatRat style): Dm — Bb — F — C
  'unity': {
    id: 'unity', name: 'Unity',
    baseInterval: 245, volMul: 0.95,
    // Scale notes for reference (D minor): D E F G A Bb C
    notes: [294, 330, 349, 392, 440, 466, 262],
    arpOffsets: [0, 7, 12, 4, 9],
    bassNote: 147,
    padDetune: 0.009,
    // Chords for pads (right hand triads)
    // Dm: D F A, Bb: Bb D F, F: F A C, C: C E G
    chords: [
      [294, 349, 440],   // Dm: D F A  (D4 F4 A4 for pad, bass uses *0.5 for low)
      [233, 294, 349],   // Bb: Bb D F
      [175, 220, 262],   // F : F A C
      [262, 330, 392]    // C : C E G
    ]
  },
  // Faded - Alan Walker (original key D#m)
  // Progression D#m - B - F# - C# throughout
  'faded': {
    id: 'faded', name: 'Faded',
    baseInterval: 270, volMul: 0.92,
    // Notes for lead reference (D# minor focus on F# D# A#)
    notes: [370, 311, 466, 277, 349, 415],
    arpOffsets: [0, 7, 12],
    bassNote: 311,
    padDetune: 0.011,
    // Chords (right hand triads)
    chords: [
      [311, 370, 466],   // D#m: D# F# A#
      [247, 311, 370],   // B:   B D# F#
      [370, 466, 554],   // F#:  F# A# C#  (C#5)
      [277, 349, 415]    // C#:  C# F G#
    ]
  }
};

TD.MAP_MUSIC = {
  meadow: ['meadow-1', 'meadow-2', 'meadow-3', 'the-drum', 'unity', 'faded'],
  canyon: ['canyon-1'],
  ruins: ['ruins-1', 'ruins-2', 'chords-gm', 'faded'],
  rift: ['ruins-1', 'faded', 'chords-gm'],
  conflux: ['ruins-2', 'faded', 'the-drum', 'unity']
};

TD.selectMusicTrack = function selectMusicTrack(mapId) {
  const pool = TD.MAP_MUSIC[mapId] || ['meadow-1'];
  return pool[Math.floor(Math.random() * pool.length)];
};

TD.getCurrentMusicTrack = function getCurrentMusicTrack() {
  return TD.run && TD.run.musicTrack ? TD.MUSIC_TRACKS[TD.run.musicTrack] : null;
};

TD.lerpMusicCfg = function lerpMusicCfg(t) {
  const clamped = Math.max(0, Math.min(3, t));
  const i = Math.floor(clamped);
  const f = clamped - i;
  const a = TD.MUSIC_CFG[i];
  const b = TD.MUSIC_CFG[Math.min(3, i + 1)];
  const mix = (ka, kb) => ka + (kb - ka) * f;
  return {
    interval: mix(a.interval, b.interval),
    vol: mix(a.vol, b.vol),
    droneVol: mix(a.droneVol, b.droneVol),
    droneFreq: mix(a.droneFreq, b.droneFreq),
    droneType: f < 0.5 ? a.droneType : b.droneType
  };
};

TD._ensureDrone = function _ensureDrone() {
  if (TD._droneOsc || !TD.audioCtx) return;
  const ctx = TD.audioCtx;
  TD._droneOsc = ctx.createOscillator();
  TD._droneGain = ctx.createGain();
  TD._droneOsc.type = 'sine';
  TD._droneOsc.frequency.value = 55;
  TD._droneGain.gain.value = 0;
  TD._droneOsc.connect(TD._droneGain);
  TD._droneGain.connect(ctx.destination);
  TD._droneOsc.start();
};

TD._setDrone = function _setDrone(cfg) {
  if (!TD._droneOsc || !TD.audioCtx || TD.muted) {
    if (TD._droneGain) TD._droneGain.gain.setTargetAtTime(0, TD.audioCtx?.currentTime || 0, 0.05);
    return;
  }
  const t = TD.audioCtx.currentTime;
  const vol = cfg.droneVol * TD.VOL;
  TD._droneOsc.type = cfg.droneType;
  TD._droneGain.gain.setTargetAtTime(vol, t, 0.08);
  TD._droneOsc.frequency.setTargetAtTime(cfg.droneFreq, t, 0.08);
};

TD._stopDrone = function _stopDrone() {
  if (TD._droneGain && TD.audioCtx) {
    try { TD._droneGain.gain.setTargetAtTime(0, TD.audioCtx.currentTime, 0.03); } catch(e){}
  }
  if (TD._droneOsc) {
    try { TD._droneOsc.stop(); TD._droneOsc.disconnect(); } catch(e){}
    TD._droneOsc = null;
  }
};

// --- Rich music helpers (new engine) ---
TD._musicTierPrev = 0;
TD._padGain = null; // for light sidechain ducking

TD._ensurePadGain = function _ensurePadGain() {
  if (TD._padGain || !TD.audioCtx) return;
  TD._padGain = TD.audioCtx.createGain();
  TD._padGain.gain.value = 0;
  TD._padGain.connect(TD.audioCtx.destination);
};

TD._playPadChord = function _playPadChord(rootHz, tension, track) {
  if (!TD.audioCtx || TD.muted) return;
  const t = TD.audioCtx.currentTime + 0.005;
  let det = track.padDetune || 0.012;
  let dur = 0.82 + Math.min(0.95, tension * 0.38);
  let v = TD.VOL * TD.MUSIC_VOL * (track.volMul || 0.95) * (0.044 + tension * 0.018);
  if (TD.chillAudio) v *= 0.7;

  // ensure a pad bus exists for sidechain
  TD._ensurePadGain();
  if (TD._padGain.gain.value < 0.6) TD._padGain.gain.value = 1;

  // === High tension = CLEANER sound (less mud) ===
  // Thinner pads, less detune, higher starting filter, stronger pumping sidechain
  let numVoices = 3;
  let padRoot = rootHz;
  if (tension > 1.8) {
    numVoices = 2;                    // drop one voice for clarity
    det *= 0.65;                      // tighter, less "smeared"
    v *= 0.78;                        // pads sit back
    padRoot = rootHz * 1.5;           // higher register = less low mud
    dur *= 0.82;
  }

  for (let i = -1; i < numVoices - 1; i++) {   // 2 or 3 voices
    const o = TD.audioCtx.createOscillator();
    const g = TD.audioCtx.createGain();
    const f = TD.audioCtx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.value = padRoot * (1 + i * det);
    f.type = 'lowpass';
    // more open filter + slight extra brightness at high t for "clean air"
    f.frequency.value = (tension > 1.8 ? 950 : 680) + tension * 1550;
    f.Q.value = 0.65;

    const att = 0.085 + tension * 0.02;
    g.gain.value = v * (0.9 + i * 0.015);
    g.gain.setTargetAtTime(v * 0.48, t + att, 0.24);

    o.connect(f); f.connect(g);

    // Stronger rhythmic sidechain duck at high tension = breathing room / clarity
    const duck = (tension > 1.8) ? Math.max(0.28, 0.58 - tension * 0.11) : Math.max(0.42, 0.72 - tension * 0.12);
    TD._padGain.gain.setTargetAtTime(duck, t, 0.016);
    setTimeout(() => {
      if (TD._padGain && TD.audioCtx) TD._padGain.gain.setTargetAtTime(1.0, TD.audioCtx.currentTime, 0.17);
    }, 85);

    g.connect(TD._padGain);
    o.start(t);
    o.stop(t + dur + 0.5);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.38);
  }
};

// Chord supersaw player for progression tracks (G#m D#m E C#m etc.)
// Plays each note of the chord as a small detuned cluster → big emotional pads
TD._playChordVoices = function _playChordVoices(chordNotes, tension, track) {
  if (!TD.audioCtx || TD.muted || !chordNotes || !chordNotes.length) return;
  const t = TD.audioCtx.currentTime + 0.003;
  const det = (track.padDetune || 0.01) * (tension > 1.7 ? 0.6 : 1.0); // cleaner at high t
  const baseDur = 1.1 + Math.min(0.9, tension * 0.35);
  const volBase = TD.VOL * TD.MUSIC_VOL * (track.volMul || 0.94) * (0.038 + tension * 0.015);

  TD._ensurePadGain();
  if (TD._padGain.gain.value < 0.7) TD._padGain.gain.value = 1.0;

  chordNotes.forEach((hz, idx) => {
    // 2 voices per chord tone for width (less than single-root pads to stay clean)
    for (let v = 0; v < 2; v++) {
      const o = TD.audioCtx.createOscillator();
      const g = TD.audioCtx.createGain();
      const f = TD.audioCtx.createBiquadFilter();

      o.type = 'sawtooth';
      const spread = (v - 0.5) * det * 1.6;
      o.frequency.value = hz * (1 + spread);

      f.type = 'lowpass';
      f.frequency.value = 820 + tension * 1600;
      f.Q.value = 0.6;

      const vvol = volBase * (0.85 - idx * 0.04);
      g.gain.value = vvol;
      g.gain.setTargetAtTime(vvol * 0.55, t + 0.06, 0.32);

      o.connect(f);
      f.connect(g);
      g.connect(TD._padGain);

      // Strong sidechain on chord hits for clarity and AW pump
      const duck = tension > 1.8 ? 0.32 : 0.55;
      TD._padGain.gain.setTargetAtTime(duck, t, 0.015);
      setTimeout(() => {
        if (TD._padGain && TD.audioCtx) TD._padGain.gain.setTargetAtTime(1.0, TD.audioCtx.currentTime, 0.22);
      }, 90);

      const dur = baseDur * (0.95 + (idx % 2) * 0.08);
      o.start(t);
      o.stop(t + dur + 0.7);
      g.gain.setTargetAtTime(0.0001, t + dur * 0.95, 0.5);
    }
  });
};

// Pulsating root bass for "The Drum" style (Alan Walker - The Drum)
// Short punchy hits on the current chord root (A -> F -> C -> G), rhythmic like a kick + bass
TD._playPulsingBass = function _playPulsingBass(rootHz, tension, track) {
  if (!TD.audioCtx || TD.muted) return;
  const t = TD.audioCtx.currentTime + 0.002;
  const dur = 0.18 + (tension * 0.04);   // short and punchy
  const v = TD.VOL * (track.volMul || 0.95) * (0.55 + tension * 0.1);

  // Main low sine for body + slight saw for click (drum feel)
  TD._playAt(tt => {
    // body
    const o1 = TD.audioCtx.createOscillator();
    const g1 = TD.audioCtx.createGain();
    o1.type = 'sine';
    o1.frequency.value = rootHz * 0.5;   // sub octave for weight
    g1.gain.value = v * 0.9;
    g1.gain.setTargetAtTime(0.001, tt + dur * 0.7, 0.12);

    o1.connect(g1);
    g1.connect(TD.audioCtx.destination);
    o1.start(tt);
    o1.stop(tt + dur + 0.15);

    // attack click / drum transient
    const o2 = TD.audioCtx.createOscillator();
    const g2 = TD.audioCtx.createGain();
    const f2 = TD.audioCtx.createBiquadFilter();
    o2.type = 'sawtooth';
    o2.frequency.value = rootHz * 1.02;
    f2.type = 'lowpass';
    f2.frequency.value = 420;
    g2.gain.value = v * 0.45;
    g2.gain.setTargetAtTime(0.001, tt + 0.06, 0.08);

    o2.connect(f2);
    f2.connect(g2);
    g2.connect(TD.audioCtx.destination);
    o2.start(tt);
    o2.stop(tt + 0.09);
  });
};

TD._playLeadNote = function _playLeadNote(track, step, tension) {
  if (!TD.audioCtx || TD.muted) return;

  let hz;
  const offs = track.arpOffsets || [0, 7, 12];

  if (track.chords && track.chords.length) {
    // For chord tracks: pick a tone from the current chord for melodic top line
    const div = (track.id === 'the-drum') ? 5 : (track.id === 'unity' || track.id === 'faded') ? 6 : 7;
    const chordIdx = Math.floor(step / div) % track.chords.length;
    const chord = track.chords[chordIdx];

    let toneIdx = (step + Math.floor(tension * 1.2)) % chord.length;

    // Unity special: melodic line mostly plays A, F, D leaning on current tonic
    if (track.id === 'unity') {
      // Preferred emphasis notes: A, F, D (supporting octaves for Dm Bb F C)
      const prefs = [220, 440, 175, 349, 294, 147];
      // Try to pick a preferred note that exists in this chord
      let chosen = null;
      for (const p of prefs) {
        if (chord.includes(p)) { chosen = p; break; }
      }
      if (chosen && Math.random() < 0.65) {
        hz = chosen;
      } else {
        hz = chord[toneIdx];
      }
      // Sometimes jump to the tonic/root of the chord for stability
      if ((step % 4) === 0) hz = chord[0];
    } else if (track.id === 'faded') {
      // Faded: famous piano/synth motif F# F# F# D# D# D# on D#m
      // Chorus emphasizes F#, D#, A#
      const fsharp = 370;
      const dsharp = 311;
      const asharp = 466;
      const csharpHigh = 554;
      const prefs = [fsharp, dsharp, asharp, 247, 311, 370, csharpHigh];

      if (chordIdx === 0) { // D#m chord - play the iconic repeating motif
        const motif = [fsharp, fsharp, fsharp, dsharp, dsharp, dsharp];
        hz = motif[step % motif.length];
      } else {
        // On other chords, bias toward F# D# A# (chorus "where are you now")
        let chosen = null;
        for (const p of prefs) {
          if (chord.includes(p)) { chosen = p; break; }
        }
        if (chosen && Math.random() < 0.7) {
          hz = chosen;
        } else {
          hz = chord[toneIdx];
        }
      }
      // occasional lift to upper chord note
      if ((step % 6) === 0) hz *= 2;
    } else {
      hz = chord[toneIdx];
    }

    // occasional octave up or nice AW-style lift
    if ((step % 5) === 0) hz *= 2;
  } else {
    const notes = track.notes || TD.MELODY;
    hz = notes[step % notes.length];
    const oIdx = (step + Math.floor(tension)) % offs.length;
    hz = hz * Math.pow(2, offs[oIdx] / 12);
  }

  // humanize a little (Alan Walker not robotic)
  hz *= (1 + (Math.random() - 0.5) * 0.0032);

  // === High tension = cleaner, more prominent lead ===
  // Crisper, slightly shorter, less overlapping doubles. Focus on clarity.
  let type = tension > 1.65 ? 'sawtooth' : 'triangle';
  let dur = tension > 2.0 ? 0.085 : (tension > 0.9 ? 0.145 : 0.22);
  let v = TD.VOL * TD.MUSIC_VOL * (track.volMul || 1) * (0.09 + Math.min(0.08, tension * 0.032));

  if (tension > 1.9) {
    // cleaner: shorter crisp attacks, occasional pure sine for the emotional peak
    dur *= 0.88;
    v *= 1.05;
    if ((step % 5) === 0) type = 'sine';   // clean center at peaks
  }

  // occasional longer, emotional held note (build feel) — more impactful when cleaner
  if (tension > 1.6 && (step % 7 === 1)) {
    const longV = v * (tension > 1.9 ? 0.95 : 1.1);
    TD._playAt(tt => TD._toneAt(tt, hz, 0.36, 'sine', longV * 0.58));
  }

  TD._playAt(tt => TD._toneAt(tt, hz, dur, type, v));

  // fewer doubles at high tension to avoid clutter
  if (tension < 1.85 && tension > 0.9 && Math.random() < 0.48) {
    TD._playAt(tt => TD._toneAt(tt + 0.008, hz * 1.003, dur * 0.88, 'sine', v * 0.28));
  }
};

TD._setMusicBass = function _setMusicBass(baseHz, tension, track) {
  if (!TD._droneOsc || !TD.audioCtx) return;
  const t = TD.audioCtx.currentTime;
  // at high tension: slightly higher or tighter bass to reduce mud + keep punch
  let f = baseHz;
  if (tension > 1.9) f = baseHz * 1.25;
  else if (tension > 2.3) f = baseHz * 1.5;

  let vol = (0.06 + tension * 0.048) * TD.VOL * TD.MUSIC_VOL * (track.volMul || 0.95);
  if (TD.chillAudio) vol *= 0.55; // softer bed
  // For The Drum, the rhythmic pulses are the main bass, so keep drone subtle
  if (track.pulsingBass) vol *= 0.30;
  // For Unity simple root bass, keep drone low and supporting
  if (track.id === 'unity') vol *= 0.45;
  // For Faded deep octave bass, keep drone subtle so the octave plucks stand out
  if (track.id === 'faded') vol *= 0.35;
  // cleaner sine more often at high t
  TD._droneOsc.type = (tension > 2.0) ? 'sine' : (tension > 1.5 ? 'sawtooth' : 'sine');
  TD._droneGain.gain.setTargetAtTime(vol, t, 0.08);
  TD._droneOsc.frequency.setTargetAtTime(f, t, 0.065);
};

TD._playMusicRiser = function _playMusicRiser(tier) {
  if (!TD.audioCtx || TD.muted) return;
  const t = TD.audioCtx.currentTime + 0.01;
  const v = TD.VOL * TD.MUSIC_VOL * (0.16 + tier * 0.04);
  // musical rising sweep (anxiety build as enemies close to exit)
  TD._playAt(tt => {
    const o = TD.audioCtx.createOscillator(), g = TD.audioCtx.createGain();
    const f = TD.audioCtx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(88 + tier * 14, tt);
    o.frequency.exponentialRampToValueAtTime(172 + tier * 28, tt + 0.52);
    f.type = 'lowpass'; f.frequency.value = 980 + tier * 820;
    g.gain.setValueAtTime(v * 0.65, tt);
    g.gain.exponentialRampToValueAtTime(0.0007, tt + 0.56);
    o.connect(f); f.connect(g); g.connect(TD.audioCtx.destination);
    o.start(tt); o.stop(tt + 0.65);
  });
  TD.playNoise(0.36, v * 0.22);
};

TD._musicTick = function _musicTick() {
  if (!TD.musicActive) return;
  const run = TD.run;
  if (TD.muted || (run.state !== TD.STATE.PLAYING && run.state !== TD.STATE.PAUSED)) {
    TD.musicId = setTimeout(TD._musicTick, 320);
    return;
  }
  let tns = Math.max(0, Math.min(3, run.musicTension || 0));
  let tier = run.musicTensionTier || 0;
  if (TD.chillAudio) {
    tns = Math.min(tns, 0.2);
    tier = 0;
  }

  // riser when anxiety tier increases (enemies getting dangerously close) — off in chill
  if (!TD.chillAudio && tier > (TD._musicTierPrev || 0)) {
    TD._playMusicRiser(tier);
  }
  TD._musicTierPrev = tier;

  const track = TD.getCurrentMusicTrack() || TD.MUSIC_TRACKS['meadow-1'];

  // tension speeds things up; chill stays slightly slower / relaxed
  const speed = TD.chillAudio ? (0.82 + tns * 0.05) : (1 + tns * 0.23);
  const interval = Math.max(88, Math.round(track.baseInterval / speed));

  const step = (TD.musicStep || 0);

  // bass layer (persistent drone, modulated)
  TD._ensureDrone();
  let bassBase = track.bassNote || 55;
  let chordIdx = 0;
  if (track.chords && track.chords.length) {
    const div = (track.id === 'the-drum') ? 5 : (track.id === 'unity' || track.id === 'faded') ? 6 : 7;
    chordIdx = Math.floor((TD.musicStep || 0) / div) % track.chords.length;
    bassBase = track.chords[chordIdx][0];  // root of current chord
  }
  TD._setMusicBass(bassBase, tns, track);

  // Rhythmic pulsating bass hits (The Drum style) - left hand roots A->F->C->G in beat
  if (track.pulsingBass && (step % 2 === 0)) {
    const rootForBass = (track.chords && track.chords.length) ? track.chords[chordIdx][0] : bassBase;
    TD._playPulsingBass(rootForBass, tns, track);
  }

  // Unity: simple root bass notes in lower register (D -> Bb -> F -> C)
  // Play soft root plucks to emphasize left-hand bass line
  if (track.id === 'unity' && (step % 3 === 0)) {
    const root = (track.chords && track.chords.length) ? track.chords[chordIdx][0] : bassBase;
    const bassVol = TD.VOL * TD.MUSIC_VOL * 0.22;
    TD._playAt(t => TD._toneAt(t, root * 0.5, 0.32, 'sine', bassVol));  // sub octave for low register
  }

  // Faded: deep EDM bass with octaves (D# -> B -> F# -> C#)
  // Left hand plays roots in octaves for that signature low sound
  if (track.id === 'faded' && (step % 2 === 0)) {
    const root = (track.chords && track.chords.length) ? track.chords[chordIdx][0] : bassBase;
    const v = TD.VOL * TD.MUSIC_VOL * 0.28;
    TD._playAt(t => {
      // low octave
      TD._toneAt(t, root * 0.5, 0.28, 'sine', v * 0.9);
      // upper octave (the "two fingers" octave)
      TD._toneAt(t + 0.012, root, 0.22, 'sine', v * 0.7);
    });
  }

  // pads — at high anxiety we space them MORE (less overlap = cleaner mix)
  // + we already thin them inside _playPadChord
  let padStep = (tier >= 2 ? 4 : 6);
  if (tns > 2.1) padStep = 5;   // even sparser when very anxious → lead + bass breathe

  // some tracks are more pad-heavy, some more lead-driven (distinct character)
  if (track.id === 'canyon-1') padStep = Math.max(3, padStep - 1);
  if (track.id && (track.id.startsWith('ruins') || track.id === 'chords-gm')) padStep += 1;

  if (step % padStep === 0) {
    TD._ensurePadGain();
    if (track.chords && track.chords.length) {
      // Chord track: play full rich chords. The Drum changes a bit faster for repeating square feel
      const div = (track.id === 'the-drum') ? 5 : (track.id === 'unity' || track.id === 'faded') ? 6 : 7;
      const chordIdx = Math.floor(step / div) % track.chords.length;
      TD._playChordVoices(track.chords[chordIdx], tns, track);
    } else {
      const root = track.notes[step % track.notes.length] * 0.5;
      TD._playPadChord(root, tns, track);
    }
  }

  // melodic lead / arpeggio content (main "melody") — stays prominent
  let leadDiv = (tier >= 2 ? 1 : (tier >= 1 ? 2 : 3));
  if (track.id === 'canyon-1') leadDiv = Math.max(1, leadDiv - 1); // more driving
  if (track.id && (track.id.startsWith('ruins') || track.id === 'chords-gm')) leadDiv += (tier > 1 ? 0 : 1);
  if (step % leadDiv === 0) {
    TD._playLeadNote(track, step, tns);
  }

  // high-tension accents: off in chill; reduced at extreme anxiety so it doesn't clutter
  if (!TD.chillAudio && tns > 1.55 && tns < 2.35 && (step % (tier > 2 ? 2 : 3) === 0)) {
    const accVol = TD.VOL * TD.MUSIC_VOL * (0.028 + (tns - 1.5) * 0.03);
    TD._playAt(t => TD._noiseAt(t, 0.014, accVol));
  }

  TD.musicStep = step + 1;
  TD.musicId = setTimeout(TD._musicTick, interval);
};

TD.updateMusicTension = function updateMusicTension(dt) {
  if (TD.run.state !== TD.STATE.PLAYING) return;
  // Chill: hold near zero anxiety — no risers, soft pad
  if (TD.chillAudio) {
    const cur = TD.run.musicTension || 0;
    TD.run.musicTensionTier = 0;
    TD.run.musicTension = cur + (0 - cur) * Math.min(1, dt / 0.6);
    TD._musicTierPrev = 0;
    return;
  }
  const prev = TD.run.musicTensionTier || 0;
  const target = TD.computeMusicTensionTarget(prev);
  TD.run.musicTensionTier = target;
  const cur = TD.run.musicTension || 0;
  TD.run.musicTension = cur + (target - cur) * Math.min(1, dt / 0.5);
};

TD.startMusic = function startMusic() {
  TD.stopMusic();
  if (TD.muted) return;
  TD.initAudio();

  // Pick (or keep) a track for this map. Random within map pool gives variety.
  const run = TD.run;
  if (run && !run.musicTrack) {
    run.musicTrack = TD.selectMusicTrack(TD.currentMapId || 'meadow');
  }
  // reset riser detection
  TD._musicTierPrev = 0;

  // ensure pad bus is ready and at full for immediate audibility
  TD._ensurePadGain();
  if (TD._padGain) TD._padGain.gain.value = 1;

  TD.musicActive = true;
  TD._musicTick();

  // subtle map ambience (priority 6)
  TD.startAmbient(TD.currentMapId || 'meadow');
};

TD.stopMusic = function stopMusic() {
  TD.musicActive = false;
  if (TD.musicId) clearTimeout(TD.musicId);
  TD.musicId = null;

  TD._stopDrone();

  // hard stop drone osc too
  if (TD._droneOsc) {
    try { TD._droneOsc.stop(); TD._droneOsc.disconnect(); } catch(e){}
    TD._droneOsc = null;
  }
  if (TD._droneGain) {
    try { TD._droneGain.disconnect(); } catch(e){}
    TD._droneGain = null;
  }

  // ramp any active pad layer + null
  if (TD._padGain && TD.audioCtx) {
    try { TD._padGain.gain.setTargetAtTime(0, TD.audioCtx.currentTime, 0.04); } catch(e){}
  }
  TD._padGain = null;
  TD._musicTierPrev = 0;

  TD.stopAmbient();
};

if (TD.bus) {
  TD.bus.on('sfx', payload => {
    TD.initAudio();
    let name, opts = {};
    if (typeof payload === 'string') {
      name = payload;
    } else if (payload && typeof payload === 'object') {
      name = payload.name || payload;
      opts = payload;
    }
    const fn = TD.SFX[name];
    if (fn) fn(opts);
  });
  TD.bus.on('music:start', () => TD.startMusic());
  TD.bus.on('music:stop', () => TD.stopMusic());
}
})();