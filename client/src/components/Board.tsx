import { Tile, BonusType } from '../types';
import { BONUS_GRID } from '../constants';
import Cell from './Cell';

interface Props {
  board: (Tile | null)[][];
  placedTiles: Map<string, Tile>;
  lastMove: { row: number; col: number }[] | null;
  isDragging: boolean;
  ghostTile: Tile | null;
  onCellClick: (row: number, col: number) => void;
}

export default function Board({ board, placedTiles, lastMove, isDragging, ghostTile, onCellClick }: Props) {
  const lastMoveSet = new Set((lastMove ?? []).map((p) => `${p.row},${p.col}`));

  return (
    <div className="w-full max-w-[min(600px,95vw)] mx-auto">
      <div className="board-grid" role="grid" aria-label="Game board">
        {Array.from({ length: 15 }, (_, row) =>
          Array.from({ length: 15 }, (_, col) => {
            const key = `${row},${col}`;
            const boardTile = board[row][col];
            const placedTile = placedTiles.get(key) ?? null;
            const isEmpty = !boardTile && !placedTile;

            return (
              <Cell
                key={key}
                row={row}
                col={col}
                boardTile={boardTile}
                placedTile={placedTile}
                bonus={BONUS_GRID[row][col] as BonusType}
                isLastMove={lastMoveSet.has(key)}
                isDragging={isDragging}
                ghostTile={isEmpty ? ghostTile : null}
                onClick={() => onCellClick(row, col)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
