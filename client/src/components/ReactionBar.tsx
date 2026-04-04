import { useState, useCallback, useEffect } from 'react';

const REACTIONS = [
  { emoji: '\uD83D\uDC4F', label: 'Clap' },
  { emoji: '\uD83D\uDE24', label: 'Frustrated' },
  { emoji: '\uD83D\uDD25', label: 'Fire' },
  { emoji: '\uD83D\uDE02', label: 'Laugh' },
  { emoji: '\uD83E\uDD2F', label: 'Mind blown' },
  { emoji: '\uD83D\uDC80', label: 'Skull' },
];

const COOLDOWN_MS = 2000;

interface Props {
  onReact: (emoji: string) => void;
  disabled?: boolean;
}

export default function ReactionBar({ onReact, disabled }: Props) {
  const [cooldown, setCooldown] = useState(false);

  const handleClick = useCallback((emoji: string) => {
    if (cooldown || disabled) return;
    onReact(emoji);
    setCooldown(true);
  }, [cooldown, disabled, onReact]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(false), COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return (
    <div className="glass rounded-full flex items-center h-9 px-1 gap-0.5">
      {REACTIONS.map(({ emoji, label }) => (
        <button
          key={emoji}
          onClick={() => handleClick(emoji)}
          disabled={cooldown || disabled}
          aria-label={label}
          className={`flex items-center justify-center w-8 h-8 rounded-full text-base
            transition-all duration-200 active:scale-90
            ${cooldown || disabled
              ? 'opacity-30 cursor-not-allowed grayscale'
              : 'hover:bg-white/10 hover:scale-110 cursor-pointer'
            }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
