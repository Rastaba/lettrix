import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Tile } from '../types';
import SortableTile from './SortableTile';

interface Props {
  tiles: Tile[];
  selectedTile: Tile | null;
  exchangeMode: boolean;
  exchangeSelection: Set<string>;
  onTileClick: (tile: Tile) => void;
}

export default function Rack({ tiles, selectedTile, exchangeMode, exchangeSelection, onTileClick }: Props) {
  const ids = tiles.map((t) => t.id);

  return (
    <div className="glass rounded-2xl p-3 sm:p-4 gradient-border">
      <div className="rack-grid">
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          {tiles.map((tile) => (
            <SortableTile
              key={tile.id}
              tile={tile}
              selected={!exchangeMode && selectedTile?.id === tile.id}
              exchangeSelected={exchangeMode && exchangeSelection.has(tile.id)}
              disabled={exchangeMode}
              onClick={() => onTileClick(tile)}
            />
          ))}
        </SortableContext>
        {Array.from({ length: Math.max(0, 7 - tiles.length) }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg border border-dashed border-white/10"
          />
        ))}
      </div>
    </div>
  );
}
