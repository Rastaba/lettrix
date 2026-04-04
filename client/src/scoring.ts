import { Tile, MoveHistoryEntry } from './types';
import { BONUS_GRID } from './constants';

const BOARD_SIZE = 15;
const FULL_RACK_BONUS = 50;

interface Placement {
  tile: Tile;
  row: number;
  col: number;
}

interface WordInfo {
  word: string;
  tiles: Placement[];
}

export function previewScore(
  board: (Tile | null)[][],
  placedTiles: Map<string, Tile>,
  moveHistory: MoveHistoryEntry[],
): { score: number; words: string[] } | null {
  if (placedTiles.size === 0) return null;

  const placements: Placement[] = Array.from(placedTiles.entries()).map(([key, tile]) => {
    const [row, col] = key.split(',').map(Number);
    return { tile, row, col };
  });

  // Validate structure
  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));
  if (rows.size > 1 && cols.size > 1) return null;

  // Build temp board
  const temp: (Tile | null)[][] = board.map((r) => [...r]);
  for (const { tile, row, col } of placements) temp[row][col] = tile;
  const placedPos = new Set(placements.map((p) => `${p.row},${p.col}`));

  // Contiguity
  if (placements.length > 1) {
    if (rows.size === 1) {
      const row = placements[0].row;
      const minC = Math.min(...placements.map((p) => p.col));
      const maxC = Math.max(...placements.map((p) => p.col));
      for (let c = minC; c <= maxC; c++) if (temp[row][c] === null) return null;
    } else {
      const col = placements[0].col;
      const minR = Math.min(...placements.map((p) => p.row));
      const maxR = Math.max(...placements.map((p) => p.row));
      for (let r = minR; r <= maxR; r++) if (temp[r][col] === null) return null;
    }
  }

  const isFirstMove = moveHistory.filter((m) => m.type === 'play').length === 0;

  if (isFirstMove) {
    const center = Math.floor(BOARD_SIZE / 2);
    if (!placements.some((p) => p.row === center && p.col === center)) return null;
    if (placements.length < 2) return null;
  } else {
    let connected = false;
    for (const { row, col } of placements) {
      for (const [nr, nc] of [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]) {
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] !== null) {
          connected = true;
          break;
        }
      }
      if (connected) break;
    }
    if (!connected) return null;
  }

  // Find words
  const words: WordInfo[] = [];
  const isHorizontal = rows.size === 1;

  if (isHorizontal || placements.length === 1) {
    const hw = findWord(temp, placements[0].row, placements[0].col, 'h');
    if (hw && hw.tiles.length >= 2) words.push(hw);
    for (const { row, col } of placements) {
      const vw = findWord(temp, row, col, 'v');
      if (vw && vw.tiles.length >= 2) words.push(vw);
    }
  }
  if (!isHorizontal && placements.length > 1) {
    const vw = findWord(temp, placements[0].row, placements[0].col, 'v');
    if (vw && vw.tiles.length >= 2) words.push(vw);
    for (const { row, col } of placements) {
      const hw = findWord(temp, row, col, 'h');
      if (hw && hw.tiles.length >= 2) words.push(hw);
    }
  }

  if (words.length === 0) return null;

  let total = 0;
  for (const w of words) total += scoreWord(w.tiles, placedPos);
  if (placements.length === 7) total += FULL_RACK_BONUS;

  return { score: total, words: words.map((w) => w.word) };
}

function findWord(board: (Tile | null)[][], row: number, col: number, dir: 'h' | 'v'): WordInfo | null {
  const tiles: Placement[] = [];
  if (dir === 'h') {
    let c = col;
    while (c > 0 && board[row][c - 1] !== null) c--;
    while (c < BOARD_SIZE && board[row][c] !== null) { tiles.push({ tile: board[row][c]!, row, col: c }); c++; }
  } else {
    let r = row;
    while (r > 0 && board[r - 1][col] !== null) r--;
    while (r < BOARD_SIZE && board[r][col] !== null) { tiles.push({ tile: board[r][col]!, row: r, col }); r++; }
  }
  if (tiles.length < 2) return null;
  return { word: tiles.map((t) => t.tile.letter).join(''), tiles };
}

function scoreWord(tiles: Placement[], placedPos: Set<string>): number {
  let s = 0, wm = 1;
  for (const { tile, row, col } of tiles) {
    let v = tile.isBlank ? 0 : tile.value;
    if (placedPos.has(`${row},${col}`)) {
      const b = BONUS_GRID[row]?.[col];
      if (b === 'DL') v *= 2; else if (b === 'TL') v *= 3;
      else if (b === 'DW') wm *= 2; else if (b === 'TW') wm *= 3;
    }
    s += v;
  }
  return s * wm;
}
