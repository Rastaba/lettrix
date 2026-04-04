import { Tile, PlacedTileData } from '../types';
import { isValidWord, getWordSet } from '../dictionary';
import {
  BOARD_SIZE,
  BONUS_GRID,
  FULL_RACK_BONUS,
  GameLang,
  getLetterValues,
  BonusType,
} from './constants';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

interface CandidateMove {
  placements: PlacedTileData[];
  score: number;
}

// ── Helpers ──

/** Get the letter on the board at (r, c), or null. */
function boardLetter(board: (Tile | null)[][], r: number, c: number): string | null {
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return null;
  return board[r][c]?.letter ?? null;
}

/** Check whether a cell is occupied. */
function isOccupied(board: (Tile | null)[][], r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c < BOARD_SIZE && c >= 0 && board[r][c] !== null;
}

/** Score a word formed on a temporary board, given newly placed positions. */
function scoreWord(
  tempBoard: (Tile | null)[][],
  tiles: { tile: Tile; row: number; col: number }[],
  newlyPlaced: Set<string>,
): number {
  let sum = 0;
  let wordMultiplier = 1;
  for (const { tile, row, col } of tiles) {
    let v = tile.isBlank ? 0 : tile.value;
    if (newlyPlaced.has(`${row},${col}`)) {
      const b: BonusType = BONUS_GRID[row][col];
      if (b === 'DL') v *= 2;
      else if (b === 'TL') v *= 3;
      else if (b === 'DW') wordMultiplier *= 2;
      else if (b === 'TW') wordMultiplier *= 3;
    }
    sum += v;
  }
  return sum * wordMultiplier;
}

/**
 * Collect a full word along a direction starting from a tile position.
 * Returns the array of tiles with positions, or null if length < 2.
 */
function collectWord(
  board: (Tile | null)[][],
  row: number,
  col: number,
  dir: 'h' | 'v',
): { tiles: { tile: Tile; row: number; col: number }[]; word: string } | null {
  const tiles: { tile: Tile; row: number; col: number }[] = [];
  if (dir === 'h') {
    let c = col;
    while (c > 0 && board[row][c - 1] !== null) c--;
    while (c < BOARD_SIZE && board[row][c] !== null) {
      tiles.push({ tile: board[row][c]!, row, col: c });
      c++;
    }
  } else {
    let r = row;
    while (r > 0 && board[r - 1][col] !== null) r--;
    while (r < BOARD_SIZE && board[r][col] !== null) {
      tiles.push({ tile: board[r][col]!, row: r, col });
      r++;
    }
  }
  if (tiles.length < 2) return null;
  return { tiles, word: tiles.map((t) => t.tile.letter).join('') };
}

/**
 * Validate and score a candidate placement on the board.
 * Returns the total score if all formed words are valid, or -1 if invalid.
 */
function tryPlacement(
  board: (Tile | null)[][],
  placements: { tile: Tile; row: number; col: number }[],
  isFirstMove: boolean,
  lang: GameLang,
): number {
  // Build temporary board
  const temp: (Tile | null)[][] = board.map((r) => [...r]);
  for (const { tile, row, col } of placements) {
    temp[row][col] = tile;
  }

  const newlyPlaced = new Set(placements.map((p) => `${p.row},${p.col}`));

  // Determine direction
  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));

  // All in a single line
  if (rows.size > 1 && cols.size > 1) return -1;

  // Check contiguity
  if (placements.length > 1) {
    if (rows.size === 1) {
      const row = placements[0].row;
      const minC = Math.min(...placements.map((p) => p.col));
      const maxC = Math.max(...placements.map((p) => p.col));
      for (let c = minC; c <= maxC; c++) {
        if (temp[row][c] === null) return -1;
      }
    } else {
      const col = placements[0].col;
      const minR = Math.min(...placements.map((p) => p.row));
      const maxR = Math.max(...placements.map((p) => p.row));
      for (let r = minR; r <= maxR; r++) {
        if (temp[r][col] === null) return -1;
      }
    }
  }

  // First move must cover center
  if (isFirstMove) {
    const center = Math.floor(BOARD_SIZE / 2);
    if (!placements.some((p) => p.row === center && p.col === center)) return -1;
    if (placements.length < 2) return -1;
  } else {
    // Must connect to existing tiles
    let connected = false;
    for (const { row, col } of placements) {
      for (const [nr, nc] of [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ]) {
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] !== null) {
          connected = true;
          break;
        }
      }
      if (connected) break;
    }
    if (!connected) return -1;
  }

  // Collect all formed words
  const isHorizontal = rows.size === 1;
  interface WInfo {
    word: string;
    tiles: { tile: Tile; row: number; col: number }[];
  }
  const words: WInfo[] = [];

  if (isHorizontal || placements.length === 1) {
    const hw = collectWord(temp, placements[0].row, placements[0].col, 'h');
    if (hw && hw.tiles.length >= 2) words.push(hw);
    for (const { row, col } of placements) {
      const vw = collectWord(temp, row, col, 'v');
      if (vw && vw.tiles.length >= 2) words.push(vw);
    }
  }
  if (!isHorizontal && placements.length > 1) {
    const vw = collectWord(temp, placements[0].row, placements[0].col, 'v');
    if (vw && vw.tiles.length >= 2) words.push(vw);
    for (const { row, col } of placements) {
      const hw = collectWord(temp, row, col, 'h');
      if (hw && hw.tiles.length >= 2) words.push(hw);
    }
  }

  if (words.length === 0) return -1;

  // Validate all words
  for (const w of words) {
    if (!isValidWord(w.word, lang)) return -1;
  }

  // Score
  let total = 0;
  for (const w of words) {
    total += scoreWord(temp, w.tiles, newlyPlaced);
  }
  if (placements.length === 7) total += FULL_RACK_BONUS;

  return total;
}

// ── Anchor-based move generation ──

/**
 * Find all anchor cells: empty cells adjacent to at least one occupied cell.
 * On first move, the center is the only anchor.
 */
function findAnchors(board: (Tile | null)[][], isFirstMove: boolean): { row: number; col: number }[] {
  if (isFirstMove) {
    const center = Math.floor(BOARD_SIZE / 2);
    return [{ row: center, col: center }];
  }

  const anchors: { row: number; col: number }[] = [];
  const seen = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) continue;
      for (const [nr, nc] of [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ]) {
        if (isOccupied(board, nr, nc)) {
          const key = `${r},${c}`;
          if (!seen.has(key)) {
            anchors.push({ row: r, col: c });
            seen.add(key);
          }
          break;
        }
      }
    }
  }
  return anchors;
}

/**
 * Given a rack, enumerate possible "rack letter bags" including blank substitutions.
 * Returns a map of letter -> count for available rack tiles.
 */
function rackLetterCounts(rack: Tile[]): { counts: Map<string, number>; blanks: number } {
  const counts = new Map<string, number>();
  let blanks = 0;
  for (const t of rack) {
    if (t.isBlank) {
      blanks++;
    } else {
      counts.set(t.letter, (counts.get(t.letter) ?? 0) + 1);
    }
  }
  return { counts, blanks };
}

/**
 * Try to form words along a line (row or column) starting from an anchor position.
 * For each direction (horizontal/vertical), we try placing tiles at various start offsets
 * so the word passes through the anchor.
 */
function generateMovesForAnchor(
  board: (Tile | null)[][],
  anchor: { row: number; col: number },
  rack: Tile[],
  isFirstMove: boolean,
  lang: GameLang,
  wordSet: Set<string>,
  maxMoves: number,
): CandidateMove[] {
  const moves: CandidateMove[] = [];
  const letterValues = getLetterValues(lang);
  const { counts: rackCounts, blanks: rackBlanks } = rackLetterCounts(rack);

  // Try both directions
  for (const dir of ['h', 'v'] as const) {
    const dr = dir === 'v' ? 1 : 0;
    const dc = dir === 'h' ? 1 : 0;

    // Determine how far back from the anchor we can start (limited by rack size and board edge)
    const maxBack = Math.min(rack.length - 1, dir === 'h' ? anchor.col : anchor.row);
    // Determine how far forward we can go
    const maxForward = Math.min(
      rack.length,
      dir === 'h' ? BOARD_SIZE - 1 - anchor.col : BOARD_SIZE - 1 - anchor.row,
    );

    // For each possible start offset (how many cells before the anchor)
    for (let back = 0; back <= maxBack; back++) {
      const startR = anchor.row - back * dr;
      const startC = anchor.col - back * dc;

      // Skip if start position is occupied on the original board (we want to start from empty or edge)
      // Actually, we might start from an existing tile that extends our word - handle below.

      // Try word lengths from 2 to rack.length + existing tiles that can be used
      const maxLen = Math.min(
        BOARD_SIZE - (dir === 'h' ? startC : startR),
        rack.length + 7, // generous upper bound
      );

      for (let len = 2; len <= maxLen; len++) {
        // Determine end position
        const endR = startR + (len - 1) * dr;
        const endC = startC + (len - 1) * dc;
        if (endR >= BOARD_SIZE || endC >= BOARD_SIZE) break;

        // Check that the anchor is included in this span
        const anchorIdx = dir === 'h' ? anchor.col - startC : anchor.row - startR;
        if (anchorIdx < 0 || anchorIdx >= len) continue;

        // Collect what letters are needed from the rack and which are on the board
        const usedRack = new Map<string, number>();
        let blanksUsed = 0;
        const pattern: (string | null)[] = []; // null = need from rack
        let needsFromRack = 0;
        let valid = true;

        for (let i = 0; i < len; i++) {
          const r = startR + i * dr;
          const c = startC + i * dc;
          const existing = boardLetter(board, r, c);
          if (existing !== null) {
            pattern.push(existing);
          } else {
            pattern.push(null);
            needsFromRack++;
          }
        }

        // Must place at least 1 tile from rack
        if (needsFromRack === 0) continue;
        // Can't need more tiles than we have
        if (needsFromRack > rack.length) continue;

        // Ensure no tiles just before or after this span (otherwise the word would be longer)
        const beforeR = startR - dr;
        const beforeC = startC - dc;
        if (isOccupied(board, beforeR, beforeC)) continue;
        const afterR = startR + len * dr;
        const afterC = startC + len * dc;
        if (isOccupied(board, afterR, afterC)) continue;

        // Try to find matching words from the word set using the pattern
        // Build a regex-like filter: for each position, fixed letter or wildcard
        // Since iterating the full word set can be expensive, we use a prefix check approach.
        // For short patterns, we directly test all possible rack letter combinations.

        // Strategy: for each empty position, we need to assign a rack tile.
        // With blanks this is complex. Use recursive backtracking.
        const result = fillAndValidate(
          pattern,
          rack,
          rackCounts,
          rackBlanks,
          wordSet,
          lang,
        );

        for (const { word, tileAssignments } of result) {
          // tileAssignments: for each null position in pattern, which rack tile to use
          // Build placements
          const placements: { tile: Tile; row: number; col: number }[] = [];
          const placedTileData: PlacedTileData[] = [];
          let assignIdx = 0;

          for (let i = 0; i < len; i++) {
            if (pattern[i] === null) {
              const assignment = tileAssignments[assignIdx++];
              const r = startR + i * dr;
              const c = startC + i * dc;
              const tile: Tile = {
                id: assignment.tileId,
                letter: word[i],
                value: assignment.isBlank ? 0 : letterValues[word[i]] ?? 0,
                isBlank: assignment.isBlank,
              };
              placements.push({ tile, row: r, col: c });
              placedTileData.push({
                tileId: assignment.tileId,
                row: r,
                col: c,
                letter: word[i],
              });
            }
          }

          // Validate the full move (checks cross-words, connectivity, etc.)
          const score = tryPlacement(board, placements, isFirstMove, lang);
          if (score > 0) {
            moves.push({ placements: placedTileData, score });
            if (moves.length >= maxMoves) return moves;
          }
        }
      }
    }
  }

  return moves;
}

interface TileAssignment {
  tileId: string;
  isBlank: boolean;
}

/**
 * Given a pattern (array of fixed letters or null for wildcards),
 * try all possible assignments of rack tiles to wildcards and return
 * those that form valid words.
 */
function fillAndValidate(
  pattern: (string | null)[],
  rack: Tile[],
  rackCounts: Map<string, number>,
  rackBlanks: number,
  wordSet: Set<string>,
  lang: string,
): { word: string; tileAssignments: TileAssignment[] }[] {
  const results: { word: string; tileAssignments: TileAssignment[] }[] = [];
  const nullPositions = pattern.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);

  if (nullPositions.length === 0) return results;

  // Available tiles from rack for assignment
  const availableTiles = [...rack];

  // Recursive fill
  const currentWord = [...pattern]; // mutable copy
  const usedTileIds = new Set<string>();
  const assignments: TileAssignment[] = [];

  function backtrack(idx: number): void {
    if (results.length >= 5) return; // limit results per pattern

    if (idx === nullPositions.length) {
      // Check if this forms a valid word
      const word = currentWord.join('');
      if (wordSet.has(word)) {
        results.push({ word, tileAssignments: [...assignments] });
      }
      return;
    }

    const pos = nullPositions[idx];
    const tried = new Set<string>();

    // Try each available rack tile
    for (const tile of availableTiles) {
      if (usedTileIds.has(tile.id)) continue;

      if (tile.isBlank) {
        // Try all 26 letters for blank
        for (let code = 65; code <= 90; code++) {
          const letter = String.fromCharCode(code);
          if (tried.has('_' + letter)) continue;
          tried.add('_' + letter);

          currentWord[pos] = letter;
          usedTileIds.add(tile.id);
          assignments.push({ tileId: tile.id, isBlank: true });

          // Prefix check: see if any word starts with what we have so far
          if (couldFormWord(currentWord, pattern, wordSet)) {
            backtrack(idx + 1);
          }

          assignments.pop();
          usedTileIds.delete(tile.id);
          currentWord[pos] = null;
        }
      } else {
        const letter = tile.letter;
        const key = letter;
        if (tried.has(key)) continue;
        tried.add(key);

        currentWord[pos] = letter;
        usedTileIds.add(tile.id);
        assignments.push({ tileId: tile.id, isBlank: false });

        if (couldFormWord(currentWord, pattern, wordSet)) {
          backtrack(idx + 1);
        }

        assignments.pop();
        usedTileIds.delete(tile.id);
        currentWord[pos] = null;
      }
    }
  }

  backtrack(0);
  return results;
}

/**
 * Quick check: could the partially filled word form any valid word?
 * This is a lightweight prefix filter.
 */
function couldFormWord(
  currentWord: (string | null)[],
  _pattern: (string | null)[],
  _wordSet: Set<string>,
): boolean {
  // If all positions are filled, it will be checked in the main backtrack
  // For partial fills, we can't efficiently prefix-check a Set, so return true
  // The full validation happens when all positions are filled
  return true;
}

// ── Public API ──

/**
 * Find the best move for the AI given the current board state and rack.
 */
export function findBestMove(
  board: (Tile | null)[][],
  rack: Tile[],
  isFirstMove: boolean,
  lang: GameLang,
  difficulty: AIDifficulty,
): CandidateMove | null {
  const wordSet = getWordSet(lang);
  if (!wordSet) return null;
  if (rack.length === 0) return null;

  const anchors = findAnchors(board, isFirstMove);
  if (anchors.length === 0) return null;

  const allMoves: CandidateMove[] = [];
  const startTime = Date.now();
  const TIME_LIMIT = 400; // ms

  // For easy mode, we need fewer moves
  const targetMoves = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 60 : 200;

  // Shuffle anchors so we don't always search the same area first
  shuffleArray(anchors);

  for (const anchor of anchors) {
    if (Date.now() - startTime > TIME_LIMIT) break;
    if (allMoves.length >= targetMoves) break;

    const movesForAnchor = generateMovesForAnchor(
      board,
      anchor,
      rack,
      isFirstMove,
      lang,
      wordSet,
      targetMoves - allMoves.length,
    );
    allMoves.push(...movesForAnchor);
  }

  if (allMoves.length === 0) return null;

  // Deduplicate moves by placement positions + letters
  const seen = new Set<string>();
  const uniqueMoves: CandidateMove[] = [];
  for (const m of allMoves) {
    const key = m.placements
      .map((p) => `${p.row},${p.col},${p.letter}`)
      .sort()
      .join('|');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMoves.push(m);
    }
  }

  if (uniqueMoves.length === 0) return null;

  // Sort by score
  uniqueMoves.sort((a, b) => a.score - b.score);

  // Select based on difficulty
  const n = uniqueMoves.length;
  let selectedMove: CandidateMove;

  switch (difficulty) {
    case 'easy': {
      // Bottom 30% of scored moves (or at least index 0)
      const maxIdx = Math.max(0, Math.floor(n * 0.3) - 1);
      const idx = Math.floor(Math.random() * (maxIdx + 1));
      selectedMove = uniqueMoves[idx];
      break;
    }
    case 'medium': {
      // Middle 40-70% range
      const lo = Math.floor(n * 0.4);
      const hi = Math.min(n - 1, Math.floor(n * 0.7));
      const idx = lo + Math.floor(Math.random() * (hi - lo + 1));
      selectedMove = uniqueMoves[Math.min(idx, n - 1)];
      break;
    }
    case 'hard':
    default: {
      // Top move
      selectedMove = uniqueMoves[n - 1];
      break;
    }
  }

  return selectedMove;
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
