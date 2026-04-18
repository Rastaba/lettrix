export interface Tile {
  id: string;
  letter: string;
  value: number;
  isBlank: boolean;
}

export interface Player {
  id: string;
  name: string;
  socketId: string;
  rack: Tile[];
  score: number;
  connected: boolean;
  isAI?: boolean;
}

export interface PlacedTileData {
  tileId: string;
  row: number;
  col: number;
  letter: string;
}

export interface MovePlacement {
  row: number;
  col: number;
  letter: string;
  value: number;
  isBlank: boolean;
}

export interface MoveHistoryEntry {
  playerName: string;
  type: 'play' | 'exchange' | 'pass';
  words: string[];
  score: number;
  isFullRack?: boolean;
  placements?: MovePlacement[];
}

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface ClientGameState {
  board: (Tile | null)[][];
  players: ClientPlayer[];
  currentPlayerId: string;
  tilesRemaining: number;
  moveHistory: MoveHistoryEntry[];
  status: GameStatus;
  winnerId: string | null;
  lastMove: { row: number; col: number }[] | null;
  turnElapsed: number; // seconds since current turn started
}

export interface ClientPlayer {
  id: string;
  name: string;
  score: number;
  tileCount: number;
  rack?: Tile[];
  connected: boolean;
}
