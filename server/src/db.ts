import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import type { MoveHistoryEntry } from './types';

const DB_FILE = path.join(__dirname, '../data/db.json');
const BCRYPT_ROUNDS = 12;

function hashPwSync(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function verifyPw(password: string, hash: string): boolean {
  // Support legacy SHA256 hashes (64 hex chars) during migration
  if (hash.length === 64 && /^[a-f0-9]+$/.test(hash)) {
    const legacySalt = process.env.PASSWORD_SALT || 'lettrix-dev';
    const legacyHash = crypto.createHash('sha256').update(password + legacySalt).digest('hex');
    if (legacyHash === hash) return true;
  }
  return bcrypt.compareSync(password, hash);
}

// ── Types ──

export interface DailyMission {
  id: string;
  type: 'play_games' | 'score_move' | 'word_length' | 'win_game' | 'total_score';
  target: number;
  progress: number;
  xp: number;
  desc: { fr: string; en: string };
}

export interface PlayerRecord {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  passwordHash?: string; // if set, name is "claimed"
  stats: PlayerStatsData;
  xp: number;
  achievements: string[];
  unlockedThemes: string[];
  dailyMissions: DailyMission[];
  dailyMissionsDate: string;
}

export interface PlayerStatsData {
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

export interface GameRecord {
  id: string;
  date: string;
  language: string;
  players: { name: string; score: number }[];
  winnerName: string | null;
  moveCount: number;
  bestWord: string;
  bestWordScore: number;
  moveHistory?: MoveHistoryEntry[];
}

export interface EpicMoveRecord {
  playerName: string;
  word: string;
  score: number;
  date: string;
  language: string;
}

interface DB {
  players: Record<string, PlayerRecord>;
  games: GameRecord[];
  epicMoves: EpicMoveRecord[];
}

// ── State ──

let db: DB = { players: {}, games: [], epicMoves: [] };

// ── Persistence ──

export function loadDB(): void {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      console.log(`DB loaded: ${Object.keys(db.players).length} players, ${db.games.length} games`);
    } else {
      console.log('No DB found, starting fresh');
    }
  } catch {
    console.warn('Failed to load DB, starting fresh');
    db = { players: {}, games: [], epicMoves: [] };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
      console.error('DB save failed:', e);
    }
  }, 1000);
}

// ── Players ──

export function getOrCreatePlayer(token: string, name: string): PlayerRecord {
  if (!db.players[token]) {
    db.players[token] = {
      id: 'p_' + crypto.randomBytes(16).toString('hex'),
      name,
      token,
      createdAt: new Date().toISOString(),
      stats: {
        gamesPlayed: 0, gamesWon: 0, totalScore: 0, bestScore: 0,
        bestWord: '', bestWordScore: 0,
        totalWordsPlayed: 0, totalTilesPlayed: 0, longestWord: '',
        bingos: 0, avgScorePerGame: 0, avgScorePerWord: 0,
        currentStreak: 0, bestStreak: 0, lastPlayedAt: '',
        dailyStreak: 0, lastStreakDate: '',
      },
      xp: 0,
      achievements: [],
      unlockedThemes: ['classic', 'neon'],
      dailyMissions: [],
      dailyMissionsDate: '',
    };
  } else {
    db.players[token].name = name;
    // Migrate old records
    db.players[token].dailyMissions ??= [];
    db.players[token].dailyMissionsDate ??= '';
    db.players[token].stats.dailyStreak ??= 0;
    db.players[token].stats.lastStreakDate ??= '';
  }
  scheduleSave();
  return db.players[token];
}

export function getPlayerByToken(token: string): PlayerRecord | null {
  return db.players[token] ?? null;
}

export function getPlayerByName(name: string): PlayerRecord | null {
  return Object.values(db.players).find((p) => p.name === name) ?? null;
}

// ── Record game result ──

export function recordGameResult(
  gameData: GameRecord,
  playerTokens: { token: string; name: string; score: number; won: boolean }[],
  moves: MoveHistoryEntry[],
): void {
  // Save game with full move history for replays
  gameData.moveHistory = moves;
  db.games.unshift(gameData);
  if (db.games.length > 500) db.games.length = 500;

  // Update player stats
  for (const pt of playerTokens) {
    const player = db.players[pt.token];
    if (!player) continue;
    const s = player.stats;

    // Ensure new fields exist (migration from old data)
    s.totalWordsPlayed ??= 0;
    s.totalTilesPlayed ??= 0;
    s.longestWord ??= '';
    s.bingos ??= 0;
    s.avgScorePerGame ??= 0;
    s.avgScorePerWord ??= 0;
    s.currentStreak ??= 0;
    s.bestStreak ??= 0;
    s.lastPlayedAt ??= '';
    s.dailyStreak ??= 0;
    s.lastStreakDate ??= '';

    // Update daily streak
    updateDailyStreak(pt.token);

    s.gamesPlayed++;
    s.totalScore += pt.score;
    s.lastPlayedAt = new Date().toISOString();

    // Win tracking + streak
    if (pt.won) {
      s.gamesWon++;
      s.currentStreak++;
      if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
    } else {
      s.currentStreak = 0;
    }

    // Best single-game score
    if (pt.score > s.bestScore) s.bestScore = pt.score;

    // Per-move stats for this player
    let wordsThisGame = 0;
    for (const m of moves) {
      if (m.playerName !== pt.name || m.type !== 'play') continue;

      wordsThisGame++;
      s.totalWordsPlayed++;

      // Best word by score
      if (m.score > s.bestWordScore) {
        s.bestWord = m.words.join(', ');
        s.bestWordScore = m.score;
      }

      // Longest word by letters
      for (const w of m.words) {
        if (w.length > s.longestWord.length) s.longestWord = w;
      }

      // Full rack detection (all 7 tiles placed in one move)
      if (m.isFullRack) { s.bingos++; }
    }

    // Averages
    s.avgScorePerGame = Math.round(s.totalScore / s.gamesPlayed);
    s.avgScorePerWord = s.totalWordsPlayed > 0 ? Math.round(s.totalScore / s.totalWordsPlayed) : 0;
  }

  // Epic moves (20+ pts)
  for (const m of moves) {
    if (m.type === 'play' && m.score >= 20) {
      db.epicMoves.push({
        playerName: m.playerName,
        word: m.words.join(', '),
        score: m.score,
        date: gameData.date,
        language: gameData.language,
      });
    }
  }
  db.epicMoves.sort((a, b) => b.score - a.score);
  if (db.epicMoves.length > 100) db.epicMoves.length = 100;

  scheduleSave();
}

// ── Queries ──

export function getPlayerHistory(playerName: string): (Omit<GameRecord, 'moveHistory'> & { result: string; hasReplay: boolean })[] {
  return db.games
    .filter((g) => g.players.some((p) => p.name === playerName))
    .slice(0, 50)
    .map((g) => {
      // Don't send moveHistory in listing — too heavy
      const { moveHistory, ...rest } = g;
      return {
        ...rest,
        result: g.winnerName === null ? 'tie' : g.winnerName === playerName ? 'win' : 'loss',
        hasReplay: !!moveHistory && moveHistory.length > 0,
      };
    });
}

export function getGameReplay(gameId: string): { moveHistory: MoveHistoryEntry[]; players: { name: string; score: number }[]; winnerName: string | null } | null {
  const game = db.games.find((g) => g.id === gameId);
  if (!game || !game.moveHistory) return null;
  return { moveHistory: game.moveHistory, players: game.players, winnerName: game.winnerName };
}

export function getPlayerStats(playerName: string): PlayerStatsData {
  const player = Object.values(db.players).find((p) => p.name === playerName);
  if (player) {
    // Migrate old records
    player.stats.dailyStreak ??= 0;
    player.stats.lastStreakDate ??= '';
  }
  return player?.stats ?? {
    gamesPlayed: 0, gamesWon: 0, totalScore: 0, bestScore: 0, bestWord: '', bestWordScore: 0,
    totalWordsPlayed: 0, totalTilesPlayed: 0, longestWord: '', bingos: 0,
    avgScorePerGame: 0, avgScorePerWord: 0, currentStreak: 0, bestStreak: 0, lastPlayedAt: '',
    dailyStreak: 0, lastStreakDate: '',
  };
}

export function getLeaderboard() {
  return Object.values(db.players)
    .filter((p) => p.stats.gamesPlayed > 0)
    .map((p) => ({
      name: p.name,
      gamesPlayed: p.stats.gamesPlayed,
      gamesWon: p.stats.gamesWon,
      winRate: p.stats.gamesPlayed > 0 ? Math.round((p.stats.gamesWon / p.stats.gamesPlayed) * 100) : 0,
      totalScore: p.stats.totalScore,
      bestScore: p.stats.bestScore,
    }))
    .sort((a, b) => b.gamesWon - a.gamesWon || b.totalScore - a.totalScore);
}

export function getWallOfFame() {
  return {
    bestWords: db.epicMoves.slice(0, 10),
    bestScores: db.games
      .flatMap((g) => g.players.map((p) => ({ name: p.name, score: p.score, date: g.date })))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),
  };
}

// ── Account / Name Protection ──

export function isNameClaimed(name: string): boolean {
  return Object.values(db.players).some((p) => p.name.toLowerCase() === name.toLowerCase() && !!p.passwordHash);
}

export function claimName(token: string, password: string): { success: boolean; error?: string } {
  const player = db.players[token];
  if (!player) return { success: false, error: 'Player not found' };
  if (player.passwordHash) return { success: false, error: 'Already claimed' };

  // Check no other player claimed this name
  const conflict = Object.values(db.players).find(
    (p) => p.token !== token && p.name.toLowerCase() === player.name.toLowerCase() && !!p.passwordHash,
  );
  if (conflict) return { success: false, error: 'Name already taken' };

  player.passwordHash = hashPwSync(password);
  scheduleSave();
  return { success: true };
}

export function loginWithPassword(name: string, password: string): { success: boolean; token?: string; error?: string } {
  const player = Object.values(db.players).find(
    (p) => p.name.toLowerCase() === name.toLowerCase() && !!p.passwordHash,
  );
  if (!player) return { success: false, error: 'No account with this name' };
  if (!verifyPw(password, player.passwordHash!)) return { success: false, error: 'Wrong password' };
  // Migrate legacy SHA256 hash to bcrypt on successful login
  if (player.passwordHash!.length === 64 && /^[a-f0-9]+$/.test(player.passwordHash!)) {
    player.passwordHash = hashPwSync(password);
    scheduleSave();
  }
  return { success: true, token: player.token };
}

export function isPlayerClaimed(token: string): boolean {
  return !!db.players[token]?.passwordHash;
}

// ── XP & Achievements ──

export function addXp(token: string, amount: number): void {
  const player = db.players[token];
  if (!player) return;
  player.xp = (player.xp ?? 0) + amount;
  scheduleSave();
}

// Achievement → theme unlock mapping
const ACHIEVEMENT_THEME_MAP: Record<string, string> = {
  first_win: 'ocean',
  games_10: 'sakura',
  streak_3: 'hacker',
  score_50: 'gold',
  wins_50: 'midnight',
  game_500: 'retro',
  total_50k: 'aurora',
};

export function addAchievements(token: string, ids: string[]): void {
  const player = db.players[token];
  if (!player) return;
  if (!player.achievements) player.achievements = [];
  if (!player.unlockedThemes) player.unlockedThemes = ['classic', 'neon'];

  for (const id of ids) {
    if (!player.achievements.includes(id)) player.achievements.push(id);
    // Auto-unlock theme if achievement grants one
    const theme = ACHIEVEMENT_THEME_MAP[id];
    if (theme && !player.unlockedThemes.includes(theme)) {
      player.unlockedThemes.push(theme);
    }
  }
  scheduleSave();
}

export function getPlayerAchievements(token: string): string[] {
  return db.players[token]?.achievements ?? [];
}

export function getPlayerXp(token: string): number {
  return db.players[token]?.xp ?? 0;
}

// ── Daily Streak ──

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function updateDailyStreak(token: string): { streak: number; isNew: boolean } {
  const player = db.players[token];
  if (!player) return { streak: 0, isNew: false };
  const s = player.stats;
  s.dailyStreak ??= 0;
  s.lastStreakDate ??= '';

  const today = getTodayStr();
  if (s.lastStreakDate === today) {
    return { streak: s.dailyStreak, isNew: false };
  }

  if (s.lastStreakDate === getYesterdayStr()) {
    s.dailyStreak++;
  } else {
    s.dailyStreak = 1;
  }
  s.lastStreakDate = today;
  scheduleSave();
  return { streak: s.dailyStreak, isNew: true };
}

// ── H2H Record ──

export function getH2HRecord(name1: string, name2: string): { wins1: number; wins2: number; total: number; lastGameDate: string } {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();
  let wins1 = 0;
  let wins2 = 0;
  let total = 0;
  let lastGameDate = '';

  for (const g of db.games) {
    const names = g.players.map((p) => p.name.toLowerCase());
    if (names.includes(n1) && names.includes(n2)) {
      total++;
      if (!lastGameDate || g.date > lastGameDate) lastGameDate = g.date;
      if (g.winnerName?.toLowerCase() === n1) wins1++;
      else if (g.winnerName?.toLowerCase() === n2) wins2++;
    }
  }

  return { wins1, wins2, total, lastGameDate };
}

// ── Daily Missions ──

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

interface MissionTemplate {
  type: DailyMission['type'];
  targetRange: [number, number];
  xpRange: [number, number];
  desc: (n: number) => { fr: string; en: string };
}

const MISSION_TEMPLATES: MissionTemplate[] = [
  { type: 'play_games', targetRange: [1, 3], xpRange: [20, 30], desc: (n) => ({ fr: `Joue ${n} partie${n > 1 ? 's' : ''}`, en: `Play ${n} game${n > 1 ? 's' : ''}` }) },
  { type: 'score_move', targetRange: [20, 40], xpRange: [25, 35], desc: (n) => ({ fr: `Marque ${n}+ pts en un coup`, en: `Score ${n}+ pts in one move` }) },
  { type: 'word_length', targetRange: [5, 7], xpRange: [20, 30], desc: (n) => ({ fr: `Joue un mot de ${n}+ lettres`, en: `Play a word with ${n}+ letters` }) },
  { type: 'win_game', targetRange: [1, 1], xpRange: [40, 40], desc: (_n) => ({ fr: 'Gagne une partie', en: 'Win a game' }) },
  { type: 'total_score', targetRange: [50, 150], xpRange: [30, 40], desc: (n) => ({ fr: `Marque ${n} pts au total aujourd'hui`, en: `Score ${n} total pts today` }) },
  { type: 'play_games', targetRange: [2, 3], xpRange: [25, 35], desc: (n) => ({ fr: `Joue ${n} parties`, en: `Play ${n} games` }) },
  { type: 'score_move', targetRange: [30, 50], xpRange: [30, 40], desc: (n) => ({ fr: `Marque ${n}+ pts en un seul coup`, en: `Score ${n}+ pts in a single move` }) },
  { type: 'word_length', targetRange: [6, 8], xpRange: [25, 35], desc: (n) => ({ fr: `Joue un mot de ${n}+ lettres`, en: `Play a ${n}+ letter word` }) },
];

function generateMissions(date: string, playerName: string): DailyMission[] {
  const seed = simpleHash(date + playerName);
  const rng = seededRandom(seed);

  // Pick 3 unique template indices
  const indices: number[] = [];
  while (indices.length < 3) {
    const idx = Math.floor(rng() * MISSION_TEMPLATES.length);
    if (!indices.includes(idx)) indices.push(idx);
  }

  return indices.map((idx, i) => {
    const t = MISSION_TEMPLATES[idx];
    const target = t.targetRange[0] + Math.floor(rng() * (t.targetRange[1] - t.targetRange[0] + 1));
    const xp = t.xpRange[0] + Math.floor(rng() * (t.xpRange[1] - t.xpRange[0] + 1));
    return {
      id: `mission_${date}_${i}`,
      type: t.type,
      target,
      progress: 0,
      xp,
      desc: t.desc(target),
    };
  });
}

export function getDailyMissions(token: string): DailyMission[] {
  const player = db.players[token];
  if (!player) return [];

  player.dailyMissions ??= [];
  player.dailyMissionsDate ??= '';

  const today = getTodayStr();
  if (player.dailyMissionsDate !== today) {
    player.dailyMissions = generateMissions(today, player.name);
    player.dailyMissionsDate = today;
    scheduleSave();
  }
  return player.dailyMissions;
}

export function updateMissionProgress(token: string, event: string, value: number): { completed: DailyMission[]; missions: DailyMission[] } {
  const player = db.players[token];
  if (!player) return { completed: [], missions: [] };

  // Ensure missions are loaded for today
  getDailyMissions(token);

  const completed: DailyMission[] = [];

  for (const mission of player.dailyMissions) {
    if (mission.progress >= mission.target) continue; // already complete

    let updated = false;
    switch (mission.type) {
      case 'play_games':
        if (event === 'game_finish') { mission.progress += value; updated = true; }
        break;
      case 'score_move':
        if (event === 'play_move' && value >= mission.target) { mission.progress = mission.target; updated = true; }
        break;
      case 'word_length':
        if (event === 'word_length' && value >= mission.target) { mission.progress = mission.target; updated = true; }
        break;
      case 'win_game':
        if (event === 'win_game') { mission.progress += value; updated = true; }
        break;
      case 'total_score':
        if (event === 'total_score') { mission.progress += value; updated = true; }
        break;
    }

    if (updated && mission.progress >= mission.target) {
      mission.progress = mission.target;
      completed.push(mission);
      // Award XP
      addXp(token, mission.xp);
    }
  }

  if (completed.length > 0 || player.dailyMissions.some((m) => m.progress > 0)) {
    scheduleSave();
  }

  return { completed, missions: player.dailyMissions };
}
