import { useState, useCallback } from 'react';
import socket from '../socket';

export interface CompletedGame {
  gameId: string;
  date: string;
  language: string;
  players: { name: string; score: number }[];
  winnerName: string | null;
  moveCount: number;
  bestWord: string;
  bestWordScore: number;
  result: 'win' | 'loss' | 'tie';
  hasReplay?: boolean;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  bestScore: number;
  bestWord: string;
  bestWordScore: number;
  totalWordsPlayed: number;
  totalTilesPlayed: number;
  longestWord: string;
  bingos: number;
  avgScorePerGame: number;
  avgScorePerWord: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedAt: string;
  dailyStreak: number;
  lastStreakDate: string;
}

const DEFAULT_STATS: PlayerStats = {
  gamesPlayed: 0, gamesWon: 0, totalScore: 0, bestScore: 0, bestWord: '', bestWordScore: 0,
  totalWordsPlayed: 0, totalTilesPlayed: 0, longestWord: '', bingos: 0,
  avgScorePerGame: 0, avgScorePerWord: 0, currentStreak: 0, bestStreak: 0, lastPlayedAt: '',
  dailyStreak: 0, lastStreakDate: '',
};

export function useGameHistory() {
  const [history, setHistory] = useState<CompletedGame[]>([]);
  const [stats, setStats] = useState<PlayerStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback((playerName: string) => {
    if (!playerName) return;
    setLoading(true);
    socket.emit('get-game-history', { playerName }, (res: any) => {
      if (res.history) setHistory(res.history.map((g: any) => ({ ...g, gameId: g.gameId ?? g.id })));
      setLoading(false);
    });
    socket.emit('get-player-stats', { playerName }, (res: any) => {
      if (res.stats) setStats(res.stats);
    });
  }, []);

  return { history, stats, loading, fetchHistory };
}
