let ctx: AudioContext | null = null;
let muted = localStorage.getItem('lettrix-muted') === 'true';

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() { return muted; }
export function setMuted(v: boolean) { muted = v; localStorage.setItem('lettrix-muted', String(v)); }

// ── Haptic feedback ──
export function haptic(style: 'light' | 'medium' | 'heavy' | 'success' = 'light') {
  try {
    if (!navigator.vibrate) return;
    switch (style) {
      case 'light': navigator.vibrate(8); break;
      case 'medium': navigator.vibrate(20); break;
      case 'heavy': navigator.vibrate([15, 30, 25]); break;
      case 'success': navigator.vibrate([10, 40, 15, 40, 20]); break;
    }
  } catch {}
}

// ── Core synth helpers ──

function now() { return getCtx().currentTime; }

function osc(freq: number, type: OscillatorType, startT: number, stopT: number, detune = 0) {
  const c = getCtx();
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, startT);
  if (detune) o.detune.setValueAtTime(detune, startT);
  o.start(startT);
  o.stop(stopT);
  return o;
}

function env(startT: number, attack: number, sustain: number, release: number, peak = 0.15) {
  const c = getCtx();
  const g = c.createGain();
  g.gain.setValueAtTime(0.001, startT);
  g.gain.linearRampToValueAtTime(peak, startT + attack);
  g.gain.setValueAtTime(peak, startT + attack + sustain);
  g.gain.exponentialRampToValueAtTime(0.001, startT + attack + sustain + release);
  return g;
}

function play(fn: (c: AudioContext, t: number) => void) {
  if (muted) return;
  try { fn(getCtx(), now()); } catch {}
}

// Slight random pitch variation for natural feel
function vary(freq: number, amount = 0.03): number {
  return freq * (1 + (Math.random() - 0.5) * amount);
}

// Noise burst for percussive click
function noiseBurst(c: AudioContext, t: number, dur: number, vol = 0.06) {
  const bufSize = c.sampleRate * dur;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = env(t, 0.001, 0, dur - 0.001, vol);
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}

// Rich tone with 2 detuned oscillators
function richTone(t: number, freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12) {
  const c = getCtx();
  const g = env(t, 0.01, dur * 0.4, dur * 0.6, vol);
  const o1 = osc(vary(freq), type, t, t + dur);
  const o2 = osc(vary(freq), type, t, t + dur, 6); // slight detune for warmth
  o1.connect(g).connect(c.destination);
  o2.connect(g);
}

// ── UI Sounds ──

export function playTileClick() {
  play((c, t) => {
    noiseBurst(c, t, 0.03, 0.08);
    richTone(t, vary(900), 0.06, 'sine', 0.08);
  });
  haptic('light');
}

export function playTilePlace() {
  play((c, t) => {
    noiseBurst(c, t, 0.04, 0.1);
    richTone(t, vary(440), 0.1, 'triangle', 0.12);
    richTone(t + 0.03, vary(560), 0.08, 'sine', 0.06);
  });
  haptic('medium');
}

export function playTileReturn() {
  play((_c, t) => {
    richTone(t, vary(380), 0.08, 'triangle', 0.08);
    richTone(t + 0.02, vary(300), 0.1, 'sine', 0.05);
  });
  haptic('light');
}

export function playError() {
  play((_c, t) => {
    richTone(t, 220, 0.12, 'sawtooth', 0.06);
    richTone(t + 0.08, 170, 0.15, 'sawtooth', 0.05);
  });
  haptic('heavy');
}

export function playYourTurn() {
  play((c, t) => {
    noiseBurst(c, t, 0.02, 0.04);
    richTone(t, 660, 0.12, 'sine', 0.1);
    richTone(t + 0.1, 880, 0.12, 'sine', 0.1);
    richTone(t + 0.2, 1100, 0.18, 'sine', 0.12);
  });
  haptic('success');
}

export function playPass() {
  play((_c, t) => {
    richTone(t, 280, 0.12, 'triangle', 0.06);
  });
}

export function playExchange() {
  play((c, t) => {
    for (let i = 0; i < 3; i++) {
      noiseBurst(c, t + i * 0.06, 0.03, 0.05);
      richTone(t + i * 0.06, vary(400 + i * 60), 0.06, 'triangle', 0.05);
    }
  });
}

export function playShuffle() {
  play((c, t) => {
    for (let i = 0; i < 6; i++) {
      noiseBurst(c, t + i * 0.035, 0.02, 0.04);
    }
  });
  haptic('medium');
}

// ── Celebration Sounds ──

function playCelebFullRack() {
  play((c, t) => {
    noiseBurst(c, t, 0.08, 0.15);
    // Rising S-C-R-A-B-B-L-E notes (C major scale up + octave)
    const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
    notes.forEach((f, i) => {
      richTone(t + i * 0.1, f, 0.2, 'sine', 0.12);
      richTone(t + i * 0.1, f, 0.2, 'triangle', 0.04);
    });
    // Epic sustained chord at the peak
    const chord = [523, 659, 784, 1047, 1319, 1568];
    chord.forEach((f) => {
      richTone(t + 0.9, f, 0.8, 'sine', 0.08);
    });
    // Final sparkle
    richTone(t + 1.5, 2093, 0.3, 'sine', 0.06);
    richTone(t + 1.6, 2637, 0.25, 'sine', 0.04);
    noiseBurst(c, t + 0.9, 0.1, 0.08);
  });
  haptic('heavy');
  // Extra haptic burst
  setTimeout(() => haptic('success'), 500);
  setTimeout(() => haptic('medium'), 1000);
}

export function playCelebForTier(tier: string) {
  const fn: Record<string, () => void> = {
    basic: () => play((_c, t) => {
      richTone(t, 660, 0.2, 'sine', 0.1);
    }),
    good: () => play((_c, t) => {
      richTone(t, 523, 0.15, 'sine', 0.1);
      richTone(t + 0.1, 659, 0.18, 'sine', 0.1);
    }),
    great: () => play((c, t) => {
      noiseBurst(c, t, 0.03, 0.06);
      richTone(t, 523, 0.15, 'sine', 0.12);
      richTone(t + 0.1, 659, 0.15, 'sine', 0.12);
      richTone(t + 0.2, 784, 0.22, 'sine', 0.14);
    }),
    excellent: () => play((c, t) => {
      noiseBurst(c, t, 0.04, 0.08);
      richTone(t, 523, 0.12, 'sine', 0.12);
      richTone(t + 0.08, 659, 0.12, 'sine', 0.12);
      richTone(t + 0.16, 784, 0.12, 'sine', 0.14);
      richTone(t + 0.24, 1047, 0.25, 'sine', 0.16);
      // Harmony
      richTone(t + 0.24, 659, 0.2, 'sine', 0.06);
    }),
    incredible: () => play((c, t) => {
      noiseBurst(c, t, 0.05, 0.1);
      const notes = [392, 523, 659, 784, 1047];
      notes.forEach((f, i) => {
        richTone(t + i * 0.09, f, 0.15, 'sine', 0.12);
      });
      // Final chord
      richTone(t + 0.45, 523, 0.35, 'sine', 0.08);
      richTone(t + 0.45, 659, 0.35, 'sine', 0.08);
      richTone(t + 0.45, 784, 0.35, 'sine', 0.08);
      richTone(t + 0.45, 1047, 0.4, 'sine', 0.1);
    }),
    legendary: () => play((c, t) => {
      noiseBurst(c, t, 0.06, 0.12);
      // Rising fanfare
      const fanfare = [392, 523, 659, 784, 1047, 1319];
      fanfare.forEach((f, i) => {
        richTone(t + i * 0.08, f, 0.15, 'sine', 0.12);
        richTone(t + i * 0.08, f, 0.15, 'triangle', 0.04); // double layer
      });
      // Epic sustained chord
      const chord = [523, 659, 784, 1047, 1319];
      chord.forEach((f) => {
        richTone(t + 0.55, f, 0.6, 'sine', 0.1);
      });
      noiseBurst(c, t + 0.55, 0.08, 0.06);
    }),
    fullrack: playCelebFullRack,
  };
  const exec = fn[tier] ?? fn.basic;
  exec();
  haptic(tier === 'legendary' || tier === 'incredible' ? 'heavy' : tier === 'excellent' || tier === 'great' ? 'medium' : 'light');
}

export function playGameOver(won: boolean) {
  play((_c, t) => {
    if (won) {
      richTone(t, 523, 0.15, 'sine', 0.12);
      richTone(t + 0.15, 659, 0.15, 'sine', 0.12);
      richTone(t + 0.3, 784, 0.15, 'sine', 0.12);
      richTone(t + 0.45, 1047, 0.4, 'sine', 0.15);
      richTone(t + 0.45, 784, 0.35, 'sine', 0.06);
      richTone(t + 0.45, 659, 0.35, 'sine', 0.06);
    } else {
      richTone(t, 440, 0.2, 'sine', 0.1);
      richTone(t + 0.2, 415, 0.2, 'sine', 0.1);
      richTone(t + 0.4, 392, 0.35, 'sine', 0.1);
    }
  });
  haptic(won ? 'success' : 'heavy');
}
