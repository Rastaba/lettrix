import { useState } from 'react';
import { useLang } from '../contexts/LangContext';

interface Props {
  onDone: () => void;
}

export default function FirstTimeTutorial({ onDone }: Props) {
  const { t } = useLang();
  const [step, setStep] = useState(0);

  const steps = [
    {
      emoji: '👋',
      title: t('tutoWelcomeTitle'),
      text: t('tutoWelcomeText'),
    },
    {
      emoji: '🎯',
      title: t('tutoPlaceTitle'),
      text: t('tutoPlaceText'),
    },
    {
      emoji: '🟥🟦',
      title: t('tutoBonusTitle'),
      text: t('tutoBonusText'),
      extra: (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="flex items-center gap-2 glass rounded-lg p-2">
            <span className="w-7 h-7 rounded bg-red-700 text-white text-[9px] font-black flex items-center justify-center">{t('bonusTW')}</span>
            <span className="text-xs text-gray-400">{t('tutoBonusTW')}</span>
          </div>
          <div className="flex items-center gap-2 glass rounded-lg p-2">
            <span className="w-7 h-7 rounded bg-pink-500 text-white text-[9px] font-black flex items-center justify-center">{t('bonusDW')}</span>
            <span className="text-xs text-gray-400">{t('tutoBonusDW')}</span>
          </div>
          <div className="flex items-center gap-2 glass rounded-lg p-2">
            <span className="w-7 h-7 rounded bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">{t('bonusTL')}</span>
            <span className="text-xs text-gray-400">{t('tutoBonusTL')}</span>
          </div>
          <div className="flex items-center gap-2 glass rounded-lg p-2">
            <span className="w-7 h-7 rounded bg-cyan-500 text-gray-900 text-[9px] font-black flex items-center justify-center">{t('bonusDL')}</span>
            <span className="text-xs text-gray-400">{t('tutoBonusDL')}</span>
          </div>
        </div>
      ),
    },
    {
      emoji: '🏆',
      title: t('tutoScoreTitle'),
      text: t('tutoScoreText'),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center space-y-5 gradient-border animate-slide-up">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-amber-400 scale-125' : 'bg-gray-600'}`} />
          ))}
        </div>

        <div className="text-5xl">{current.emoji}</div>
        <h3 className="text-xl font-black gradient-text">{current.title}</h3>
        <p className="text-sm text-gray-300 leading-relaxed">{current.text}</p>
        {current.extra}

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="flex-1 py-3 glass rounded-xl font-bold text-sm text-gray-400 hover:text-white transition-all active:scale-[0.97]">
              ←
            </button>
          )}
          <button onClick={() => isLast ? onDone() : setStep(step + 1)}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all
              bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900
              hover:from-amber-400 hover:to-orange-400 active:scale-[0.97]">
            {isLast ? t('tutoLetsPlay') : t('tutoNext')}
          </button>
        </div>

        <button onClick={onDone} className="text-gray-600 hover:text-gray-400 text-xs transition-all">
          {t('tutoSkip')}
        </button>
      </div>
    </div>
  );
}
