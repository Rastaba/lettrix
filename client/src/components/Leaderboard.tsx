import { useState, useEffect } from 'react';
import { useLang } from '../contexts/LangContext';
import socket from '../socket';

interface LeaderboardEntry {
  name: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalScore: number;
  bestScore: number;
}

interface FameEntry {
  playerName: string;
  word: string;
  score: number;
  date: string;
}

type Tab = 'players' | 'words' | 'scores';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>('players');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [bestWords, setBestWords] = useState<FameEntry[]>([]);
  const [bestScores, setBestScores] = useState<{ name: string; score: number; date: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function fetch() {
      socket.emit('get-leaderboard', {}, (res: any) => {
        if (res.leaderboard) setLeaderboard(res.leaderboard);
        if (res.wallOfFame) {
          setBestWords(res.wallOfFame.bestWords ?? []);
          setBestScores(res.wallOfFame.bestScores ?? []);
        }
        setLoaded(true);
      });
    }

    if (socket.connected) {
      fetch();
    } else {
      // Ensure socket is connected before fetching
      if (!socket.connected) socket.connect();
      socket.once('connect', fetch);
    }

    return () => { socket.off('connect', fetch); };
  }, []);

  const isEmpty = leaderboard.length === 0 && bestWords.length === 0;

  if (!loaded) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'players', label: t('lbPlayers') },
    { key: 'words', label: t('lbBestWords') },
    { key: 'scores', label: t('lbBestScores') },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t('leaderboard')}</h2>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-full p-0.5">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all duration-300
              ${tab === tb.key ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        {tab === 'players' && leaderboard.length === 0 && (
          <div className="glass rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-gray-400 text-sm">{t('noDataYet')}</p>
          </div>
        )}

        {tab === 'players' && leaderboard.slice(0, 10).map((p, i) => (
          <div key={p.name} className="glass rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-lg w-7 text-center">{MEDALS[i] ?? <span className="text-gray-600 text-sm font-mono">{i + 1}</span>}</span>
              <div>
                <div className="text-sm font-bold text-white">{p.name}</div>
                <div className="text-[10px] text-gray-500">
                  {p.gamesPlayed} {t('gamesPlayed').toLowerCase()} &middot; {p.winRate}% {t('winRate').toLowerCase()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black gradient-text">{p.gamesWon}</div>
              <div className="text-[10px] text-gray-500">{t('gamesWon').toLowerCase()}</div>
            </div>
          </div>
        ))}

        {tab === 'words' && (bestWords.length === 0 ? (
          <div className="glass rounded-xl p-4 text-center text-gray-500 text-sm">{t('noDataYet')}</div>
        ) : bestWords.slice(0, 10).map((w, i) => (
          <div key={i} className="glass rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-lg w-7 text-center">{MEDALS[i] ?? <span className="text-gray-600 text-sm font-mono">{i + 1}</span>}</span>
              <div>
                <div className="text-sm font-bold text-amber-400">{w.word}</div>
                <div className="text-[10px] text-gray-500">
                  {w.playerName} &middot; {new Date(w.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>
            <div className="text-lg font-black text-emerald-400 text-glow-green">+{w.score}</div>
          </div>
        )))}

        {tab === 'scores' && (bestScores.length === 0 ? (
          <div className="glass rounded-xl p-4 text-center text-gray-500 text-sm">{t('noDataYet')}</div>
        ) : bestScores.slice(0, 10).map((s, i) => (
          <div key={i} className="glass rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-lg w-7 text-center">{MEDALS[i] ?? <span className="text-gray-600 text-sm font-mono">{i + 1}</span>}</span>
              <div>
                <div className="text-sm font-bold text-white">{s.name}</div>
                <div className="text-[10px] text-gray-500">
                  {new Date(s.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>
            <div className="text-lg font-black gradient-text">{s.score}</div>
          </div>
        )))}
      </div>
    </div>
  );
}
