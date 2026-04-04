import { useState, useEffect } from 'react';
import { useLang } from '../contexts/LangContext';
import socket from '../socket';

interface AchDef {
  id: string;
  icon: string;
  name: { fr: string; en: string };
  desc: { fr: string; en: string };
  rarity: string;
  xp: number;
}

interface ProfileData {
  xp: number;
  level: number;
  title: { fr: string; en: string };
  nextLevelXp: number;
  progress: number;
  achievements: string[];
  unlockedThemes: string[];
}

// All achievement definitions (loaded once from a request or hardcoded)
// We'll fetch them from the server or hardcode the list
const ALL_ACHIEVEMENTS: AchDef[] = [
  { id: 'first_word', icon: '📝', rarity: 'common', xp: 10, name: { fr: 'Premier Mot', en: 'First Word' }, desc: { fr: 'Joue ton premier mot', en: 'Play your first word' } },
  { id: 'first_win', icon: '🏆', rarity: 'common', xp: 20, name: { fr: 'Première Victoire', en: 'First Victory' }, desc: { fr: 'Gagne ta première partie', en: 'Win your first game' } },
  { id: 'first_game', icon: '🎮', rarity: 'common', xp: 10, name: { fr: 'Bienvenue', en: 'Welcome' }, desc: { fr: 'Termine ta première partie', en: 'Complete your first game' } },
  { id: 'games_10', icon: '🎯', rarity: 'common', xp: 30, name: { fr: 'Habitué', en: 'Regular' }, desc: { fr: 'Joue 10 parties', en: 'Play 10 games' } },
  { id: 'games_50', icon: '💪', rarity: 'rare', xp: 75, name: { fr: 'Vétéran', en: 'Veteran' }, desc: { fr: 'Joue 50 parties', en: 'Play 50 games' } },
  { id: 'games_100', icon: '🏅', rarity: 'epic', xp: 150, name: { fr: 'Marathonien', en: 'Marathon Runner' }, desc: { fr: 'Joue 100 parties', en: 'Play 100 games' } },
  { id: 'words_100', icon: '📚', rarity: 'rare', xp: 50, name: { fr: 'Bibliothèque', en: 'Library' }, desc: { fr: 'Joue 100 mots au total', en: 'Play 100 words total' } },
  { id: 'words_500', icon: '📖', rarity: 'epic', xp: 100, name: { fr: 'Encyclopédie', en: 'Encyclopedia' }, desc: { fr: 'Joue 500 mots au total', en: 'Play 500 words total' } },
  { id: 'score_20', icon: '⚡', rarity: 'common', xp: 15, name: { fr: 'Bon Début', en: 'Good Start' }, desc: { fr: 'Marque 20+ pts en un coup', en: 'Score 20+ pts in one move' } },
  { id: 'score_30', icon: '🔥', rarity: 'common', xp: 20, name: { fr: 'Beau Coup', en: 'Nice Move' }, desc: { fr: 'Marque 30+ pts en un coup', en: 'Score 30+ pts in one move' } },
  { id: 'score_50', icon: '💎', rarity: 'rare', xp: 40, name: { fr: 'Coup de Maître', en: 'Master Stroke' }, desc: { fr: 'Marque 50+ pts en un coup', en: 'Score 50+ pts in one move' } },
  { id: 'score_70', icon: '👑', rarity: 'epic', xp: 75, name: { fr: 'Coup Royal', en: 'Royal Move' }, desc: { fr: 'Marque 70+ pts en un coup', en: 'Score 70+ pts in one move' } },
  { id: 'score_100', icon: '🌟', rarity: 'legendary', xp: 150, name: { fr: 'Centurion', en: 'Centurion' }, desc: { fr: 'Marque 100+ pts en un coup', en: 'Score 100+ pts in one move' } },
  { id: 'game_200', icon: '🚀', rarity: 'rare', xp: 50, name: { fr: 'Bicentenaire', en: 'Bicentennial' }, desc: { fr: 'Atteins 200+ pts dans une partie', en: 'Reach 200+ pts in a game' } },
  { id: 'game_300', icon: '🛸', rarity: 'epic', xp: 100, name: { fr: 'Stratosphère', en: 'Stratosphere' }, desc: { fr: 'Atteins 300+ pts dans une partie', en: 'Reach 300+ pts in a game' } },
  { id: 'game_400', icon: '☄️', rarity: 'legendary', xp: 200, name: { fr: 'Supernova', en: 'Supernova' }, desc: { fr: 'Atteins 400+ pts dans une partie', en: 'Reach 400+ pts in a game' } },
  { id: 'full_rack', icon: '🔥', rarity: 'rare', xp: 50, name: { fr: 'LETTRIX !', en: 'LETTRIX!' }, desc: { fr: 'Pose tes 7 lettres en un coup', en: 'Use all 7 tiles in one move' } },
  { id: 'double_full_rack', icon: '🔥🔥', rarity: 'legendary', xp: 200, name: { fr: 'Double Lettrix', en: 'Double Lettrix' }, desc: { fr: '2 Lettrix dans la même partie', en: '2 Lettrix in the same game' } },
  { id: 'long_word_7', icon: '📏', rarity: 'common', xp: 15, name: { fr: 'Mot Long', en: 'Long Word' }, desc: { fr: 'Joue un mot de 7+ lettres', en: 'Play a word with 7+ letters' } },
  { id: 'long_word_9', icon: '📐', rarity: 'rare', xp: 40, name: { fr: 'Mot Fleuve', en: 'River Word' }, desc: { fr: 'Joue un mot de 9+ lettres', en: 'Play a word with 9+ letters' } },
  { id: 'use_z', icon: '🇿', rarity: 'common', xp: 10, name: { fr: 'Zélé', en: 'Zealous' }, desc: { fr: 'Utilise la lettre Z', en: 'Use the letter Z' } },
  { id: 'use_q', icon: '👸', rarity: 'common', xp: 10, name: { fr: 'Question', en: 'Question' }, desc: { fr: 'Utilise la lettre Q', en: 'Use the letter Q' } },
  { id: 'use_x', icon: '❌', rarity: 'common', xp: 10, name: { fr: 'Facteur X', en: 'X Factor' }, desc: { fr: 'Utilise la lettre X', en: 'Use the letter X' } },
  { id: 'use_all_rare', icon: '💀', rarity: 'epic', xp: 75, name: { fr: 'Collectionneur', en: 'Collector' }, desc: { fr: 'Utilise Q, X et Z dans la même partie', en: 'Use Q, X and Z in the same game' } },
  { id: 'wins_5', icon: '⭐', rarity: 'common', xp: 30, name: { fr: '5 Victoires', en: '5 Wins' }, desc: { fr: 'Gagne 5 parties', en: 'Win 5 games' } },
  { id: 'wins_20', icon: '🌟', rarity: 'rare', xp: 75, name: { fr: 'Vingt-aine', en: 'Twenty' }, desc: { fr: 'Gagne 20 parties', en: 'Win 20 games' } },
  { id: 'streak_3', icon: '🔥', rarity: 'common', xp: 25, name: { fr: 'Hat Trick', en: 'Hat Trick' }, desc: { fr: 'Gagne 3 de suite', en: 'Win 3 in a row' } },
  { id: 'streak_5', icon: '🔥🔥', rarity: 'rare', xp: 60, name: { fr: 'Inarrêtable', en: 'Unstoppable' }, desc: { fr: 'Gagne 5 de suite', en: 'Win 5 in a row' } },
  { id: 'streak_10', icon: '👑🔥', rarity: 'legendary', xp: 200, name: { fr: 'Légende Vivante', en: 'Living Legend' }, desc: { fr: 'Gagne 10 de suite', en: 'Win 10 in a row' } },
  { id: 'close_win', icon: '😅', rarity: 'rare', xp: 35, name: { fr: 'Photo Finish', en: 'Photo Finish' }, desc: { fr: 'Gagne avec ≤5 pts d\'écart', en: 'Win by 5 pts or less' } },
  { id: 'domination', icon: '💀', rarity: 'epic', xp: 75, name: { fr: 'Domination', en: 'Domination' }, desc: { fr: 'Gagne avec 100+ pts d\'avance', en: 'Win by 100+ pts' } },
  { id: 'comeback', icon: '🔄', rarity: 'epic', xp: 100, name: { fr: 'Comeback', en: 'Comeback' }, desc: { fr: 'Gagne après -50 pts', en: 'Win after -50 pts deficit' } },
  { id: 'no_exchange', icon: '🎯', rarity: 'rare', xp: 35, name: { fr: 'Perfectionniste', en: 'Perfectionist' }, desc: { fr: 'Gagne sans échanger', en: 'Win without exchanging' } },
  { id: 'total_10k', icon: '🏦', rarity: 'epic', xp: 100, name: { fr: 'Banquier', en: 'Banker' }, desc: { fr: 'Cumule 10 000 pts', en: 'Accumulate 10K pts' } },
  // ── Hard ──
  { id: 'perfect_game', icon: '💯', rarity: 'legendary', xp: 250, name: { fr: 'Partie Parfaite', en: 'Perfect Game' }, desc: { fr: 'Gagne sans passer ni échanger', en: 'Win without passing or exchanging' } },
  { id: 'first_blood', icon: '🩸', rarity: 'epic', xp: 60, name: { fr: 'Premier Sang', en: 'First Blood' }, desc: { fr: '30+ pts au premier coup', en: '30+ pts on opening move' } },
  { id: 'hot_streak_5', icon: '🔥⚡', rarity: 'epic', xp: 80, name: { fr: 'En Feu', en: 'On Fire' }, desc: { fr: '5 coups à 20+ pts de suite', en: '5 moves of 20+ pts in a row' } },
  { id: 'long_word_11', icon: '🧬', rarity: 'epic', xp: 75, name: { fr: 'Mot Géant', en: 'Giant Word' }, desc: { fr: 'Mot de 11+ lettres', en: 'Word with 11+ letters' } },
  { id: 'long_word_13', icon: '🧪', rarity: 'legendary', xp: 200, name: { fr: 'Mot Monstrueux', en: 'Monstrous Word' }, desc: { fr: 'Mot de 13+ lettres', en: 'Word with 13+ letters' } },
  { id: 'wins_50', icon: '🏆⭐', rarity: 'epic', xp: 100, name: { fr: 'Demi-Centurion', en: 'Half-Centurion' }, desc: { fr: 'Gagne 50 parties', en: 'Win 50 games' } },
  { id: 'wins_100', icon: '💎👑', rarity: 'legendary', xp: 250, name: { fr: 'Centenaire', en: 'Centennial' }, desc: { fr: 'Gagne 100 parties', en: 'Win 100 games' } },
  { id: 'total_50k', icon: '💰', rarity: 'legendary', xp: 250, name: { fr: 'Millionnaire', en: 'Millionaire' }, desc: { fr: 'Cumule 50 000 pts', en: 'Accumulate 50K pts' } },
  { id: 'triple_full_rack', icon: '🔥🔥🔥', rarity: 'legendary', xp: 300, name: { fr: 'Triple Lettrix', en: 'Triple Lettrix' }, desc: { fr: '3 Lettrix en une partie', en: '3 Lettrix in one game' } },
  { id: 'game_500', icon: '🌌', rarity: 'legendary', xp: 300, name: { fr: 'Trou Noir', en: 'Black Hole' }, desc: { fr: '500+ pts en une partie', en: '500+ pts in one game' } },
];

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'];
const RARITY_BG: Record<string, string> = {
  common: 'border-gray-600/30',
  rare: 'border-blue-500/30',
  epic: 'border-purple-500/30',
  legendary: 'border-amber-500/40',
};

export default function AchievementsPanel({ token }: { token: string }) {
  const { lang } = useLang();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    socket.emit('get-profile', { token }, (res: any) => setProfile(res));
  }, [token]);

  if (!profile) return null;

  const earned = new Set(profile.achievements);
  const sorted = [...ALL_ACHIEVEMENTS].sort((a, b) => {
    const aE = earned.has(a.id) ? 0 : 1;
    const bE = earned.has(b.id) ? 0 : 1;
    if (aE !== bE) return aE - bE;
    return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
  });

  const progress = Math.round(profile.progress * 100);

  return (
    <div className="space-y-4">
      {/* Level + XP bar */}
      <div className="glass rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black gradient-text">Lv.{profile.level}</span>
            <span className="text-sm text-gray-400">{profile.title[lang]}</span>
          </div>
          <span className="text-xs text-gray-500">{profile.xp} XP</span>
        </div>
        <div className="h-2.5 glass rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="text-[10px] text-gray-600 text-right">{profile.nextLevelXp} XP → Lv.{profile.level + 1}</div>
      </div>

      {/* Achievement count */}
      <div className="text-xs text-gray-500 text-center">
        {earned.size} / {ALL_ACHIEVEMENTS.length} {lang === 'fr' ? 'débloqués' : 'unlocked'}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 gap-1.5">
        {sorted.map((a) => {
          const isEarned = earned.has(a.id);
          return (
            <div key={a.id}
              className={`glass rounded-xl p-3 flex items-center gap-3 border transition-all
                ${isEarned ? RARITY_BG[a.rarity] : 'border-transparent opacity-40 saturate-0'}`}>
              <span className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>{a.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isEarned ? 'text-white' : 'text-gray-500'}`}>{a.name[lang]}</span>
                  {isEarned && <span className="text-emerald-400 text-[10px] font-bold">✓</span>}
                </div>
                <div className="text-[10px] text-gray-500 truncate">{a.desc[lang]}</div>
              </div>
              <span className="text-[10px] text-gray-600 shrink-0">+{a.xp} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
