import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useLang } from '../contexts/LangContext';
import { playCelebForTier } from '../sounds';

export interface MoveResultInfo {
  playerName: string;
  score: number;
  words: string[];
  isMe: boolean;
  isFullRack?: boolean;
}

const MESSAGES: Record<string, { fr: string; en: string }[]> = {
  good:      [{ fr: 'Pas mal !', en: 'Not bad!' }],
  great:     [{ fr: 'Bien joué !', en: 'Nice move!' }, { fr: 'Joli coup !', en: 'Great play!' }],
  excellent: [{ fr: 'Excellent !', en: 'Excellent!' }, { fr: 'Magnifique !', en: 'Magnificent!' }],
  incredible:[{ fr: 'INCROYABLE !', en: 'INCREDIBLE!' }, { fr: 'FANTASTIQUE !', en: 'FANTASTIC!' }],
  legendary: [{ fr: 'LÉGENDAIRE !!', en: 'LEGENDARY!!' }, { fr: 'MONSTRUEUX !!', en: 'MONSTROUS!!' }],
  fullrack:  [{ fr: '🔥 L·E·T·T·R·I·X 🔥', en: '🔥 L·E·T·T·R·I·X 🔥' }],
};

const FULLRACK_SUB: Record<string, string[]> = {
  fr: ['7 lettres d\'un coup !!', 'Le coup parfait !!', 'QUEL COUP !!', 'Tu es un GÉNIE !!'],
  en: ['All 7 tiles at once!!', 'The perfect move!!', 'WHAT A PLAY!!', 'You are a GENIUS!!'],
};

const CONFETTI_COLORS = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee'];
const FULLRACK_COLORS = ['#ff0000', '#ff4400', '#ff8800', '#ffbb00', '#ffee00', '#88ff00', '#00ff88', '#00ffee', '#00aaff', '#4444ff', '#8800ff', '#ff00ff'];

function getTier(score: number, isFullRack: boolean) {
  if (isFullRack) return 'fullrack';
  if (score >= 70) return 'legendary';
  if (score >= 50) return 'incredible';
  if (score >= 35) return 'excellent';
  if (score >= 20) return 'great';
  if (score >= 10) return 'good';
  return 'basic';
}

function getDuration(tier: string) {
  const d: Record<string, number> = { basic: 1600, good: 2200, great: 2800, excellent: 3200, incredible: 3800, legendary: 4500, fullrack: 6000 };
  return d[tier] ?? 2000;
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Canvas particle types ──

interface Confetto {
  x: number; y: number; w: number; h: number;
  color: string; speed: number; wobbleAmp: number;
  wobbleSpeed: number; rotation: number; rotSpeed: number;
  delay: number; round: boolean;
}

interface Particle {
  cx: number; cy: number;
  px: number; py: number;
  size: number; color: string;
  delay: number;
}

interface LetterOrbit {
  letter: string; angle: number;
}

function createConfetti(count: number, colors: string[], w: number): Confetto[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w, y: -20 - Math.random() * 40,
    w: 4 + Math.random() * 8, h: 4 + Math.random() * 6,
    color: pick(colors), speed: 120 + Math.random() * 200,
    wobbleAmp: 20 + Math.random() * 60, wobbleSpeed: 1.5 + Math.random() * 3,
    rotation: Math.random() * Math.PI * 2, rotSpeed: 1 + Math.random() * 4,
    delay: Math.random() * 1.5, round: Math.random() > 0.5,
  }));
}

function createParticles(count: number, colors: string[], cx: number, cy: number, isFullRack: boolean): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist = 80 + Math.random() * (isFullRack ? 250 : 180);
    return {
      cx, cy,
      px: Math.cos(angle) * dist, py: Math.sin(angle) * dist,
      size: 3 + Math.random() * 8, color: pick(colors),
      delay: Math.random() * 0.5,
    };
  });
}

// ── Canvas renderer ──

function useParticleCanvas(tier: string, duration: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = window.innerWidth;
    const h = canvas.height = window.innerHeight;
    const cx = w / 2;
    const cy = h * 0.45;

    const isFullRack = tier === 'fullrack';
    const colors = isFullRack ? FULLRACK_COLORS : CONFETTI_COLORS;

    // Create data
    const confetti: Confetto[] = (tier === 'incredible' || tier === 'legendary' || tier === 'fullrack')
      ? createConfetti(isFullRack ? 80 : tier === 'legendary' ? 60 : 35, colors, w) : [];

    const particles: Particle[] = (tier !== 'basic' && tier !== 'good')
      ? createParticles(
          isFullRack ? 50 : tier === 'great' ? 12 : tier === 'excellent' ? 20 : tier === 'incredible' ? 30 : 40,
          colors, cx, cy, isFullRack) : [];

    const letters: LetterOrbit[] = isFullRack
      ? 'LETTRIX'.split('').map((letter, i) => ({ letter, angle: (i / 7) * Math.PI * 2 - Math.PI / 2 }))
      : [];

    const startTime = performance.now();
    const durMs = duration;

    // Flash config
    const ti = ['basic', 'good', 'great', 'excellent', 'incredible', 'legendary', 'fullrack'].indexOf(tier);
    const hasFlash = ti >= 3;

    function frame(now: number) {
      const elapsed = (now - startTime) / 1000;
      if (elapsed * 1000 > durMs) { ctx!.clearRect(0, 0, w, h); return; }
      ctx!.clearRect(0, 0, w, h);

      // Screen flash
      if (hasFlash && elapsed < 1.5) {
        const flashAlpha = Math.max(0, (1 - elapsed / 1.5) * (isFullRack ? 0.35 : ti >= 5 ? 0.25 : 0.15));
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
        if (isFullRack) {
          grad.addColorStop(0, `rgba(255,100,0,${flashAlpha})`);
          grad.addColorStop(0.5, `rgba(255,0,100,${flashAlpha * 0.4})`);
        } else {
          grad.addColorStop(0, `rgba(251,191,36,${flashAlpha})`);
        }
        grad.addColorStop(1, 'transparent');
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, w, h);
      }

      // Confetti
      for (const c of confetti) {
        const t = elapsed - c.delay;
        if (t < 0) continue;
        const cy2 = c.y + c.speed * t;
        const cx2 = c.x + Math.sin(t * c.wobbleSpeed) * c.wobbleAmp;
        if (cy2 > h + 20) continue;
        ctx!.save();
        ctx!.translate(cx2, cy2);
        ctx!.rotate(c.rotation + c.rotSpeed * t);
        ctx!.fillStyle = c.color;
        if (c.round) {
          ctx!.beginPath();
          ctx!.arc(0, 0, c.w / 2, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          ctx!.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        }
        ctx!.restore();
      }

      // Particles (burst outward then fade)
      for (const p of particles) {
        const t = elapsed - p.delay;
        if (t < 0) continue;
        const progress = Math.min(t / 0.8, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const alpha = Math.max(0, 1 - progress);
        const px = p.cx + p.px * ease;
        const py = p.cy + p.py * ease;
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(px, py, p.size / 2, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Orbiting letters (full rack only)
      if (letters.length > 0) {
        const orbitRadius = Math.min(w, h) * 0.18;
        const orbitElapsed = elapsed;
        for (const lp of letters) {
          const angle = lp.angle + orbitElapsed * 1.2;
          const lx = cx + Math.cos(angle) * orbitRadius;
          const ly = cy + Math.sin(angle) * orbitRadius;
          // Tile background
          ctx!.fillStyle = '#f5e6b8';
          ctx!.shadowColor = 'rgba(251,191,36,0.5)';
          ctx!.shadowBlur = 10;
          const ts = 24;
          ctx!.beginPath();
          ctx!.roundRect(lx - ts / 2, ly - ts / 2, ts, ts, 4);
          ctx!.fill();
          ctx!.shadowBlur = 0;
          // Letter
          ctx!.fillStyle = '#1a1a1a';
          ctx!.font = 'bold 14px system-ui, sans-serif';
          ctx!.textAlign = 'center';
          ctx!.textBaseline = 'middle';
          ctx!.fillText(lp.letter, lx, ly);
        }
      }

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
  }, [tier, duration]);

  useEffect(() => {
    // Skip canvas for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    start();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [start]);

  return canvasRef;
}

// ── Component ──

interface Props {
  result: MoveResultInfo;
  onDone: () => void;
}

export default function ScoreCelebration({ result, onDone }: Props) {
  const { lang } = useLang();
  const [visible, setVisible] = useState(true);
  const tier = result.isMe ? getTier(result.score, !!result.isFullRack) : 'basic';
  const duration = getDuration(result.isMe ? tier : 'basic');

  const canvasRef = useParticleCanvas(result.isMe ? tier : 'none', duration);

  useEffect(() => {
    if (result.isMe) playCelebForTier(tier);
  }, []); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone(); }, duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  const message = useMemo(() => {
    const msgs = MESSAGES[tier];
    if (!msgs || tier === 'basic') return '';
    return lang === 'fr' ? pick(msgs).fr : pick(msgs).en;
  }, [tier, lang]);

  const subMessage = useMemo(() => {
    if (tier !== 'fullrack') return '';
    return pick(FULLRACK_SUB[lang] ?? FULLRACK_SUB.en);
  }, [tier, lang]);

  if (!visible) return null;

  if (!result.isMe) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
        <div className="celeb-opponent-score glass rounded-full px-5 py-2 flex items-center gap-2">
          <span className="text-gray-400 text-sm">{result.playerName}</span>
          <span className="text-amber-400 font-black">+{result.score}</span>
          {result.isFullRack && <span className="text-xs">🔥 LETTRIX!</span>}
          <span className="text-gray-500 text-xs truncate max-w-[120px]">{result.words.join(', ')}</span>
        </div>
      </div>
    );
  }

  const ti = ['basic', 'good', 'great', 'excellent', 'incredible', 'legendary', 'fullrack'].indexOf(tier);
  const isFullRackTier = tier === 'fullrack';

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Canvas for confetti, particles, orbiting letters, and flash */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Score + message (still DOM for text rendering quality) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isFullRackTier && (
          <div className="celeb-words-appear text-base font-black text-orange-400 mb-2 tracking-widest" style={{ animationDelay: '0s' }}>
            +50 BONUS
          </div>
        )}

        <div className={`celeb-score-float font-black tabular-nums
          ${isFullRackTier ? 'text-8xl sm:text-9xl celeb-text-glow-strong' : ti >= 4 ? 'text-7xl sm:text-8xl celeb-text-glow-strong' : ti >= 3 ? 'text-6xl sm:text-7xl celeb-text-glow' : ti >= 2 ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'}`}
          style={{ color: isFullRackTier ? '#ff6600' : ti >= 4 ? '#fbbf24' : ti >= 3 ? '#34d399' : ti >= 2 ? '#60a5fa' : '#a3e635' }}>
          +{result.score}
        </div>

        <div className="celeb-words-appear text-xl sm:text-2xl font-bold text-white/80 mt-2">
          {result.words.join(' + ')}
        </div>

        {message && (
          <div className={`celeb-message-slam mt-4 font-black tracking-wider
            ${isFullRackTier ? 'text-3xl sm:text-5xl fullrack-rainbow-text' : ti >= 4 ? 'text-4xl sm:text-5xl celeb-text-glow-strong' : 'text-2xl sm:text-3xl celeb-text-glow'}`}
            style={{ color: isFullRackTier ? undefined : ti >= 4 ? '#fbbf24' : '#34d399' }}>
            {message}
          </div>
        )}

        {subMessage && (
          <div className="celeb-words-appear text-lg sm:text-xl font-bold text-white/70 mt-2" style={{ animationDelay: '0.5s' }}>
            {subMessage}
          </div>
        )}
      </div>
    </div>
  );
}
