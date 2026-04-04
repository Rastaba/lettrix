import { useEffect, useState } from 'react';
import { useLang } from '../contexts/LangContext';

export interface AchievementNotif {
  id: string;
  icon: string;
  name: { fr: string; en: string };
  desc: { fr: string; en: string };
  rarity: string;
  xp: number;
}

interface Props {
  achievements: AchievementNotif[];
  onDone: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-400/30',
  rare: 'border-blue-400/40 glow-blue',
  epic: 'border-purple-400/40 glow-pink',
  legendary: 'border-amber-400/50 glow-amber',
};

const RARITY_LABELS: Record<string, { fr: string; en: string }> = {
  common: { fr: 'Commun', en: 'Common' },
  rare: { fr: 'Rare', en: 'Rare' },
  epic: { fr: 'Épique', en: 'Epic' },
  legendary: { fr: 'Légendaire', en: 'Legendary' },
};

export default function AchievementToast({ achievements, onDone }: Props) {
  const { lang } = useLang();
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  const achievement = achievements[current];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (current < achievements.length - 1) {
        setCurrent((c) => c + 1);
      } else {
        setVisible(false);
        setTimeout(onDone, 400);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [current, achievements.length, onDone]);

  if (!visible || !achievement) return null;

  const rarityColor = RARITY_COLORS[achievement.rarity] ?? RARITY_COLORS.common;
  const rarityLabel = RARITY_LABELS[achievement.rarity]?.[lang] ?? '';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[65] pointer-events-none animate-slide-up">
      <div className={`glass-strong rounded-2xl px-6 py-4 flex items-center gap-4 border-2 ${rarityColor} min-w-[300px]`}>
        <span className="text-4xl animate-pop-in">{achievement.icon}</span>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{rarityLabel}</div>
          <div className="text-base font-black text-white">{achievement.name[lang]}</div>
          <div className="text-xs text-gray-400">{achievement.desc[lang]}</div>
          <div className="text-xs text-emerald-400 font-bold mt-0.5">+{achievement.xp} XP</div>
        </div>
      </div>
    </div>
  );
}
