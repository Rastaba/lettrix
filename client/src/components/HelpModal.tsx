import { createPortal } from 'react-dom';
import { useLang } from '../contexts/LangContext';

interface Props {
  onClose: () => void;
}

function BonusChip({ color, label }: { color: string; label: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded text-[10px] font-black ${color}`}>
      {label}
    </span>
  );
}

export default function HelpModal({ onClose }: Props) {
  const { t } = useLang();

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto gradient-border animate-slide-up space-y-5"
        onClick={(e) => e.stopPropagation()}>

        <h2 className="text-xl font-black gradient-text text-center">{t('helpTitle')}</h2>

        {/* How to play */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-amber-400">{t('helpHowToPlay')}</h3>
          <ul className="text-sm text-gray-300 space-y-1.5">
            <li className="flex gap-2"><span className="text-amber-400">1.</span> {t('helpStep1')}</li>
            <li className="flex gap-2"><span className="text-amber-400">2.</span> {t('helpStep2')}</li>
            <li className="flex gap-2"><span className="text-amber-400">3.</span> {t('helpStep3')}</li>
            <li className="flex gap-2"><span className="text-amber-400">4.</span> {t('helpStep4')}</li>
          </ul>
        </div>

        {/* Rules */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-amber-400">{t('helpRules')}</h3>
          <ul className="text-sm text-gray-300 space-y-1.5">
            <li className="flex gap-2"><span>&#9733;</span> {t('helpRule1')}</li>
            <li className="flex gap-2"><span>&#8596;</span> {t('helpRule2')}</li>
            <li className="flex gap-2"><span>&#128279;</span> {t('helpRule3')}</li>
            <li className="flex gap-2"><span>&#127775;</span> {t('helpRule4')}</li>
          </ul>
        </div>

        {/* Bonus squares legend */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-amber-400">{t('helpBonusTitle')}</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="glass rounded-xl p-3 flex items-center gap-3">
              <BonusChip color="bg-red-700 text-white" label={t('bonusTW')} />
              <div className="text-xs text-gray-300">{t('helpBonusTW')}</div>
            </div>
            <div className="glass rounded-xl p-3 flex items-center gap-3">
              <BonusChip color="bg-pink-500 text-white" label={t('bonusDW')} />
              <div className="text-xs text-gray-300">{t('helpBonusDW')}</div>
            </div>
            <div className="glass rounded-xl p-3 flex items-center gap-3">
              <BonusChip color="bg-blue-600 text-white" label={t('bonusTL')} />
              <div className="text-xs text-gray-300">{t('helpBonusTL')}</div>
            </div>
            <div className="glass rounded-xl p-3 flex items-center gap-3">
              <BonusChip color="bg-cyan-500 text-gray-900" label={t('bonusDL')} />
              <div className="text-xs text-gray-300">{t('helpBonusDL')}</div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-amber-400">{t('helpTips')}</h3>
          <ul className="text-sm text-gray-300 space-y-1.5">
            <li className="flex gap-2"><span>&#128161;</span> {t('helpTip1')}</li>
            <li className="flex gap-2"><span>&#128161;</span> {t('helpTip2')}</li>
            <li className="flex gap-2"><span>&#128161;</span> {t('helpTip3')}</li>
          </ul>
        </div>

        <button onClick={onClose}
          className="w-full py-3 rounded-xl font-bold transition-all bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98]">
          {t('helpGotIt')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
