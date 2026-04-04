import { MoveHistoryEntry } from '../types';
import { useLang } from '../contexts/LangContext';

interface Props {
  history: MoveHistoryEntry[];
}

export default function MoveHistory({ history }: Props) {
  const { t } = useLang();

  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t('moveHistory')}</h3>
      {history.length === 0 ? (
        <p className="text-gray-600 text-sm italic">{t('noMoves')}</p>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {[...history].reverse().map((move, i) => (
            <div key={i} className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg transition-all duration-300 ${i === 0 ? 'glass-strong' : 'hover:bg-white/3'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-400 font-medium truncate">{move.playerName}</span>
                {move.type === 'play' && <span className="text-amber-400 font-bold truncate">{move.words.join(', ')}</span>}
                {move.type === 'pass' && <span className="text-gray-600 italic text-xs">{t('passed')}</span>}
                {move.type === 'exchange' && <span className="text-blue-400 italic text-xs">{t('exchanged')}</span>}
              </div>
              {move.type === 'play' && <span className="text-emerald-400 font-black ml-2 text-glow-green">+{move.score}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
