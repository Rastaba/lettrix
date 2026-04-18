import { useState, useEffect } from 'react';
import { useLang } from '../contexts/LangContext';

interface Props {
  isMyTurn: boolean;
  hasPlacedTiles: boolean;
  exchangeMode: boolean;
  hasExchangeSelection: boolean;
  canExchange: boolean;
  previewScore: number | null;
  previewWords: string[];
  turnElapsed: number; // seconds since turn started (from server)
  gameActive?: boolean;
  onSubmitMove: () => void;
  onRecall: () => void;
  onPass: () => void;
  onToggleExchange: () => void;
  onSubmitExchange: () => void;
  onShuffle: () => void;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Nudge messages that appear at intervals
const NUDGES_FR = [
  { at: 60, msg: "Tic tac..." },
  { at: 120, msg: "Ton adversaire attend..." },
  { at: 180, msg: "Ca fait 3 minutes..." },
  { at: 240, msg: "Tu dors ? ..." },
  { at: 300, msg: "5 minutes..." },
];
const NUDGES_EN = [
  { at: 60, msg: "Tick tock..." },
  { at: 120, msg: "Your opponent is waiting..." },
  { at: 180, msg: "3 minutes now..." },
  { at: 240, msg: "Still there?..." },
  { at: 300, msg: "5 minutes..." },
];

export default function Controls({ isMyTurn, hasPlacedTiles, exchangeMode, hasExchangeSelection, canExchange, previewScore, previewWords, turnElapsed, gameActive = true, onSubmitMove, onRecall, onPass, onToggleExchange, onSubmitExchange, onShuffle }: Props) {
  const { t, lang } = useLang();

  // Local tick to keep chrono smooth between server updates
  const [localElapsed, setLocalElapsed] = useState(turnElapsed);
  useEffect(() => { setLocalElapsed(turnElapsed); }, [turnElapsed]);
  useEffect(() => {
    if (!gameActive) return; // stop ticking once the game ends
    const interval = setInterval(() => setLocalElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isMyTurn, gameActive]);

  // Reset on turn change
  useEffect(() => { setLocalElapsed(0); }, [isMyTurn]);

  const timeStr = formatTime(localElapsed);
  const nudges = lang === 'fr' ? NUDGES_FR : NUDGES_EN;
  const activeNudge = [...nudges].reverse().find((n) => localElapsed >= n.at);

  // Urgency level: 0=chill, 1=gentle, 2=warning, 3=urgent
  const urgency = localElapsed >= 240 ? 3 : localElapsed >= 180 ? 2 : localElapsed >= 60 ? 1 : 0;

  const timerColor = urgency >= 3 ? 'text-red-400' : urgency >= 2 ? 'text-orange-400' : urgency >= 1 ? 'text-amber-400' : 'text-gray-500';
  const timerGlow = urgency >= 3 ? 'timer-glow-red' : urgency >= 2 ? 'timer-glow-orange' : '';

  if (!isMyTurn) {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-gray-400 font-medium">{t('opponentThinking')}</p>
          <span className={`font-mono text-sm font-bold tabular-nums ${timerColor}`}>{timeStr}</span>
        </div>
      </div>
    );
  }

  if (exchangeMode) {
    return (
      <div className="glass rounded-2xl p-5 animate-slide-up">
        <p className="text-sm text-amber-400 mb-4 text-center font-medium text-glow-amber">{t('selectExchange')}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onSubmitExchange} disabled={!hasExchangeSelection}
            className="px-6 py-2.5 rounded-xl font-bold transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 btn-glow btn-glow-blue active:scale-[0.97] text-sm">
            {t('confirm')}
          </button>
          <button onClick={onToggleExchange}
            className="px-6 py-2.5 glass rounded-xl font-bold text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 active:scale-[0.97]">
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  const btn = 'px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 active:scale-[0.97]';
  const dis = 'disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 disabled:shadow-none';

  return (
    <div className={`glass rounded-2xl p-4 space-y-3 transition-all duration-1000 ${timerGlow}`}>
      {/* Timer + nudge */}
      <div className="flex items-center justify-center gap-3">
        <span className={`font-mono text-sm font-bold tabular-nums transition-colors duration-500 ${timerColor}`}>{timeStr}</span>
        {activeNudge && (
          <span className={`text-xs font-medium animate-pulse transition-colors duration-500 ${timerColor}`}>
            {activeNudge.msg}
          </span>
        )}
      </div>

      {/* Score preview */}
      {previewScore !== null && previewScore > 0 && (
        <div className="flex items-center justify-center gap-3 animate-pop-in">
          <div className="glass-strong rounded-full px-5 py-2 flex items-center gap-2 glow-green">
            <span className="text-emerald-400 font-black text-xl text-glow-green">+{previewScore}</span>
            <span className="text-xs text-gray-400">{t('points')}</span>
          </div>
          {previewWords.length > 0 && (
            <span className="text-amber-400 text-sm font-bold truncate max-w-[200px]">
              {previewWords.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={onSubmitMove} disabled={!hasPlacedTiles}
          className={`${btn} ${dis} bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500 hover:shadow-lg hover:shadow-green-500/20 btn-glow btn-glow-green`}>
          {t('play')} {previewScore !== null && previewScore > 0 ? `(+${previewScore})` : ''}
        </button>
        <button onClick={onRecall} disabled={!hasPlacedTiles}
          className={`${btn} ${dis} bg-gradient-to-r from-amber-500 to-yellow-600 text-gray-900 hover:from-amber-400 hover:to-yellow-500 hover:shadow-lg hover:shadow-amber-500/20 btn-glow btn-glow-amber`}>
          {t('recall')}
        </button>
        <button onClick={onShuffle}
          className={`${btn} glass text-gray-400 hover:text-amber-400 hover:bg-white/5`} title="Shuffle"
          aria-label={lang === 'fr' ? 'Mélanger le chevalet' : 'Shuffle rack'}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        </button>
        <button onClick={onToggleExchange} disabled={!canExchange}
          className={`${btn} ${dis} bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-blue-500/20 btn-glow btn-glow-blue`}>
          {t('exchange')}
        </button>
        <button onClick={onPass} className={`${btn} glass text-gray-400 hover:text-white hover:bg-white/5`}>
          {t('pass')}
        </button>
      </div>
    </div>
  );
}
