import { useState, useEffect } from 'react';
import { ClientPlayer, MoveHistoryEntry, Tile } from '../types';
import { useLang } from '../contexts/LangContext';
import ShareButtons from './ShareButtons';
import GameReplayModal from './GameReplayModal';
import socket from '../socket';

interface H2HData {
  wins1: number;
  wins2: number;
  total: number;
  lastGameDate: string | null;
}

interface Props {
  players: ClientPlayer[];
  winnerId: string | null;
  myPlayerId: string | null;
  moveHistory: MoveHistoryEntry[];
  board: (Tile | null)[][];
  rematchState: 'none' | 'requested' | 'opponent-wants';
  onRematch: () => void;
  onLeave: () => void;
}

export default function GameOver({ players, winnerId, myPlayerId, moveHistory, board, rematchState, onRematch, onLeave }: Props) {
  const { t } = useLang();
  const [showReplay, setShowReplay] = useState(false);
  const [h2h, setH2H] = useState<H2HData | null>(null);
  const [showXP, setShowXP] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [showH2H, setShowH2H] = useState(false);
  const [showRematch, setShowRematch] = useState(false);

  const isTie = winnerId === null;
  const isWinner = winnerId === myPlayerId;
  const winner = players.find((p) => p.id === winnerId);
  const me = players.find((p) => p.id === myPlayerId);
  const opponent = players.find((p) => p.id !== myPlayerId);

  const totalWordsPlayed = moveHistory.filter((m) => m.type === 'play').length;
  const bestMove = moveHistory.reduce<MoveHistoryEntry | null>((b, m) => (m.type === 'play' && (!b || m.score > b.score) ? m : b), null);

  // Sequential reveal animations
  useEffect(() => {
    const t1 = setTimeout(() => setShowXP(true), 500);
    const t2 = setTimeout(() => setShowStreak(true), 1000);
    const t3 = setTimeout(() => setShowH2H(true), 1500);
    const t4 = setTimeout(() => setShowRematch(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // Fetch H2H record
  useEffect(() => {
    if (me && opponent) {
      socket.emit('get-h2h', { name1: me.name, name2: opponent.name }, (res: H2HData) => {
        setH2H(res);
      });
    }
  }, [me?.name, opponent?.name]);

  const h2hTotal = h2h ? h2h.wins1 + h2h.wins2 : 0;
  const h2hPct = h2hTotal > 0 ? Math.round((h2h!.wins1 / h2hTotal) * 100) : 50;

  // Estimate XP (score-based, winner bonus)
  const xpGained = me ? Math.round(me.score * 0.5) + (isWinner ? 25 : 0) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label={isTie ? t('tie') : t('victory')}>
      <div className="glass-strong rounded-3xl p-8 sm:p-10 max-w-md w-full text-center space-y-5 gradient-border animate-slide-up overflow-y-auto max-h-[95vh]">
        {/* 1. Result - immediate */}
        <div>
          {!isTie && <div className="text-5xl mb-2 animate-float">{isWinner ? '\uD83C\uDFC6' : '\uD83D\uDE14'}</div>}
          <h2 className="text-3xl font-black">
            {isTie ? <span className="gradient-text">{t('tie')}</span>
              : isWinner ? <span className="gradient-text text-glow-amber">{t('victory')}</span>
              : <span className="text-gray-300">{winner?.name} {t('wins')}</span>}
          </h2>
        </div>

        {/* Scores */}
        <div className="space-y-2">
          {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={p.id} className={`flex justify-between items-center p-3 rounded-2xl ${p.id === winnerId ? 'glass-strong glow-amber' : 'glass'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{i === 0 ? '\uD83E\uDD47' : '\uD83E\uDD48'}</span>
                <span className={`font-bold ${p.id === myPlayerId ? 'gradient-text' : 'text-white'}`}>
                  {p.name} {p.id === myPlayerId && <span className="text-xs text-gray-500">{t('you')}</span>}
                </span>
              </div>
              <span className={`text-2xl font-black tabular-nums ${p.id === winnerId ? 'gradient-text' : 'text-white'}`}>{p.score}</span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="glass rounded-xl p-2.5 text-center">
            <div className="text-base font-black text-amber-400">{totalWordsPlayed}</div>
            <div className="text-[10px] text-gray-500 uppercase">{t('wordsPlayed')}</div>
          </div>
          {bestMove && (
            <div className="glass rounded-xl p-2.5 text-center">
              <div className="text-base font-black text-emerald-400">+{bestMove.score}</div>
              <div className="text-[10px] text-gray-500 uppercase truncate">{t('bestMoveOfGame')}</div>
            </div>
          )}
        </div>

        {/* 2. XP gained - fade in after 0.5s */}
        {showXP && xpGained > 0 && (
          <div className="animate-slide-up">
            <div className="glass rounded-xl p-3 flex items-center justify-center gap-2">
              <span className="text-2xl font-black text-amber-400 animate-float">+{xpGained} XP</span>
            </div>
          </div>
        )}

        {/* 3. Streak - fade in after 1s */}
        {showStreak && (
          <div className="animate-slide-up">
            <div className="text-sm text-gray-400">
              <span style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('streakDays')}
              </span>
            </div>
          </div>
        )}

        {/* 4. H2H record - fade in after 1.5s */}
        {showH2H && h2h && me && opponent && (
          <div className="animate-slide-up">
            <div className="glass rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('h2hRecord')}</h4>
              {h2hTotal === 0 ? (
                <p className="text-amber-400 font-bold text-sm">{t('firstDuel')}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-white">{me.name}</span>
                    <span className="font-bold text-white">{opponent.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-emerald-400 w-6 text-right">{h2h.wins1}</span>
                    <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 rounded-l-full transition-all duration-700"
                        style={{ width: `${h2hPct}%` }}
                      />
                      <div
                        className="h-full bg-red-500 rounded-r-full transition-all duration-700"
                        style={{ width: `${100 - h2hPct}%` }}
                      />
                    </div>
                    <span className="text-sm font-black text-red-400 w-6">{h2h.wins2}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 5. Rematch button - appear after 2s, big green pulsating */}
        {showRematch && (
          <div className="animate-slide-up space-y-3">
            {rematchState === 'none' && (
              <button onClick={onRematch}
                className="w-full py-5 rounded-2xl font-black text-xl transition-all duration-300
                  bg-gradient-to-r from-emerald-500 to-green-600 text-white
                  hover:from-emerald-400 hover:to-green-500 hover:shadow-xl hover:shadow-emerald-500/30
                  hover:scale-[1.02] btn-glow btn-glow-green active:scale-[0.98] animate-pulse-glow">
                {t('rematch')}
              </button>
            )}
            {rematchState === 'requested' && (
              <div className="glass rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-amber-400 font-medium text-sm">{t('rematchWaiting')}</span>
                </div>
              </div>
            )}
            {rematchState === 'opponent-wants' && (
              <button onClick={onRematch}
                className="w-full py-5 rounded-2xl font-black text-xl transition-all duration-300
                  bg-gradient-to-r from-emerald-500 to-green-600 text-white
                  hover:from-emerald-400 hover:to-green-500 hover:shadow-xl hover:shadow-green-500/30
                  hover:scale-[1.02] btn-glow btn-glow-green active:scale-[0.98] animate-pulse-glow">
                {t('rematchAccept')}
              </button>
            )}
          </div>
        )}

        {/* Replay */}
        <button onClick={() => setShowReplay(true)}
          className="w-full py-2.5 glass rounded-xl font-bold text-sm text-amber-400 hover:bg-white/5 transition-all active:scale-[0.98]">
          {t('replayWatch')}
        </button>

        {showReplay && (
          <GameReplayModal
            players={players}
            moveHistory={moveHistory}
            winnerId={winnerId}
            board={board}
            onClose={() => setShowReplay(false)}
          />
        )}

        {/* Share result */}
        <ShareButtons
          text={(() => {
            const opp = players.find(p => p.id !== myPlayerId);
            const result = isTie ? '\uD83E\uDD1D' : isWinner ? '\uD83C\uDFC6' : '\uD83D\uDE24';
            return `${result} Lettrix: ${me?.name} ${me?.score} - ${opp?.score} ${opp?.name}${bestMove ? ` | ${t('bestMoveOfGame')}: ${bestMove.words[0]} (+${bestMove.score})` : ''}`;
          })()}
          url={typeof window !== 'undefined' ? window.location.origin : ''}
        />

        {/* Back to dashboard - small text link, not a button */}
        <button onClick={onLeave}
          className="text-gray-600 hover:text-gray-400 text-xs transition-all">
          {t('backToDashboard')}
        </button>
      </div>
    </div>
  );
}
