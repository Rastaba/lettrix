import { useDroppable } from '@dnd-kit/core';
import { Tile, BonusType } from '../types';
import { BONUS_LABELS_FR, BONUS_LABELS_EN } from '../constants';
import { useTheme } from '../contexts/ThemeContext';
import { useLang } from '../contexts/LangContext';

const NEON_BONUS: Record<string, string> = {
  TW: 'bg-gradient-to-br from-red-600 to-red-800 text-red-100 glow-red',
  DW: 'bg-gradient-to-br from-pink-500 to-fuchsia-700 text-pink-100 glow-pink',
  TL: 'bg-gradient-to-br from-blue-500 to-indigo-700 text-blue-100 glow-blue',
  DL: 'bg-gradient-to-br from-cyan-400 to-sky-600 text-cyan-100 glow-cyan',
};
const CLASSIC_BONUS: Record<string, string> = {
  TW: 'cell-bonus-tw text-white',
  DW: 'cell-bonus-dw',
  TL: 'cell-bonus-tl text-white',
  DL: 'cell-bonus-dl',
};

interface Props {
  row: number;
  col: number;
  boardTile: Tile | null;
  placedTile: Tile | null;
  bonus: BonusType;
  isLastMove: boolean;
  isDragging: boolean;
  ghostTile: Tile | null;
  onClick: () => void;
}

export default function Cell({ row, col, boardTile, placedTile, bonus, isLastMove, isDragging, ghostTile, onClick }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const isCenter = row === 7 && col === 7;
  const tile = boardTile || placedTile;
  const isClassic = theme === 'classic';
  const bonusLabels = lang === 'fr' ? BONUS_LABELS_FR : BONUS_LABELS_EN;
  const isEmpty = !tile;

  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${row}-${col}`,
    disabled: !isEmpty,
  });

  // ── Tile on cell ──
  if (tile) {
    const tileStyle = placedTile
      ? 'tile-3d-placed animate-pop-in'
      : isLastMove
        ? 'tile-3d glow-green'
        : 'tile-3d';

    return (
      <div
        onClick={onClick}
        className={`aspect-square flex items-center justify-center rounded-[3px] cursor-pointer relative
          font-extrabold text-gray-900 select-none transition-all duration-150 ${tileStyle}`}
        style={{ fontSize: 'clamp(9px, 2.2vw, 15px)' }}
      >
        <span className="drop-shadow-sm">{tile.letter}</span>
        {!tile.isBlank && (
          <span className="absolute bottom-0 right-0.5 font-bold text-gray-700/70"
            style={{ fontSize: 'clamp(5px, 0.9vw, 7px)' }}>{tile.value}</span>
        )}
        {tile.isBlank && (
          <span className="absolute top-0 left-0.5 text-amber-700/60"
            style={{ fontSize: 'clamp(4px, 0.8vw, 7px)' }}>*</span>
        )}
      </div>
    );
  }

  // ── Drop target highlight ──
  const dropHighlight = isDragging
    ? isOver
      ? 'ring-2 ring-amber-400 bg-amber-400/20 scale-[1.04]'
      : 'ring-1 ring-amber-400/20'
    : '';

  // ── Ghost tile (preview on hover when a tile is selected) ──
  const ghostContent = ghostTile && !isDragging ? (
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-35
      transition-opacity duration-150 pointer-events-none rounded-[3px] tile-3d"
      style={{ fontSize: 'clamp(9px, 2.2vw, 15px)' }}>
      <span className="font-extrabold text-gray-900">{ghostTile.letter || '?'}</span>
    </div>
  ) : null;

  // ── Center star ──
  if (isCenter) {
    return (
      <div ref={setNodeRef} onClick={onClick}
        className={`group aspect-square flex items-center justify-center rounded-[3px] cursor-pointer select-none
          transition-all duration-200 relative ${dropHighlight}
          ${isClassic ? 'cell-classic-center' : 'bg-gradient-to-br from-amber-900/40 to-amber-800/20 hover:from-amber-800/50 hover:to-amber-700/30'}`}>
        <span className={isClassic ? 'text-amber-600 font-bold' : 'star-animated text-amber-400'}
          style={{ fontSize: 'clamp(10px, 2.2vw, 20px)' }}>&#9733;</span>
        {ghostContent}
      </div>
    );
  }

  // ── Bonus cell ──
  if (bonus) {
    const style = isClassic ? CLASSIC_BONUS[bonus] : NEON_BONUS[bonus];
    return (
      <div ref={setNodeRef} onClick={onClick}
        className={`group aspect-square flex items-center justify-center rounded-[3px] cursor-pointer select-none
          transition-all duration-200 hover:brightness-110 relative ${dropHighlight} ${style}`}
        style={{ fontSize: 'clamp(5px, 1.1vw, 8px)' }}>
        <span className="font-black tracking-tight opacity-90">{bonusLabels[bonus]}</span>
        {ghostContent}
      </div>
    );
  }

  // ── Empty cell ──
  return (
    <div ref={setNodeRef} onClick={onClick}
      className={`group aspect-square rounded-[3px] cursor-pointer select-none transition-all duration-200 relative ${dropHighlight}
        ${isClassic ? 'cell-classic-empty' : 'bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/10'}`}>
      {ghostContent}
    </div>
  );
}
