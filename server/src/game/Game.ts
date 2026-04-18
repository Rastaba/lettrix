import { Tile, Player, PlacedTileData, MoveHistoryEntry, GameStatus, ClientGameState } from '../types';
import { TileBag } from './TileBag';
import { validateAndScoreMove, MoveResult } from './validation';
import { GameLang, RACK_SIZE, MAX_CONSECUTIVE_PASSES } from './constants';

let nextPlayerId = 1;

export class Game {
  id: string;
  lang: GameLang;
  board: (Tile | null)[][];
  players: Player[] = [];
  playerTokens: Map<string, string> = new Map();
  currentPlayerIndex = 0;
  tileBag: TileBag;
  moveHistory: MoveHistoryEntry[] = [];
  status: GameStatus = 'waiting';
  consecutivePasses = 0;
  winnerId: string | null = null;
  lastMove: { row: number; col: number }[] | null = null;
  turnStartedAt = 0; // timestamp when current turn started

  constructor(id: string, lang: GameLang = 'en') {
    this.id = id;
    this.lang = lang;
    this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
    this.tileBag = new TileBag(lang);
  }

  addPlayer(name: string, socketId: string, token?: string, isAI = false): string {
    const id = 'p' + nextPlayerId++;
    this.players.push({ id, name, socketId, rack: [], score: 0, connected: true, isAI });
    if (token) this.playerTokens.set(id, token);
    return id;
  }

  start(): void {
    if (this.players.length !== 2) return;
    this.status = 'playing';
    for (const p of this.players) this.fillRack(p);
    this.resetTurnTimer();
  }

  private fillRack(player: Player): void {
    while (player.rack.length < RACK_SIZE && this.tileBag.remaining() > 0) {
      const t = this.tileBag.draw();
      if (t) player.rack.push(t);
    }
  }

  private resetTurnTimer(): void {
    this.turnStartedAt = Date.now();
  }

  playMove(playerId: string, placed: PlacedTileData[]): MoveResult {
    if (!Array.isArray(placed)) return { valid: false, error: 'Invalid payload' };
    if (placed.length === 0) return { valid: false, error: 'No tiles placed' };
    if (placed.length > RACK_SIZE) return { valid: false, error: 'Too many tiles' };

    const pi = this.players.findIndex((p) => p.id === playerId);
    if (pi === -1) return { valid: false, error: 'Player not found' };
    if (pi !== this.currentPlayerIndex) return { valid: false, error: 'Not your turn' };
    if (this.status !== 'playing') return { valid: false, error: 'Game not in progress' };

    // Reject duplicate tileIds (prevents tile-clone exploit on malicious clients)
    const seenIds = new Set<string>();
    for (const pt of placed) {
      if (!pt || typeof pt.tileId !== 'string' || typeof pt.row !== 'number' || typeof pt.col !== 'number') {
        return { valid: false, error: 'Invalid placement' };
      }
      if (seenIds.has(pt.tileId)) return { valid: false, error: 'Duplicate tile in move' };
      seenIds.add(pt.tileId);
    }

    const player = this.players[pi];
    for (const pt of placed) {
      if (!player.rack.find((t) => t.id === pt.tileId)) {
        return { valid: false, error: 'Tile not in your rack' };
      }
    }

    const placements = placed.map((pt) => {
      const rackTile = player.rack.find((t) => t.id === pt.tileId)!;
      return {
        tile: { ...rackTile, letter: rackTile.isBlank ? String(pt.letter ?? '').toUpperCase() : rackTile.letter },
        row: pt.row,
        col: pt.col,
      };
    });

    const isFirstMove = this.moveHistory.filter((m) => m.type === 'play').length === 0;
    const result = validateAndScoreMove(this.board, placements, isFirstMove, this.lang);
    if (!result.valid) return result;

    for (const { tile, row, col } of placements) this.board[row][col] = tile;
    for (const pt of placed) {
      const idx = player.rack.findIndex((t) => t.id === pt.tileId);
      if (idx !== -1) player.rack.splice(idx, 1);
    }

    player.score += result.score!;
    this.lastMove = placements.map((p) => ({ row: p.row, col: p.col }));
    const isFullRack = placed.length === 7;
    this.moveHistory.push({
      playerName: player.name, type: 'play', words: result.words!, score: result.score!, isFullRack,
      placements: placements.map((p) => ({ row: p.row, col: p.col, letter: p.tile.letter, value: p.tile.value, isBlank: p.tile.isBlank })),
    });
    this.consecutivePasses = 0;
    this.fillRack(player);

    if (player.rack.length === 0 && this.tileBag.remaining() === 0) {
      this.endGame(pi);
    } else {
      this.nextTurn();
    }
    return result;
  }

  passTurn(playerId: string): MoveResult {
    const pi = this.players.findIndex((p) => p.id === playerId);
    if (pi !== this.currentPlayerIndex) return { valid: false, error: 'Not your turn' };
    if (this.status !== 'playing') return { valid: false, error: 'Game not in progress' };

    this.moveHistory.push({ playerName: this.players[pi].name, type: 'pass', words: [], score: 0 });
    this.lastMove = null;
    this.consecutivePasses++;
    if (this.consecutivePasses >= MAX_CONSECUTIVE_PASSES) this.endGame(-1);
    else this.nextTurn();
    return { valid: true };
  }

  exchangeTiles(playerId: string, tileIds: string[]): MoveResult {
    if (!Array.isArray(tileIds)) return { valid: false, error: 'Invalid payload' };
    const pi = this.players.findIndex((p) => p.id === playerId);
    if (pi !== this.currentPlayerIndex) return { valid: false, error: 'Not your turn' };
    if (this.status !== 'playing') return { valid: false, error: 'Game not in progress' };
    if (tileIds.length === 0) return { valid: false, error: 'Select tiles to exchange' };
    if (tileIds.length > RACK_SIZE) return { valid: false, error: 'Too many tiles' };
    if (this.tileBag.remaining() < tileIds.length) return { valid: false, error: 'Not enough tiles in bag' };

    // Reject duplicate tileIds
    const uniq = new Set(tileIds);
    if (uniq.size !== tileIds.length) return { valid: false, error: 'Duplicate tiles' };

    const player = this.players[pi];
    const removed: Tile[] = [];
    for (const tid of tileIds) {
      const idx = player.rack.findIndex((t) => t.id === tid);
      if (idx === -1) return { valid: false, error: 'Tile not in rack' };
      removed.push(player.rack.splice(idx, 1)[0]);
    }

    this.fillRack(player);
    for (const t of removed) this.tileBag.returnTile(t);

    this.moveHistory.push({ playerName: player.name, type: 'exchange', words: [], score: 0 });
    this.lastMove = null;
    this.consecutivePasses = 0;
    this.nextTurn();
    return { valid: true };
  }

  private nextTurn(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.resetTurnTimer();
  }

  private endGame(winnerByEmptyRack: number): void {
    this.status = 'finished';
    if (winnerByEmptyRack >= 0) {
      const opp = this.players[1 - winnerByEmptyRack];
      const val = opp.rack.reduce((s, t) => s + t.value, 0);
      this.players[winnerByEmptyRack].score += val;
      opp.score -= val;
    } else {
      for (const p of this.players) p.score -= p.rack.reduce((s, t) => s + t.value, 0);
    }
    if (this.players[0].score > this.players[1].score) this.winnerId = this.players[0].id;
    else if (this.players[1].score > this.players[0].score) this.winnerId = this.players[1].id;
    else this.winnerId = null;
    this.turnStartedAt = 0;
  }

  getStateForPlayer(playerId: string): ClientGameState {
    const turnElapsed = this.status === 'playing' && this.turnStartedAt > 0
      ? Math.floor((Date.now() - this.turnStartedAt) / 1000)
      : 0;

    return {
      board: this.board,
      players: this.players.map((p) => ({
        id: p.id, name: p.name, score: p.score, tileCount: p.rack.length,
        rack: p.id === playerId ? p.rack : undefined,
        connected: p.connected,
      })),
      currentPlayerId: this.players[this.currentPlayerIndex]?.id ?? '',
      tilesRemaining: this.tileBag.remaining(),
      moveHistory: this.moveHistory,
      status: this.status,
      winnerId: this.winnerId,
      lastMove: this.lastMove,
      turnElapsed,
    };
  }
}
