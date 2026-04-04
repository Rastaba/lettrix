import { createPortal } from 'react-dom';
import { useTheme, THEMES, Theme } from '../contexts/ThemeContext';
import { useLang } from '../contexts/LangContext';

interface Props {
  onClose: () => void;
}

export default function ThemePicker({ onClose }: Props) {
  const { theme, setTheme, unlockedThemes } = useTheme();
  const { lang, t } = useLang();

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-5 max-w-sm w-full gradient-border animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-black gradient-text text-center mb-4">{t('themePickerTitle')}</h3>

        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((td) => {
            const isUnlocked = !td.achievement || unlockedThemes.has(td.id);
            const isActive = theme === td.id;

            return (
              <button
                key={td.id}
                onClick={() => { if (isUnlocked) { setTheme(td.id as Theme); onClose(); } }}
                disabled={!isUnlocked}
                className={`relative glass rounded-xl p-3 flex items-center gap-3 transition-all duration-200
                  ${isActive ? 'ring-2 ring-amber-400 bg-amber-500/10' : isUnlocked ? 'hover:bg-white/5' : 'opacity-40 cursor-not-allowed'}
                `}
              >
                <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: td.accent }} />

                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{td.icon}</span>
                    <span className={`text-sm font-bold ${isActive ? 'text-amber-400' : 'text-white'}`}>
                      {td.name[lang]}
                    </span>
                  </div>
                  {!isUnlocked && td.achievement && (
                    <div className="text-[9px] text-gray-500 mt-0.5 flex items-center gap-1">
                      <span>🔒</span> {t('themeLockedBy')}
                    </div>
                  )}
                </div>

                {isActive && (
                  <span className="absolute top-1.5 right-2 text-emerald-400 text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>

        <button onClick={onClose} className="w-full mt-4 py-2 text-center text-xs text-gray-500 hover:text-gray-300 transition-colors">
          {t('cancel')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
