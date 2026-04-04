import { useState, useEffect } from 'react';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import { useLang } from '../contexts/LangContext';
import { isMuted, setMuted, playTileClick } from '../sounds';
import ThemePicker from './ThemePicker';
import socket from '../socket';

interface Props {
  onHelp?: () => void;
}

export default function SettingsBar({ onHelp }: Props = {}) {
  const { theme } = useTheme();
  const { lang, toggleLang } = useLang();
  const [muted, setMute] = useState(isMuted());
  const [onlineCount, setOnlineCount] = useState(0);
  const [showThemePicker, setShowThemePicker] = useState(false);

  useEffect(() => {
    const onCount = (count: number) => setOnlineCount(count);
    socket.on('online-count', onCount);
    return () => { socket.off('online-count', onCount); };
  }, []);

  const handleSound = () => {
    const next = !muted;
    setMuted(next);
    setMute(next);
    if (!next) playTileClick();
  };

  const isFr = lang === 'fr';
  const currentThemeDef = THEMES.find((t) => t.id === theme);

  return (
    <>
      <div className="flex items-center gap-2">
        {onlineCount > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600 select-none" title={`${onlineCount} ${isFr ? 'en ligne' : 'online'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="tabular-nums">{onlineCount}</span>
          </div>
        )}

        <div className="glass rounded-full flex items-center h-8 overflow-hidden">
          {/* Sound */}
          <button onClick={handleSound}
            className="flex items-center justify-center w-8 h-8 transition-all duration-200 hover:bg-white/5 active:scale-90"
            title={muted ? (isFr ? 'Activer le son' : 'Unmute') : (isFr ? 'Couper le son' : 'Mute')}
            aria-label={muted ? (isFr ? 'Activer le son' : 'Unmute sound') : (isFr ? 'Couper le son' : 'Mute sound')}>
            {muted ? (
              <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="22" y1="9" x2="16" y2="15" />
                <line x1="16" y1="9" x2="22" y2="15" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path className="settings-sound-wave" d="M15.54 8.46a5 5 0 010 7.07" />
                <path className="settings-sound-wave-2" d="M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            )}
          </button>

          <div className="w-px h-4 bg-white/[0.06]" />

          {/* Language */}
          <button onClick={toggleLang}
            className="flex items-center justify-center gap-0.5 px-2 h-8 transition-all duration-200 hover:bg-white/5 active:scale-90"
            title={isFr ? 'Switch to English' : 'Passer en Français'}
            aria-label={isFr ? 'Switch to English' : 'Passer en Français'}>
            <span className="text-[11px] font-black text-blue-300">{isFr ? '🇫🇷' : '🇬🇧'}</span>
          </button>

          <div className="w-px h-4 bg-white/[0.06]" />

          {/* Theme (opens picker) */}
          <button onClick={() => setShowThemePicker(true)}
            className="flex items-center justify-center w-8 h-8 transition-all duration-200 hover:bg-white/5 active:scale-90"
            title={currentThemeDef?.name[lang] ?? theme}
            aria-label={isFr ? 'Changer le thème' : 'Change theme'}>
            <span className="text-sm">{currentThemeDef?.icon ?? '🎨'}</span>
          </button>

          {/* Help */}
          {onHelp && (
            <>
              <div className="w-px h-4 bg-white/[0.06]" />
              <button onClick={onHelp}
                className="flex items-center justify-center w-8 h-8 transition-all duration-200 hover:bg-white/5 active:scale-90"
                title={isFr ? 'Aide' : 'Help'}
                aria-label={isFr ? 'Aide et règles' : 'Help and rules'}>
                <span className="text-[11px] font-black text-amber-400/70">?</span>
              </button>
            </>
          )}
        </div>
      </div>

      {showThemePicker && <ThemePicker onClose={() => setShowThemePicker(false)} />}
    </>
  );
}
