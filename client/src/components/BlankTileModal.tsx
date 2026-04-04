import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '../contexts/LangContext';

interface Props {
  onSelect: (letter: string) => void;
  onCancel: () => void;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function BlankTileModal({ onSelect, onCancel }: Props) {
  const { t } = useLang();
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard: type a letter to select, Escape to cancel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); return; }
      const letter = e.key.toUpperCase();
      if (/^[A-Z]$/.test(letter)) onSelect(letter);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onSelect, onCancel]);

  // Focus trap: focus modal on mount
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  return createPortal(
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t('chooseLetter')}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-slide-up outline-none">
      <div className="glass-strong rounded-2xl p-6 max-w-sm w-full gradient-border">
        <h3 className="text-lg font-bold gradient-text mb-2 text-center">{t('chooseLetter')}</h3>
        <p className="text-xs text-gray-500 mb-4 text-center" aria-live="polite">
          {t('chooseLetter')} — {(useLang().lang === 'fr') ? 'tapez une lettre au clavier ou cliquez' : 'type a letter or click'}
        </p>
        <div className="grid grid-cols-7 gap-2 mb-5" role="group" aria-label={t('chooseLetter')}>
          {LETTERS.map((l) => (
            <button key={l} onClick={() => onSelect(l)}
              aria-label={l}
              className="w-10 h-10 tile-3d text-gray-900 font-extrabold rounded-lg hover:scale-110 active:scale-95 transition-all duration-150">
              {l}
            </button>
          ))}
        </div>
        <button onClick={onCancel}
          className="w-full py-2.5 glass rounded-lg text-sm text-gray-400 hover:text-white transition-all duration-200 hover:bg-white/5">
          {t('cancel')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
