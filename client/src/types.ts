export interface Tile {
  id: string;
  letter: string;
  value: number;
  isBlank: boolean;
}

export interface ClientPlayer {
  id: string;
  name: string;
  score: number;
  tileCount: number;
  rack?: Tile[];
  connected: boolean;
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

export type BonusType = 'TW' | 'DW' | 'TL' | 'DL' | null;

export interface GameState {
  board: (Tile | null)[][];
  players: ClientPlayer[];
  currentPlayerId: string;
  tilesRemaining: number;
  moveHistory: MoveHistoryEntry[];
  status: 'waiting' | 'playing' | 'finished';
  winnerId: string | null;
  lastMove: { row: number; col: number }[] | null;
  turnElapsed: number;
}

export interface PlacedTile {
  tileId: string;
  row: number;
  col: number;
  letter: string;
}

export interface DailyMission {
  id: string;
  type: string;
  target: number;
  progress: number;
  xp: number;
  desc: { fr: string; en: string };
}
