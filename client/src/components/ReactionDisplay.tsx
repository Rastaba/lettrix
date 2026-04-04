import { useEffect } from 'react';

interface Props {
  emoji: string | null;
  onDone: () => void;
}

export default function ReactionDisplay({ emoji, onDone }: Props) {
  useEffect(() => {
    if (!emoji) return;
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [emoji, onDone]);

  if (!emoji) return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40">
      <span className="reaction-float text-7xl select-none" aria-hidden="true">
        {emoji}
      </span>
    </div>
  );
}
