import { Game } from './game/Game';
import { MoveHistoryEntry } from './types';

// ── Achievement Definitions ──

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AchievementDef {
  id: string;
  icon: string;
  rarity: Rarity;
  xp: number;
  name: { fr: string; en: string };
  desc: { fr: string; en: string };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Premiers pas ──
  { id: 'first_word', icon: '📝', rarity: 'common', xp: 10, name: { fr: 'Premier Mot', en: 'First Word' }, desc: { fr: 'Joue ton premier mot', en: 'Play your first word' } },
  { id: 'first_win', icon: '🏆', rarity: 'common', xp: 20, name: { fr: 'Première Victoire', en: 'First Victory' }, desc: { fr: 'Gagne ta première partie', en: 'Win your first game' } },
  { id: 'first_game', icon: '🎮', rarity: 'common', xp: 10, name: { fr: 'Bienvenue', en: 'Welcome' }, desc: { fr: 'Termine ta première partie', en: 'Complete your first game' } },

  // ── Perseverance ──
  { id: 'games_10', icon: '🎯', rarity: 'common', xp: 30, name: { fr: 'Habitué', en: 'Regular' }, desc: { fr: 'Joue 10 parties', en: 'Play 10 games' } },
  { id: 'games_50', icon: '💪', rarity: 'rare', xp: 75, name: { fr: 'Vétéran', en: 'Veteran' }, desc: { fr: 'Joue 50 parties', en: 'Play 50 games' } },
  { id: 'games_100', icon: '🏅', rarity: 'epic', xp: 150, name: { fr: 'Marathonien', en: 'Marathon Runner' }, desc: { fr: 'Joue 100 parties', en: 'Play 100 games' } },
  { id: 'words_100', icon: '📚', rarity: 'rare', xp: 50, name: { fr: 'Bibliothèque', en: 'Library' }, desc: { fr: 'Joue 100 mots au total', en: 'Play 100 words total' } },
  { id: 'words_500', icon: '📖', rarity: 'epic', xp: 100, name: { fr: 'Encyclopédie', en: 'Encyclopedia' }, desc: { fr: 'Joue 500 mots au total', en: 'Play 500 words total' } },

  // ── Scoring ──
  { id: 'score_20', icon: '⚡', rarity: 'common', xp: 15, name: { fr: 'Bon Début', en: 'Good Start' }, desc: { fr: 'Marque 20+ pts en un coup', en: 'Score 20+ pts in one move' } },
  { id: 'score_30', icon: '🔥', rarity: 'common', xp: 20, name: { fr: 'Beau Coup', en: 'Nice Move' }, desc: { fr: 'Marque 30+ pts en un coup', en: 'Score 30+ pts in one move' } },
  { id: 'score_50', icon: '💎', rarity: 'rare', xp: 40, name: { fr: 'Coup de Maître', en: 'Master Stroke' }, desc: { fr: 'Marque 50+ pts en un coup', en: 'Score 50+ pts in one move' } },
  { id: 'score_70', icon: '👑', rarity: 'epic', xp: 75, name: { fr: 'Coup Royal', en: 'Royal Move' }, desc: { fr: 'Marque 70+ pts en un coup', en: 'Score 70+ pts in one move' } },
  { id: 'score_100', icon: '🌟', rarity: 'legendary', xp: 150, name: { fr: 'Centurion', en: 'Centurion' }, desc: { fr: 'Marque 100+ pts en un coup', en: 'Score 100+ pts in one move' } },
  { id: 'game_200', icon: '🚀', rarity: 'rare', xp: 50, name: { fr: 'Bicentenaire', en: 'Bicentennial' }, desc: { fr: 'Atteins 200+ pts dans une partie', en: 'Reach 200+ pts in a game' } },
  { id: 'game_300', icon: '🛸', rarity: 'epic', xp: 100, name: { fr: 'Stratosphère', en: 'Stratosphere' }, desc: { fr: 'Atteins 300+ pts dans une partie', en: 'Reach 300+ pts in a game' } },
  { id: 'game_400', icon: '☄️', rarity: 'legendary', xp: 200, name: { fr: 'Supernova', en: 'Supernova' }, desc: { fr: 'Atteins 400+ pts dans une partie', en: 'Reach 400+ pts in a game' } },

  // ── Mots ──
  { id: 'full_rack', icon: '🔥', rarity: 'rare', xp: 50, name: { fr: 'LETTRIX !', en: 'LETTRIX!' }, desc: { fr: 'Pose tes 7 lettres en un coup', en: 'Use all 7 tiles in one move' } },
  { id: 'double_full_rack', icon: '🔥🔥', rarity: 'legendary', xp: 200, name: { fr: 'Double Lettrix', en: 'Double Lettrix' }, desc: { fr: '2 Lettrix dans la même partie', en: '2 Lettrix in the same game' } },
  { id: 'long_word_7', icon: '📏', rarity: 'common', xp: 15, name: { fr: 'Mot Long', en: 'Long Word' }, desc: { fr: 'Joue un mot de 7+ lettres', en: 'Play a word with 7+ letters' } },
  { id: 'long_word_9', icon: '📐', rarity: 'rare', xp: 40, name: { fr: 'Mot Fleuve', en: 'River Word' }, desc: { fr: 'Joue un mot de 9+ lettres', en: 'Play a word with 9+ letters' } },

  // ── Lettres rares ──
  { id: 'use_z', icon: '🇿', rarity: 'common', xp: 10, name: { fr: 'Zélé', en: 'Zealous' }, desc: { fr: 'Utilise la lettre Z dans un mot', en: 'Use the letter Z in a word' } },
  { id: 'use_q', icon: '👸', rarity: 'common', xp: 10, name: { fr: 'Question', en: 'Question' }, desc: { fr: 'Utilise la lettre Q dans un mot', en: 'Use the letter Q in a word' } },
  { id: 'use_x', icon: '❌', rarity: 'common', xp: 10, name: { fr: 'Facteur X', en: 'X Factor' }, desc: { fr: 'Utilise la lettre X dans un mot', en: 'Use the letter X in a word' } },
  { id: 'use_all_rare', icon: '💀', rarity: 'epic', xp: 75, name: { fr: 'Collectionneur', en: 'Collector' }, desc: { fr: 'Utilise Q, X et Z dans la même partie', en: 'Use Q, X and Z in the same game' } },

  // ── Victoires ──
  { id: 'wins_5', icon: '⭐', rarity: 'common', xp: 30, name: { fr: '5 Victoires', en: '5 Wins' }, desc: { fr: 'Gagne 5 parties', en: 'Win 5 games' } },
  { id: 'wins_20', icon: '🌟', rarity: 'rare', xp: 75, name: { fr: 'Vingt-aine', en: 'Twenty' }, desc: { fr: 'Gagne 20 parties', en: 'Win 20 games' } },
  { id: 'streak_3', icon: '🔥', rarity: 'common', xp: 25, name: { fr: 'Hat Trick', en: 'Hat Trick' }, desc: { fr: 'Gagne 3 parties de suite', en: 'Win 3 games in a row' } },
  { id: 'streak_5', icon: '🔥🔥', rarity: 'rare', xp: 60, name: { fr: 'Inarrêtable', en: 'Unstoppable' }, desc: { fr: 'Gagne 5 parties de suite', en: 'Win 5 games in a row' } },
  { id: 'streak_10', icon: '👑🔥', rarity: 'legendary', xp: 200, name: { fr: 'Légende Vivante', en: 'Living Legend' }, desc: { fr: 'Gagne 10 parties de suite', en: 'Win 10 games in a row' } },
  { id: 'close_win', icon: '😅', rarity: 'rare', xp: 35, name: { fr: 'Photo Finish', en: 'Photo Finish' }, desc: { fr: 'Gagne avec 5 pts ou moins d\'écart', en: 'Win with 5 pts or less difference' } },
  { id: 'domination', icon: '💀', rarity: 'epic', xp: 75, name: { fr: 'Domination', en: 'Domination' }, desc: { fr: 'Gagne avec 100+ pts d\'écart', en: 'Win with 100+ pts lead' } },
  { id: 'comeback', icon: '🔄', rarity: 'epic', xp: 100, name: { fr: 'Comeback', en: 'Comeback' }, desc: { fr: 'Gagne après avoir été mené de 50+ pts', en: 'Win after being 50+ pts behind' } },

  // ── Fun ──
  { id: 'no_exchange', icon: '🎯', rarity: 'rare', xp: 35, name: { fr: 'Perfectionniste', en: 'Perfectionist' }, desc: { fr: 'Gagne sans jamais échanger', en: 'Win without ever exchanging' } },
  { id: 'total_10k', icon: '🏦', rarity: 'epic', xp: 100, name: { fr: 'Banquier', en: 'Banker' }, desc: { fr: 'Cumule 10 000 points au total', en: 'Accumulate 10,000 total points' } },

  // ── Hard ──
  { id: 'perfect_game', icon: '💯', rarity: 'legendary', xp: 250, name: { fr: 'Partie Parfaite', en: 'Perfect Game' }, desc: { fr: 'Gagne sans passer ni échanger', en: 'Win without passing or exchanging' } },
  { id: 'first_blood', icon: '🩸', rarity: 'epic', xp: 60, name: { fr: 'Premier Sang', en: 'First Blood' }, desc: { fr: 'Marque 30+ pts au premier coup', en: 'Score 30+ on the opening move' } },
  { id: 'hot_streak_5', icon: '🔥⚡', rarity: 'epic', xp: 80, name: { fr: 'En Feu', en: 'On Fire' }, desc: { fr: '5 coups à 20+ pts de suite', en: '5 moves of 20+ pts in a row' } },
  { id: 'long_word_11', icon: '🧬', rarity: 'epic', xp: 75, name: { fr: 'Mot Géant', en: 'Giant Word' }, desc: { fr: 'Joue un mot de 11+ lettres', en: 'Play a word with 11+ letters' } },
  { id: 'long_word_13', icon: '🧪', rarity: 'legendary', xp: 200, name: { fr: 'Mot Monstrueux', en: 'Monstrous Word' }, desc: { fr: 'Joue un mot de 13+ lettres', en: 'Play a word with 13+ letters' } },
  { id: 'wins_50', icon: '🏆⭐', rarity: 'epic', xp: 100, name: { fr: 'Demi-Centurion', en: 'Half-Centurion' }, desc: { fr: 'Gagne 50 parties', en: 'Win 50 games' } },
  { id: 'wins_100', icon: '💎👑', rarity: 'legendary', xp: 250, name: { fr: 'Centenaire', en: 'Centennial' }, desc: { fr: 'Gagne 100 parties', en: 'Win 100 games' } },
  { id: 'total_50k', icon: '💰', rarity: 'legendary', xp: 250, name: { fr: 'Millionnaire', en: 'Millionaire' }, desc: { fr: 'Cumule 50 000 points au total', en: 'Accumulate 50K total points' } },
  { id: 'triple_full_rack', icon: '🔥🔥🔥', rarity: 'legendary', xp: 300, name: { fr: 'Triple Lettrix', en: 'Triple Lettrix' }, desc: { fr: '3 Lettrix dans la même partie', en: '3 Lettrix in the same game' } },
  { id: 'game_500', icon: '🌌', rarity: 'legendary', xp: 300, name: { fr: 'Trou Noir', en: 'Black Hole' }, desc: { fr: 'Atteins 500+ pts dans une partie', en: 'Reach 500+ pts in a game' } },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

// ── XP & Level System ──

export function calculateLevel(xp: number): { level: number; title: { fr: string; en: string }; nextLevelXp: number; progress: number } {
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  const currentLevelXp = Math.pow(level - 1, 2) * 50;
  const nextLevelXp = Math.pow(level, 2) * 50;
  const progress = nextLevelXp > currentLevelXp ? (xp - currentLevelXp) / (nextLevelXp - currentLevelXp) : 0;

  const titles: { fr: string; en: string }[] = [
    { fr: 'Débutant', en: 'Beginner' },
    { fr: 'Apprenti', en: 'Apprentice' },
    { fr: 'Joueur', en: 'Player' },
    { fr: 'Confirmé', en: 'Skilled' },
    { fr: 'Expert', en: 'Expert' },
    { fr: 'Maître', en: 'Master' },
    { fr: 'Grand Maître', en: 'Grand Master' },
    { fr: 'Champion', en: 'Champion' },
    { fr: 'Légende', en: 'Legend' },
    { fr: 'Immortel', en: 'Immortal' },
  ];

  return { level, title: titles[Math.min(level - 1, titles.length - 1)], nextLevelXp, progress };
}

// ── XP Rewards per action ──

export function xpForMove(score: number, isFullRack: boolean): number {
  let xp = 5;
  if (score >= 50) xp += 20;
  else if (score >= 30) xp += 10;
  else if (score >= 20) xp += 5;
  if (isFullRack) xp += 25;
  return xp;
}

export function xpForGameEnd(won: boolean): number {
  return won ? 40 : 10;
}

// ── Check achievements after a game event ──

interface CheckContext {
  playerName: string;
  earned: string[]; // already earned
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    bestScore: number;
    bestWordScore: number;
    totalWordsPlayed: number;
    bingos: number;
    currentStreak: number;
    bestStreak: number;
    longestWord: string;
  };
  // Current game context (if in a game)
  game?: Game;
  lastMove?: MoveHistoryEntry;
  justFinished?: boolean;
  won?: boolean;
}

export function checkAchievements(ctx: CheckContext): string[] {
  const newlyEarned: string[] = [];
  const has = (id: string) => ctx.earned.includes(id);
  const earn = (id: string) => { if (!has(id)) newlyEarned.push(id); };

  const s = ctx.stats;

  // ── Premiers pas ──
  if (s.totalWordsPlayed >= 1) earn('first_word');
  if (s.gamesPlayed >= 1) earn('first_game');
  if (s.gamesWon >= 1) earn('first_win');

  // ── Perseverance ──
  if (s.gamesPlayed >= 10) earn('games_10');
  if (s.gamesPlayed >= 50) earn('games_50');
  if (s.gamesPlayed >= 100) earn('games_100');
  if (s.totalWordsPlayed >= 100) earn('words_100');
  if (s.totalWordsPlayed >= 500) earn('words_500');

  // ── Scoring (from last move) ──
  if (ctx.lastMove && ctx.lastMove.type === 'play') {
    const ms = ctx.lastMove.score;
    if (ms >= 20) earn('score_20');
    if (ms >= 30) earn('score_30');
    if (ms >= 50) earn('score_50');
    if (ms >= 70) earn('score_70');
    if (ms >= 100) earn('score_100');

    // Word length
    for (const w of ctx.lastMove.words) {
      if (w.length >= 7) earn('long_word_7');
      if (w.length >= 9) earn('long_word_9');
    }

    // Full rack
    if (ctx.lastMove.isFullRack) earn('full_rack');

    // Rare letters in this move
    const allLetters = ctx.lastMove.words.join('').toUpperCase();
    if (allLetters.includes('Z')) earn('use_z');
    if (allLetters.includes('Q')) earn('use_q');
    if (allLetters.includes('X')) earn('use_x');
  }

  // ── Game score ──
  if (ctx.game) {
    const myPlayer = ctx.game.players.find((p) => p.name === ctx.playerName);
    if (myPlayer) {
      if (myPlayer.score >= 200) earn('game_200');
      if (myPlayer.score >= 300) earn('game_300');
      if (myPlayer.score >= 400) earn('game_400');
    }

    // Rare letters in entire game
    const myMoves = ctx.game.moveHistory.filter((m) => m.playerName === ctx.playerName && m.type === 'play');
    const gameLetters = myMoves.map((m) => m.words.join('')).join('').toUpperCase();
    if (gameLetters.includes('Q') && gameLetters.includes('X') && gameLetters.includes('Z')) earn('use_all_rare');

    // Double full rack
    const fullRackCount = myMoves.filter((m) => m.isFullRack).length;
    if (fullRackCount >= 2) earn('double_full_rack');
  }

  // ── Victories ──
  if (s.gamesWon >= 5) earn('wins_5');
  if (s.gamesWon >= 20) earn('wins_20');
  if (s.currentStreak >= 3 || s.bestStreak >= 3) earn('streak_3');
  if (s.currentStreak >= 5 || s.bestStreak >= 5) earn('streak_5');
  if (s.currentStreak >= 10 || s.bestStreak >= 10) earn('streak_10');

  // ── End-of-game checks ──
  if (ctx.justFinished && ctx.game && ctx.won) {
    const me = ctx.game.players.find((p) => p.name === ctx.playerName);
    const opp = ctx.game.players.find((p) => p.name !== ctx.playerName);
    if (me && opp) {
      const diff = me.score - opp.score;
      if (diff >= 0 && diff <= 5) earn('close_win');
      if (diff >= 100) earn('domination');
    }

    // No exchange check
    const myExchanges = ctx.game.moveHistory.filter((m) => m.playerName === ctx.playerName && m.type === 'exchange');
    if (myExchanges.length === 0) earn('no_exchange');

    // Comeback: check if opponent was ever 50+ ahead
    // We approximate by checking move history scores
    let myScore = 0, oppScore = 0, wasBehind50 = false;
    for (const m of ctx.game.moveHistory) {
      if (m.type !== 'play') continue;
      if (m.playerName === ctx.playerName) myScore += m.score;
      else oppScore += m.score;
      if (oppScore - myScore >= 50) wasBehind50 = true;
    }
    if (wasBehind50) earn('comeback');
  }

  // ── Cumulative ──
  if (s.totalScore >= 10000) earn('total_10k');
  if (s.totalScore >= 50000) earn('total_50k');
  if (s.bingos >= 1) earn('full_rack'); // redundant safety
  if (s.gamesWon >= 50) earn('wins_50');
  if (s.gamesWon >= 100) earn('wins_100');

  // ── Hard achievements (game context) ──
  if (ctx.game) {
    const myPlayer = ctx.game.players.find((p) => p.name === ctx.playerName);
    if (myPlayer && myPlayer.score >= 500) earn('game_500');

    const myMoves = ctx.game.moveHistory.filter((m) => m.playerName === ctx.playerName);

    // Triple full rack
    const frCount = myMoves.filter((m) => m.type === 'play' && m.isFullRack).length;
    if (frCount >= 3) earn('triple_full_rack');

    // Hot streak: 5 consecutive plays with 20+ pts
    let streak20 = 0, maxStreak20 = 0;
    for (const m of myMoves) {
      if (m.type === 'play' && m.score >= 20) { streak20++; if (streak20 > maxStreak20) maxStreak20 = streak20; }
      else if (m.type === 'play') streak20 = 0;
    }
    if (maxStreak20 >= 5) earn('hot_streak_5');

    // First blood: 30+ on opening move (first play of the game)
    const firstPlay = ctx.game.moveHistory.find((m) => m.type === 'play');
    if (firstPlay && firstPlay.playerName === ctx.playerName && firstPlay.score >= 30) earn('first_blood');
  }

  // ── Hard achievements (end-of-game) ──
  if (ctx.justFinished && ctx.game && ctx.won) {
    const myMoves = ctx.game.moveHistory.filter((m) => m.playerName === ctx.playerName);
    const myPasses = myMoves.filter((m) => m.type === 'pass');
    const myExchanges = myMoves.filter((m) => m.type === 'exchange');
    // Perfect game: win without pass or exchange
    if (myPasses.length === 0 && myExchanges.length === 0) earn('perfect_game');
  }

  // ── Word length from last move ──
  if (ctx.lastMove && ctx.lastMove.type === 'play') {
    for (const w of ctx.lastMove.words) {
      if (w.length >= 11) earn('long_word_11');
      if (w.length >= 13) earn('long_word_13');
    }
  }

  return newlyEarned;
}
