import { Tile } from '../types';

interface Props {
  tile: Tile;
  selected?: boolean;
  dimmed?: boolean;
  exchangeSelected?: boolean;
  small?: boolean;
  onClick?: () => void;
}

export default function TileComponent({ tile, selected, dimmed, exchangeSelected, small, onClick }: Props) {
  const size = small
    ? 'w-7 h-7 text-[11px]'
    : 'w-11 h-11 sm:w-12 sm:h-12 text-base sm:text-lg';

  const tileClass = selected
    ? 'tile-3d-selected'
    : tile.isBlank && !tile.letter
      ? 'tile-3d tile-3d-blank'
      : 'tile-3d';

  return (
    <div
      onClick={onClick}
      className={`
        ${size} relative flex items-center justify-center rounded-lg font-extrabold
        cursor-pointer select-none transition-all duration-200 ease-out
        ${tileClass}
        ${exchangeSelected ? 'ring-2 ring-red-400 glow-red scale-105' : ''}
        ${dimmed ? 'opacity-30 saturate-0' : ''}
        ${!selected && !dimmed ? 'hover:scale-108 active:scale-95' : ''}
        text-gray-900
      `}
    >
      <span className="drop-shadow-sm">{tile.letter || (tile.isBlank ? '?' : '')}</span>
      {!tile.isBlank && (
        <span className="absolute bottom-0.5 right-1 text-[7px] sm:text-[9px] font-bold text-gray-700/80">
          {tile.value}
        </span>
      )}
    </div>
  );
}
