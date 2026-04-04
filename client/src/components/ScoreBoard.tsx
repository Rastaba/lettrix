import { useState, useEffect, useRef } from 'react';
import { ClientPlayer } from '../types';
import { useLang } from '../contexts/LangContext';

interface Props {
  players: ClientPlayer[];
  currentPlayerId: string;
  myPlayerId: string | null;
  tilesRemaining: number;
}

function AnimatedScore({ value, className }: { value: number; className: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) return;
    prevRef.current = value;
    const startTime = performance.now();
    const duration = 500;
    function tick(now: number) {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(prev + (value - prev) * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);

  return <span className={className}>{display}</span>;
}

export default function ScoreBoard({ players, currentPlayerId, myPlayerId, tilesRemaining }: Props) {
  const { t } = useLang();
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const leader = sorted[0];
  const scoreDiff = players.length === 2 ? Math.abs(players[0].score - players[1].score) : 0;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-2 glass rounded-full px-4 py-1.5">
          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 4h14l1 2-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6l1-2zm2 0V2h10v2" />
          </svg>
          <span className="text-sm font-bold text-amber-400 text-glow-amber">{tilesRemaining}</span>
          <span className="text-xs text-gray-500">{t('inBag')}</span>
        </div>
      </div>

      {players.map((p) => {
        const isMe = p.id === myPlayerId;
        const isCurrent = p.id === currentPlayerId;
        const isLeading = p.id === leader?.id && scoreDiff > 0;
        return (
          <div key={p.id}
            className={`relative flex items-center justify-between p-4 rounded-xl transition-all duration-500
              ${isCurrent ? 'glass-strong glow-amber' : 'glass'}`}>
            {isCurrent && (
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-full
                bg-gradient-to-b from-amber-400 to-orange-500 animate-pulse-glow" />
            )}
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500
                ${p.connected
                  ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]'
                  : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'}`} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold ${isMe ? 'gradient-text' : 'text-white'}`}>{p.name}</span>
                  {isMe && <span className="text-xs text-gray-500">{t('you')}</span>}
                  {isLeading && <span className="text-[10px]">👑</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{p.tileCount} {t('tiles')}</div>
              </div>
            </div>
            <div key={`s-${p.id}-${p.score}`} className="score-bump">
              <AnimatedScore
                value={p.score}
                className={`text-3xl font-black tabular-nums ${isCurrent ? 'gradient-text' : 'text-white'}`}
              />
            </div>
          </div>
        );
      })}

      {scoreDiff > 0 && players.length === 2 && (
        <div className="text-center text-xs text-gray-500">
          <span className="gradient-text font-bold">{leader.name}</span> +{scoreDiff}
        </div>
      )}
    </div>
  );
}
