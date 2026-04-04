import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'classic' | 'neon' | 'ocean' | 'sakura' | 'hacker' | 'gold' | 'midnight' | 'retro' | 'aurora';

export interface ThemeDef {
  id: Theme;
  name: { fr: string; en: string };
  icon: string;
  accent: string; // tailwind color for preview
  achievement?: string; // achievement ID required to unlock (null = free)
}

export const THEMES: ThemeDef[] = [
  { id: 'classic', icon: '♟️', accent: '#8B6914', name: { fr: 'Classique', en: 'Classic' } },
  { id: 'neon', icon: '⚡', accent: '#a78bfa', name: { fr: 'Néon', en: 'Neon' } },
  { id: 'ocean', icon: '🌊', accent: '#06b6d4', name: { fr: 'Océan', en: 'Ocean' }, achievement: 'first_win' },
  { id: 'sakura', icon: '🌸', accent: '#f472b6', name: { fr: 'Sakura', en: 'Sakura' }, achievement: 'games_10' },
  { id: 'hacker', icon: '💻', accent: '#22c55e', name: { fr: 'Hacker', en: 'Hacker' }, achievement: 'streak_3' },
  { id: 'gold', icon: '👑', accent: '#eab308', name: { fr: 'Royal', en: 'Royal' }, achievement: 'score_50' },
  { id: 'midnight', icon: '🌙', accent: '#6366f1', name: { fr: 'Minuit', en: 'Midnight' }, achievement: 'wins_50' },
  { id: 'retro', icon: '👾', accent: '#f97316', name: { fr: 'Rétro', en: 'Retro' }, achievement: 'game_500' },
  { id: 'aurora', icon: '🌌', accent: '#14b8a6', name: { fr: 'Aurore Boréale', en: 'Aurora' }, achievement: 'total_50k' },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  unlockedThemes: Set<string>;
  setUnlockedThemes: (t: Set<string>) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'classic', setTheme: () => {}, unlockedThemes: new Set(), setUnlockedThemes: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('lettrix-theme') as Theme) || 'classic';
  });
  const [unlockedThemes, setUnlockedThemes] = useState<Set<string>>(new Set(['classic', 'neon']));

  useEffect(() => {
    localStorage.setItem('lettrix-theme', theme);
    // Remove all theme classes, add current
    document.body.classList.remove('neon', 'classic', 'ocean', 'sakura', 'hacker', 'gold', 'midnight', 'retro', 'aurora');
    document.body.classList.add(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    if (unlockedThemes.has(t) || !THEMES.find(td => td.id === t)?.achievement) {
      setThemeState(t);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, unlockedThemes, setUnlockedThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}
