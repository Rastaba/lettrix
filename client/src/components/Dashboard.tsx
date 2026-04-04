import { useEffect, useState, useCallback } from 'react';
import { useLang } from '../contexts/LangContext';
import { PlayerProfile } from '../hooks/usePlayerProfile';
import { useGameHistory, CompletedGame } from '../hooks/useGameHistory';
import { useTheme } from '../contexts/ThemeContext';
import { ClientPlayer, MoveHistoryEntry, DailyMission } from '../types';
import SettingsBar from './SettingsBar';
import Leaderboard from './Leaderboard';
import AchievementsPanel from './AchievementsPanel';
import GameReplayModal from './GameReplayModal';
import socket from '../socket';

interface Props {
  profile: PlayerProfile;
  onCreateGame: () => void;
  onJoinGame: () => void;
  onFindMatch?: () => void;
  searching?: boolean;
  onCancelMatch?: () => void;
  onCreateAIGame?: (difficulty: string) => void;
}

type Tab = 'home' | 'stats' | 'achievements' | 'rankings';

function GameRow({ game, playerName, t, onReplay }: { game: CompletedGame; playerName: string; t: (k: string) => string; onReplay?: (gameId: string) => void }) {
  const resultColor = game.result === 'win' ? 'text-emerald-400' : game.result === 'loss' ? 'text-red-400' : 'text-amber-400';
  const resultEmoji = game.result === 'win' ? '🏆' : game.result === 'loss' ? '😔' : '🤝';
  const me = game.players.find((p) => p.name === playerName) ?? game.players[0];
  const opponent = game.players.find((p) => p.name !== playerName) ?? game.players[1];
  const date = new Date(game.date);
  const dateStr = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="glass rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg">{resultEmoji}</span>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            <span className="text-white">{t('vs')} {opponent?.name ?? '?'}</span>
          </div>
          <div className="text-[10px] text-gray-500">{dateStr} &middot; {game.language.toUpperCase()}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onReplay && (
          <button
            onClick={(e) => { e.stopPropagation(); onReplay(game.gameId); }}
            className="text-amber-400/60 hover:text-amber-400 transition-colors text-sm"
            title={t('replayWatch')}
          >
            🎬
          </button>
        )}
        <div className={`text-lg font-black tabular-nums ${resultColor}`}>
          {me?.score ?? 0}<span className="text-gray-600 text-xs font-normal">-{opponent?.score ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ profile, onCreateGame, onJoinGame, onFindMatch, searching, onCancelMatch, onCreateAIGame }: Props) {
  const { t, lang } = useLang();
  const { setUnlockedThemes } = useTheme();
  const { history, stats, fetchHistory } = useGameHistory();
  const [tab, setTab] = useState<Tab>('home');
  const [isClaimed, setIsClaimed] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimPw, setClaimPw] = useState('');
  const [claimMsg, setClaimMsg] = useState('');
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [replayData, setReplayData] = useState<{
    players: ClientPlayer[];
    moveHistory: MoveHistoryEntry[];
    winnerId: string | null;
  } | null>(null);
  const [loadingReplay, setLoadingReplay] = useState(false);

  const openReplay = useCallback((gameId: string) => {
    setLoadingReplay(true);
    socket.emit('get-game-replay', { gameId }, (res: any) => {
      setLoadingReplay(false);
      if (!res.success) return;
      // Synthesize ClientPlayer[] from game data
      const players: ClientPlayer[] = res.players.map((p: any, i: number) => ({
        id: `p${i}`,
        name: p.name,
        score: p.score,
        tileCount: 0,
        connected: true,
      }));
      const winnerId = res.winnerName
        ? players.find((p: ClientPlayer) => p.name === res.winnerName)?.id ?? null
        : null;
      setReplayData({ players, moveHistory: res.moveHistory, winnerId });
    });
  }, []);

  useEffect(() => {
    if (profile.name) fetchHistory(profile.name);
    if (profile.token) {
      socket.emit('check-my-claim', { token: profile.token, name: profile.name }, (res: any) => {
        setIsClaimed(!!res.claimed);
      });
      // Load unlocked themes
      socket.emit('get-profile', { token: profile.token }, (res: any) => {
        if (res.unlockedThemes) setUnlockedThemes(new Set(res.unlockedThemes));
      });
      // Load daily missions
      socket.emit('get-daily-missions', { token: profile.token }, (res: any) => {
        if (res.missions) setMissions(res.missions);
      });
    }

    const onMissionCompleted = (data: { missions: DailyMission[] }) => {
      setMissions(data.missions);
    };
    socket.on('mission-completed', onMissionCompleted);

    return () => {
      socket.off('mission-completed', onMissionCompleted);
    };
  }, [profile.name, profile.token, fetchHistory]);

  const handleClaim = () => {
    if (!claimPw.trim() || claimPw.length < 3) { setClaimMsg(t('authPwTooShort')); return; }
    socket.emit('claim-name', { token: profile.token, password: claimPw.trim() }, (res: any) => {
      if (res.success) {
        setIsClaimed(true);
        setShowClaimModal(false);
        setClaimPw('');
      } else {
        setClaimMsg(res.error ?? t('authError'));
      }
    });
  };

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const hasStats = stats.gamesPlayed > 0;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'home', label: t('tabHome'), icon: '🏠' },
    { key: 'stats', label: t('tabStats'), icon: '📊' },
    { key: 'achievements', label: t('tabAchievements'), icon: '🏅' },
    { key: 'rankings', label: t('tabRankings'), icon: '🏆' },
  ];

  return (
    <div className="min-h-screen p-4 pb-20 relative z-10">
      <div className="fixed top-4 right-4 z-50"><SettingsBar /></div>

      <div className="max-w-lg mx-auto pt-6 space-y-5 animate-slide-up">
        {/* Header compact */}
        <div className="text-center">
          <h1 className="text-3xl font-black gradient-text">Lettrix</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {t('welcome')}, <span className="text-white font-bold">{profile.name}</span>
            {stats.currentStreak > 1 && <span className="ml-1.5 text-amber-400">🔥 {stats.currentStreak}</span>}
          </p>
        </div>

        {/* Name claim status */}
        <div className="flex justify-center">
          {isClaimed ? (
            <span className="glass rounded-full px-3 py-1 text-xs text-emerald-400 flex items-center gap-1.5">
              <span>🔒</span> {t('authNameProtected')}
            </span>
          ) : (
            <button onClick={() => setShowClaimModal(true)}
              className="glass rounded-full px-3 py-1.5 text-xs text-gray-400 hover:text-amber-400 transition-all flex items-center gap-1.5">
              <span>🔓</span> {t('authClaimName')}
            </button>
          )}
        </div>

        {/* Claim modal */}
        {showClaimModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowClaimModal(false)}>
            <div className="glass-strong rounded-2xl p-6 max-w-sm w-full gradient-border animate-slide-up space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="text-lg font-bold gradient-text">{t('authClaimTitle')}</h3>
                <p className="text-xs text-gray-400 mt-1">{t('authClaimDesc')}</p>
              </div>
              {claimMsg && <div className="text-red-300 text-xs text-center">{claimMsg}</div>}
              <input type="password" placeholder={t('authChoosePassword')} value={claimPw}
                onChange={(e) => { setClaimPw(e.target.value); setClaimMsg(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleClaim(); }}
                className="w-full px-4 py-3 glass rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 text-center" />
              <button onClick={handleClaim} disabled={claimPw.length < 3}
                className="w-full py-3 rounded-xl font-bold transition-all bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 active:scale-[0.98]">
                {t('authClaimConfirm')}
              </button>
              <button onClick={() => setShowClaimModal(false)} className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition-colors">
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Find Match - big prominent button */}
        {onFindMatch && !searching && (
          <button onClick={onFindMatch}
            className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500 hover:shadow-lg hover:shadow-emerald-500/25 btn-glow btn-glow-green active:scale-[0.98] animate-pulse-glow">
            {t('findMatch')}
          </button>
        )}

        {/* Searching state */}
        {searching && (
          <div className="glass-strong rounded-xl p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-emerald-400 font-bold">{t('searching')}...</span>
            </div>
            {onCancelMatch && (
              <button onClick={onCancelMatch}
                className="px-6 py-2 glass rounded-xl text-sm text-gray-400 hover:text-white transition-all active:scale-[0.97]">
                {t('cancelSearch')}
              </button>
            )}
          </div>
        )}

        {/* AI Game */}
        {onCreateAIGame && (
          <div className="glass rounded-xl p-3 space-y-2">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">{t('playVsAI')}</div>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button key={diff} onClick={() => onCreateAIGame(diff)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.97] ${
                    diff === 'easy' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' :
                    diff === 'medium' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900' :
                    'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                  }`}>
                  {diff === 'easy' ? '🟢' : diff === 'medium' ? '🟡' : '🔴'} {t(`ai${diff.charAt(0).toUpperCase() + diff.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={onCreateGame}
            className="flex-1 py-3 rounded-xl font-bold text-base transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/20 btn-glow btn-glow-amber active:scale-[0.98]">
            {t('createGame')}
          </button>
          <button onClick={onJoinGame}
            className="flex-1 py-3 glass rounded-xl font-bold text-base transition-all duration-300 text-white hover:bg-white/10 btn-glow btn-glow-blue active:scale-[0.98]">
            {t('joinGame')}
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 glass rounded-full p-1">
          {tabs.map((tb) => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center justify-center gap-1.5
                ${tab === tb.key ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}>
              <span>{tb.icon}</span>
              <span>{tb.label}</span>
            </button>
          ))}
        </div>

        {/* ── TAB: Home ── */}
        {tab === 'home' && (
          <div className="space-y-4">
            {/* Daily Streak */}
            <div className={`glass rounded-xl p-4 text-center ${stats.dailyStreak > 0 ? 'glow-amber' : ''}`}>
              {stats.dailyStreak > 0 ? (
                <div>
                  <span className="text-3xl font-black" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {stats.dailyStreak}
                  </span>
                  <span className="text-lg ml-2" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {t('streakDays')}
                  </span>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">{t('startStreak')}</p>
              )}
            </div>

            {/* Daily Missions */}
            {missions.length > 0 && (
              <div className="glass rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('dailyMissions')}</h3>
                  <span className="text-xs text-gray-500">[{missions.filter(m => m.progress >= m.target).length}/{missions.length}]</span>
                </div>
                <div className="space-y-2">
                  {missions.map((m) => {
                    const done = m.progress >= m.target;
                    const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
                    return (
                      <div key={m.id} className={`rounded-lg p-2.5 transition-all ${done ? 'bg-emerald-500/10' : 'glass'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">{done ? '\u2705' : '\u2b1c'}</span>
                            <span className={`text-sm ${done ? 'text-emerald-400 line-through' : 'text-gray-300'}`}>
                              {lang === 'fr' ? m.desc.fr : m.desc.en}
                            </span>
                          </div>
                          <span className={`text-xs font-bold whitespace-nowrap ${done ? 'text-emerald-400' : 'text-amber-400'}`}>+{m.xp} XP</span>
                        </div>
                        {!done && (
                          <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                        {!done && m.target > 1 && (
                          <div className="text-right text-[10px] text-gray-600 mt-0.5">{m.progress}/{m.target}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {missions.length >= 3 && (
                  <div className="border-t border-white/5 pt-2 text-center">
                    <span className="text-xs text-gray-500">{t('missionsBonus')} &rarr; +50 XP {t('bonusXP')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick stats row */}
            {hasStats && (
              <div className="glass rounded-xl p-4 flex items-center justify-around text-center">
                <div>
                  <div className="text-2xl font-black gradient-text">{stats.gamesPlayed}</div>
                  <div className="text-[10px] text-gray-500">{t('gamesPlayed')}</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className="text-2xl font-black text-emerald-400">{stats.gamesWon}</div>
                  <div className="text-[10px] text-gray-500">{t('gamesWon')}</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className={`text-2xl font-black ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{winRate}%</div>
                  <div className="text-[10px] text-gray-500">{t('winRate')}</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className="text-2xl font-black text-amber-400">{stats.bestScore || '-'}</div>
                  <div className="text-[10px] text-gray-500">{t('bestScore')}</div>
                </div>
              </div>
            )}

            {/* Recent games */}
            <div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('recentGames')}</h2>
              {history.length === 0 ? (
                <div className="glass rounded-xl p-6 text-center">
                  <div className="text-3xl mb-2">🎮</div>
                  <p className="text-gray-400 text-sm">{t('noGamesYet')}</p>
                  <p className="text-gray-600 text-xs mt-1">{t('subtitle')}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {history.slice(0, 5).map((g, i) => (
                    <GameRow key={i} game={g} playerName={profile.name} t={t} onReplay={g.hasReplay ? openReplay : undefined} />
                  ))}
                  {history.length > 5 && (
                    <button onClick={() => setTab('stats')} className="w-full text-center text-xs text-gray-500 hover:text-amber-400 py-2 transition-colors">
                      {t('seeAll')} ({history.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Stats ── */}
        {tab === 'stats' && (
          <div className="space-y-4">
            {!hasStats ? (
              <div className="glass rounded-xl p-8 text-center">
                <div className="text-3xl mb-2">📊</div>
                <p className="text-gray-400 text-sm">{t('noGamesYet')}</p>
              </div>
            ) : (
              <>
                {/* Performance */}
                <div className="glass rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('statPerformance')}</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-xl font-black gradient-text">{stats.gamesPlayed}</div>
                      <div className="text-[10px] text-gray-500">{t('gamesPlayed')}</div>
                    </div>
                    <div>
                      <div className="text-xl font-black text-emerald-400">{stats.gamesWon}</div>
                      <div className="text-[10px] text-gray-500">{t('gamesWon')}</div>
                    </div>
                    <div>
                      <div className={`text-xl font-black ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{winRate}%</div>
                      <div className="text-[10px] text-gray-500">{t('winRate')}</div>
                    </div>
                  </div>
                  {/* Win rate bar */}
                  <div className="h-2 glass rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${winRate >= 50 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${winRate}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>{t('currentStreak')}: {stats.currentStreak} 🔥</span>
                    <span>{t('bestStreak')}: {stats.bestStreak}</span>
                  </div>
                </div>

                {/* Scoring records */}
                <div className="glass rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('statRecords')}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">💎 {t('bestScore')}</span>
                      <span className="font-black gradient-text">{stats.bestScore}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">🔥 {t('bestWord')}</span>
                      <span className="font-black text-amber-400">{stats.bestWord || '-'} <span className="text-xs text-gray-500">{stats.bestWordScore ? `+${stats.bestWordScore}` : ''}</span></span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">📏 {t('longestWord')}</span>
                      <span className="font-bold text-white">{stats.longestWord || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">📊 {t('avgPerGame')}</span>
                      <span className="font-bold text-white">{stats.avgScorePerGame}</span>
                    </div>
                  </div>
                </div>

                {/* Activity */}
                <div className="glass rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('statActivity')}</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-black text-white">{stats.totalWordsPlayed}</div>
                      <div className="text-[10px] text-gray-500">{t('wordsPlayed')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-purple-400">{stats.bingos}</div>
                      <div className="text-[10px] text-gray-500">{t('bingos')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-white">{stats.totalScore}</div>
                      <div className="text-[10px] text-gray-500">{t('totalPoints')}</div>
                    </div>
                  </div>
                </div>

                {/* Full game history */}
                {history.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('recentGames')}</h3>
                    <div className="space-y-1.5">
                      {history.slice(0, 20).map((g, i) => (
                        <GameRow key={i} game={g} playerName={profile.name} t={t} onReplay={g.hasReplay ? openReplay : undefined} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TAB: Achievements ── */}
        {tab === 'achievements' && (
          <AchievementsPanel token={profile.token} />
        )}

        {/* ── TAB: Rankings ── */}
        {tab === 'rankings' && (
          <Leaderboard />
        )}
      </div>

      {/* Loading replay indicator */}
      {loadingReplay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-strong rounded-2xl p-8 text-center animate-slide-up">
            <div className="flex gap-1.5 justify-center mb-3">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
            <p className="text-gray-400 text-sm">{t('replayGenerating')}</p>
          </div>
        </div>
      )}

      {/* Replay modal */}
      {replayData && (
        <GameReplayModal
          players={replayData.players}
          moveHistory={replayData.moveHistory}
          winnerId={replayData.winnerId}
          board={Array.from({ length: 15 }, () => Array(15).fill(null))}
          onClose={() => setReplayData(null)}
        />
      )}

      {/* Footer */}
      <div className="text-center text-[10px] text-gray-600 py-4 select-none">
        Lettrix v1.0 &middot; <a href="https://github.com/Rastaba/lettrix" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors underline">Open Source</a>
      </div>
    </div>
  );
}
