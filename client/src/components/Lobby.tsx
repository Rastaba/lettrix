import { useState } from 'react';
import { useLang } from '../contexts/LangContext';
import SettingsBar from './SettingsBar';
import Leaderboard from './Leaderboard';
import socket from '../socket';

interface Props {
  initialMode: 'menu' | 'create' | 'join';
  playerName: string;
  onCreateGame: (name: string, gameLang: string) => void;
  onJoinGame: (code: string, name: string) => void;
  onSetName: (name: string) => void;
  onLoginWithToken: (name: string, token: string) => void;
  onBack: () => void;
  onFindMatch?: (name: string, gameLang: string) => void;
  searching?: boolean;
  onCancelMatch?: () => void;
  error: string | null;
}

export default function Lobby({ initialMode, playerName, onCreateGame, onJoinGame, onSetName, onLoginWithToken, onBack, onFindMatch, searching, onCancelMatch, error }: Props) {
  const { t } = useLang();
  const [name, setName] = useState(playerName);
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(initialMode);
  const [password, setPassword] = useState('');
  const [nameIsClaimed, setNameIsClaimed] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [checking, setChecking] = useState(false);
  const [gameLang, setGameLang] = useState<'fr' | 'en'>('fr');

  const showBackToDashboard = playerName && mode !== 'menu';

  const handleGoWithName = () => {
    const n = name.trim();
    if (!n) return;
    setChecking(true);
    setLoginError('');

    // Ensure socket is connected
    if (!socket.connected) socket.connect();

    const doCheck = () => {
      socket.emit('check-name', { name: n }, (res: any) => {
        setChecking(false);
        if (res.claimed) {
          setNameIsClaimed(true);
        } else {
          onSetName(n);
        }
      });
    };

    if (socket.connected) doCheck();
    else socket.once('connect', doCheck);
  };

  const handleLogin = () => {
    if (!password.trim()) return;
    setLoginError('');
    socket.emit('login', { name: name.trim(), password: password.trim() }, (res: any) => {
      if (res.success && res.token) {
        localStorage.setItem('lettrix-token', res.token);
        onLoginWithToken(name.trim(), res.token);
      } else {
        setLoginError(res.error ?? t('authError'));
      }
    });
  };

  // First visit: name entry + optional login
  if (mode === 'menu' && !playerName) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10 gap-8">
        <div className="fixed top-4 right-4 z-50"><SettingsBar /></div>

        <div className="glass-strong rounded-3xl p-10 w-full max-w-md gradient-border animate-slide-up">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black gradient-text mb-2 tracking-tight">Lettrix</h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              {['L','E','T','T','R','I','X'].map((l, i) => (
                <span key={i} className="tile-3d w-10 h-10 flex items-center justify-center text-sm font-extrabold text-gray-900 rounded">{l}</span>
              ))}
            </div>
            <p className="text-gray-500 text-sm mt-4 tracking-wide">{t('subtitle')}</p>
          </div>

          {(error || loginError) && (
            <div className="glass rounded-xl px-4 py-3 mb-5 border border-red-500/30 text-red-300 text-sm glow-red">{error || loginError}</div>
          )}

          {!nameIsClaimed ? (
            <div className="space-y-4 animate-slide-up">
              <input type="text" placeholder={t('yourName')} value={name}
                onChange={(e) => { setName(e.target.value); setNameIsClaimed(false); setLoginError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleGoWithName(); }}
                className="w-full px-5 py-3.5 glass rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all duration-300 text-center text-lg font-medium" maxLength={20} />
              <button onClick={handleGoWithName} disabled={!name.trim() || checking}
                className="w-full py-3.5 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/20 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 btn-glow btn-glow-amber active:scale-[0.98]">
                {checking ? '...' : t('letsGo')}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-slide-up">
              <div className="glass rounded-xl px-4 py-3 text-center">
                <p className="text-amber-400 text-sm font-bold">🔒 {t('nameClaimed')}</p>
                <p className="text-gray-400 text-xs mt-1">{t('nameClaimedHint')}</p>
              </div>
              <input type="password" placeholder={t('password')} value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                className="w-full px-5 py-3.5 glass rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all duration-300 text-center text-lg" />
              <button onClick={handleLogin} disabled={!password.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 btn-glow btn-glow-amber active:scale-[0.98]">
                {t('authLogin')}
              </button>
              <button onClick={() => { setNameIsClaimed(false); setName(''); setPassword(''); setLoginError(''); }}
                className="w-full py-2.5 text-gray-500 hover:text-white transition-all text-sm">
                {t('authChooseOther')}
              </button>
            </div>
          )}
        </div>

        <div className="w-full max-w-md animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Leaderboard />
        </div>
      </div>
    );
  }

  // Create or Join flow
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="fixed top-4 right-4 z-50"><SettingsBar /></div>
      <div className="glass-strong rounded-3xl p-10 w-full max-w-md gradient-border animate-slide-up">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black gradient-text tracking-tight">Lettrix</h1>
        </div>

        {error && (
          <div className="glass rounded-xl px-4 py-3 mb-5 border border-red-500/30 text-red-300 text-sm glow-red">{error}</div>
        )}

        {mode === 'create' && (
          <div className="space-y-5 animate-slide-up">
            <p className="text-gray-400 text-center">{t('playingAs')} <span className="gradient-text font-bold">{name || playerName}</span></p>

            {/* Game language selector */}
            <div>
              <p className="text-xs text-gray-500 text-center mb-2">{t('gameLangLabel')}</p>
              <div className="flex gap-2">
                <button onClick={() => setGameLang('fr')}
                  className={`flex-1 py-3 glass rounded-xl font-bold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2
                    ${gameLang === 'fr' ? 'ring-2 ring-amber-400 bg-amber-500/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  <span>🇫🇷</span> Français
                </button>
                <button onClick={() => setGameLang('en')}
                  className={`flex-1 py-3 glass rounded-xl font-bold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2
                    ${gameLang === 'en' ? 'ring-2 ring-amber-400 bg-amber-500/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  <span>🇬🇧</span> English
                </button>
              </div>
              <p className="text-[10px] text-gray-600 text-center mt-1.5">{t('gameLangHint')}</p>
            </div>

            {/* Find Match - prominent matchmaking button */}
            {onFindMatch && !searching && (
              <button onClick={() => { const n = (name || playerName).trim(); if (n) onFindMatch(n, gameLang); }}
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
                <button onClick={onCancelMatch}
                  className="px-6 py-2 glass rounded-xl text-sm text-gray-400 hover:text-white transition-all active:scale-[0.97]">
                  {t('cancelSearch')}
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-600 uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button onClick={() => { const n = (name || playerName).trim(); if (n) onCreateGame(n, gameLang); }}
              className="w-full py-3.5 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/20 btn-glow btn-glow-amber active:scale-[0.98]">
              {t('startNew')}
            </button>
            <button onClick={() => showBackToDashboard ? onBack() : setMode('menu')}
              className="w-full py-2.5 text-gray-500 hover:text-white transition-all text-sm">{t('back')}</button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-5 animate-slide-up">
            <p className="text-gray-400 text-center">{t('playingAs')} <span className="gradient-text font-bold">{name || playerName}</span></p>
            <input type="text" placeholder={t('gameCodePlaceholder')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter' && code.length >= 4) { const n = (name || playerName).trim(); if (n) onJoinGame(code.trim(), n); } }}
              className="w-full px-5 py-4 glass rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all duration-300 text-center text-3xl tracking-[0.4em] uppercase font-mono font-bold" maxLength={4} />
            <button onClick={() => { const n = (name || playerName).trim(); if (n && code.trim()) onJoinGame(code.trim(), n); }}
              disabled={code.length < 4}
              className="w-full py-3.5 rounded-xl font-bold text-lg transition-all duration-300 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/20 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 btn-glow btn-glow-amber active:scale-[0.98]">
              {t('join')}
            </button>
            <button onClick={() => showBackToDashboard ? onBack() : setMode('menu')}
              className="w-full py-2.5 text-gray-500 hover:text-white transition-all text-sm">{t('back')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
