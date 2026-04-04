import { Tile } from '../types';
import { BOARD_SIZE, BONUS_GRID, FULL_RACK_BONUS } from './constants';
import { isValidWord } from '../dictionary';

export interface TilePlacement {
  tile: Tile;
  row: number;
  col: number;
}

export interface MoveResult {
  valid: boolean;
  error?: string;
  words?: string[];
  score?: number;
}

export function validateAndScoreMove(
  board: (Tile | null)[][],
  placements: TilePlacement[],
  isFirstMove: boolean,
  lang: string = 'en',
): MoveResult {
  if (placements.length === 0) {
    return { valid: false, error: 'No tiles placed' };
  }

  for (const { row, col } of placements) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return { valid: false, error: 'Position out of bounds' };
    }
    if (board[row][col] !== null) {
      return { valid: false, error: 'Position already occupied' };
    }
  }

  const posSet = new Set(placements.map((p) => `${p.row},${p.col}`));
  if (posSet.size !== placements.length) {
    return { valid: false, error: 'Duplicate positions' };
  }

  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));
  if (rows.size > 1 && cols.size > 1) {
    return { valid: false, error: 'Tiles must be in a single row or column' };
  }

  const temp: (Tile | null)[][] = board.map((r) => [...r]);
  for (const { tile, row, col } of placements) {
    temp[row][col] = tile;
  }

  const placedPos = new Set(placements.map((p) => `${p.row},${p.col}`));

  // Contiguity
  if (placements.length > 1) {
    if (rows.size === 1) {
      const row = placements[0].row;
      const minC = Math.min(...placements.map((p) => p.col));
      const maxC = Math.max(...placements.map((p) => p.col));
      for (let c = minC; c <= maxC; c++) {
        if (temp[row][c] === null) return { valid: false, error: 'Tiles must be contiguous' };
      }
    } else {
      const col = placements[0].col;
      const minR = Math.min(...placements.map((p) => p.row));
      const maxR = Math.max(...placements.map((p) => p.row));
      for (let r = minR; r <= maxR; r++) {
        if (temp[r][col] === null) return { valid: false, error: 'Tiles must be contiguous' };
      }
    }
  }

  if (isFirstMove) {
    const center = Math.floor(BOARD_SIZE / 2);
    if (!placements.some((p) => p.row === center && p.col === center)) {
      return { valid: false, error: 'First word must cover the center square' };
    }
    if (placements.length < 2) {
      return { valid: false, error: 'First word must be at least 2 letters' };
    }
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
    if (!connected) return { valid: false, error: 'Word must connect to existing tiles' };
  }

  // Find words
  interface WInfo { word: string; tiles: TilePlacement[]; score: number }
  const words: WInfo[] = [];
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

  if (words.length === 0) return { valid: false, error: 'No valid words formed' };

  for (const w of words) {
    if (!isValidWord(w.word, lang)) {
      return { valid: false, error: `"${w.word}" is not a valid word` };
    }
  }

  let total = 0;
  for (const w of words) {
    w.score = scoreWord(w.tiles, placedPos);
    total += w.score;
  }
  if (placements.length === 7) total += FULL_RACK_BONUS;

  return { valid: true, words: words.map((w) => w.word), score: total };
}

function findWord(board: (Tile | null)[][], row: number, col: number, dir: 'h' | 'v') {
  const tiles: TilePlacement[] = [];
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
  return { word: tiles.map((t) => t.tile.letter).join(''), tiles, score: 0 };
}

function scoreWord(tiles: TilePlacement[], placedPos: Set<string>): number {
  let s = 0, wm = 1;
  for (const { tile, row, col } of tiles) {
    let v = tile.isBlank ? 0 : tile.value;
    if (placedPos.has(`${row},${col}`)) {
      const b = BONUS_GRID[row][col];
      if (b === 'DL') v *= 2; else if (b === 'TL') v *= 3;
      else if (b === 'DW') wm *= 2; else if (b === 'TW') wm *= 3;
    }
    s += v;
  }
  return s * wm;
}
