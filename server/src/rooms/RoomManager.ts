import { Game } from '../game/Game';
import { GameLang } from '../game/constants';

export class RoomManager {
  private games = new Map<string, Game>();
  private rematchRequests = new Map<string, Set<string>>(); // gameCode -> Set<playerId>
  private matchQueue: { socketId: string; playerName: string; lang: GameLang; token?: string }[] = [];

  // ── Indexes for O(1) lookups ──
  private socketIndex = new Map<string, { code: string; playerId: string }>();
  private tokenIndex = new Map<string, { code: string; playerId: string }>();

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = '';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    } while (this.games.has(code));
    return code;
  }

  // ── Index maintenance ──

  private indexPlayer(code: string, playerId: string, socketId: string, token?: string): void {
    this.socketIndex.set(socketId, { code, playerId });
    if (token) this.tokenIndex.set(token, { code, playerId });
  }

  private reindexSocket(oldSocketId: string, newSocketId: string): void {
    const entry = this.socketIndex.get(oldSocketId);
    if (entry) {
      this.socketIndex.delete(oldSocketId);
      this.socketIndex.set(newSocketId, entry);
    }
  }

  private removeGameIndexes(code: string): void {
    for (const [sid, entry] of this.socketIndex) {
      if (entry.code === code) this.socketIndex.delete(sid);
    }
    for (const [tok, entry] of this.tokenIndex) {
      if (entry.code === code) this.tokenIndex.delete(tok);
    }
  }

  // ── Game lifecycle ──

  createGame(playerName: string, socketId: string, lang: GameLang = 'en', token?: string): { code: string; playerId: string } {
    const code = this.generateCode();
    const game = new Game(code, lang);
    const playerId = game.addPlayer(playerName, socketId, token);
    this.games.set(code, game);
    this.indexPlayer(code, playerId, socketId, token);
    return { code, playerId };
  }

  joinGame(code: string, playerName: string, socketId: string, token?: string): { playerId: string; game: Game } | { error: string } {
    const game = this.games.get(code.toUpperCase());
    if (!game) return { error: 'Game not found' };
    if (game.status !== 'waiting') return { error: 'Game already started' };
    if (game.players.length >= 2) return { error: 'Game is full' };
    const playerId = game.addPlayer(playerName, socketId, token);
    this.indexPlayer(code.toUpperCase(), playerId, socketId, token);
    game.start();
    return { playerId, game };
  }

  rejoinGame(code: string, playerId: string, socketId: string): { game: Game } | { error: string } {
    const game = this.games.get(code.toUpperCase());
    if (!game) return { error: 'Game not found' };
    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { error: 'Player not found' };
    const oldSocketId = player.socketId;
    player.socketId = socketId;
    player.connected = true;
    this.reindexSocket(oldSocketId, socketId);
    return { game };
  }

  getGame(code: string): Game | undefined {
    return this.games.get(code.toUpperCase());
  }

  getAllGames(): Game[] {
    return Array.from(this.games.values());
  }

  // O(1) lookup by socketId
  findGameBySocket(socketId: string): { game: Game; playerId: string } | null {
    const entry = this.socketIndex.get(socketId);
    if (!entry) return null;
    const game = this.games.get(entry.code);
    if (!game) { this.socketIndex.delete(socketId); return null; }
    return { game, playerId: entry.playerId };
  }

  // O(1) lookup by token — only returns active (waiting/playing) games
  findGameByToken(token: string): { game: Game; playerId: string; code: string } | null {
    const entry = this.tokenIndex.get(token);
    if (!entry) return null;
    const game = this.games.get(entry.code);
    if (!game || (game.status !== 'waiting' && game.status !== 'playing')) {
      this.tokenIndex.delete(token);
      return null;
    }
    return { game, playerId: entry.playerId, code: entry.code };
  }

  // ── Rematch ──

  requestRematch(code: string, playerId: string): 'waiting' | 'accepted' {
    const game = this.games.get(code.toUpperCase());
    if (!game || game.status !== 'finished') return 'waiting';

    if (!this.rematchRequests.has(code)) this.rematchRequests.set(code, new Set());
    this.rematchRequests.get(code)!.add(playerId);

    if (game.players.every((p) => this.rematchRequests.get(code)!.has(p.id))) {
      this.rematchRequests.delete(code);
      return 'accepted';
    }
    return 'waiting';
  }

  getRematchRequesters(code: string): Set<string> {
    return this.rematchRequests.get(code) ?? new Set();
  }

  createRematch(oldCode: string): { code: string; playerAssignments: { oldPlayerId: string; newPlayerId: string; token?: string }[] } | null {
    const oldGame = this.games.get(oldCode.toUpperCase());
    if (!oldGame) return null;

    const code = this.generateCode();
    const newGame = new Game(code, oldGame.lang);
    const assignments: { oldPlayerId: string; newPlayerId: string; token?: string }[] = [];

    for (const oldPlayer of oldGame.players) {
      const token = oldGame.playerTokens.get(oldPlayer.id);
      const newPlayerId = newGame.addPlayer(oldPlayer.name, oldPlayer.socketId, token);
      assignments.push({ oldPlayerId: oldPlayer.id, newPlayerId, token });
      this.indexPlayer(code, newPlayerId, oldPlayer.socketId, token);
    }

    newGame.start();
    this.games.set(code, newGame);
    this.rematchRequests.delete(oldCode);
    return { code, playerAssignments: assignments };
  }

  cleanupFinished(): void {
    for (const [code, game] of this.games) {
      if (game.status === 'finished' && game.players.every((p) => !p.connected)) {
        this.removeGameIndexes(code);
        this.games.delete(code);
        this.rematchRequests.delete(code);
      }
    }
  }

  // ── Matchmaking Queue ──

  joinMatchQueue(socketId: string, playerName: string, lang: GameLang, token?: string): { matched: true; code: string; playerId: string; opponentSocketId: string; opponentPlayerId: string } | { matched: false } {
    // Check if someone with the same lang is already queued
    const idx = this.matchQueue.findIndex((q) => q.lang === lang && q.socketId !== socketId);
    if (idx !== -1) {
      const opponent = this.matchQueue.splice(idx, 1)[0];
      // Also remove self if somehow already in queue
      this.matchQueue = this.matchQueue.filter((q) => q.socketId !== socketId);

      // Create game with the opponent as host, then join as second player
      const { code, playerId: opponentPlayerId } = this.createGame(opponent.playerName, opponent.socketId, lang, opponent.token);
      const joinResult = this.joinGame(code, playerName, socketId, token);
      if ('error' in joinResult) {
        // Shouldn't happen, but handle gracefully
        return { matched: false };
      }
      return {
        matched: true,
        code,
        playerId: joinResult.playerId,
        opponentSocketId: opponent.socketId,
        opponentPlayerId,
      };
    }

    // No match found — add to queue (remove existing entry first to avoid duplicates)
    this.matchQueue = this.matchQueue.filter((q) => q.socketId !== socketId);
    this.matchQueue.push({ socketId, playerName, lang, token });
    return { matched: false };
  }

  leaveMatchQueue(socketId: string): void {
    this.matchQueue = this.matchQueue.filter((q) => q.socketId !== socketId);
  }

  isInQueue(socketId: string): boolean {
    return this.matchQueue.some((q) => q.socketId === socketId);
  }
}
