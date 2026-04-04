import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TileComponent from './TileComponent';
import { Tile } from '../types';

interface Props {
  tile: Tile;
  selected?: boolean;
  exchangeSelected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export default function SortableTile({ tile, selected, exchangeSelected, disabled, onClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tile.id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 'auto',
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="animate-pop-in"
    >
      <TileComponent
        tile={tile}
        selected={selected}
        exchangeSelected={exchangeSelected}
      />
    </div>
  );
}
