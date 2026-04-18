import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { RoomManager } from './rooms/RoomManager';
import { loadDictionary } from './dictionary';
import { Game } from './game/Game';
import * as db from './db';
import { checkAchievements, xpForMove, xpForGameEnd, ACHIEVEMENT_MAP, calculateLevel } from './achievements';
import { scheduleAIMove, getAIName, AIDifficulty } from './game/AIPlayer';

const app = express();
const server = createServer(app);
const allowedOrigins = process.env.ALLOWED_ORIGINS === '*' ? '*' : (process.env.ALLOWED_ORIGINS?.split(',') ?? '*');
const io = new Server(server, { cors: { origin: allowedOrigins } });
const rooms = new RoomManager();

// ── AI game tracking ──
const aiGames = new Map<string, { aiPlayerId: string; difficulty: AIDifficulty }>();

// ── Simple rate limiter per socket ──
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 10_000; // 10 seconds
const RATE_LIMIT_MAX = 50; // max events per window

function rateLimit(socketId: string): boolean {
  const now = Date.now();
  let entry = rateLimits.get(socketId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    rateLimits.set(socketId, entry);
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Cleanup stale rate limit entries every 30s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(key);
  }
}, 30_000);

// ── Reaction rate limiter (1 reaction per 2 seconds per player) ──
const reactionCooldowns = new Map<string, number>();

function canSendReaction(playerId: string): boolean {
  const now = Date.now();
  const lastSent = reactionCooldowns.get(playerId);
  if (lastSent && now - lastSent < 2000) return false;
  reactionCooldowns.set(playerId, now);
  return true;
}

// Cleanup stale reaction cooldowns every 30s
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of reactionCooldowns) {
    if (now - ts > 10_000) reactionCooldowns.delete(key);
  }
}, 30_000);

loadDictionary();
db.loadDB();

app.use(express.static(path.join(__dirname, '../../client/dist')));
app.get('*', (_req, res) => {
  const p = path.join(__dirname, '../../client/dist/index.html');
  res.sendFile(p, (err) => { if (err) res.status(404).send('Not found'); });
});

// ── Helpers ──

function broadcastState(game: Game) {
  for (const p of game.players) {
    if (p.connected) io.to(p.socketId).emit('game-state', game.getStateForPlayer(p.id));
  }
}

function checkAndNotifyAchievements(game: Game, playerName: string, socketId: string, lastMove?: any, justFinished = false, won = false) {
  const token = [...game.playerTokens.entries()].find(([pid]) => game.players.find(p => p.id === pid)?.name === playerName)?.[1];
  if (!token) return;

  const player = db.getPlayerByToken(token);
  if (!player) return;

  const earned = db.getPlayerAchievements(token);
  const newAchievements = checkAchievements({
    playerName,
    earned,
    stats: player.stats,
    game,
    lastMove,
    justFinished,
    won,
  });

  if (newAchievements.length > 0) {
    // Calculate XP from achievements
    let bonusXp = 0;
    for (const id of newAchievements) {
      const def = ACHIEVEMENT_MAP.get(id);
      if (def) bonusXp += def.xp;
    }

    db.addAchievements(token, newAchievements);
    db.addXp(token, bonusXp);

    // Notify client
    const achievements = newAchievements.map(id => {
      const def = ACHIEVEMENT_MAP.get(id);
      if (!def) return null;
      return { id, icon: def.icon, name: def.name, desc: def.desc, rarity: def.rarity, xp: def.xp };
    }).filter(Boolean);

    const updatedPlayer = db.getPlayerByToken(token);
    io.to(socketId).emit('achievements-unlocked', {
      achievements, totalXp: db.getPlayerXp(token),
      unlockedThemes: updatedPlayer?.unlockedThemes ?? ['classic', 'neon'],
    });
    console.log(`🏅 ${tag(socketId)} unlocked: ${newAchievements.join(', ')}`);
  }
}

function recordFinish(game: Game) {
  if (game.status !== 'finished') return;

  const winnerName = game.winnerId ? game.players.find((p) => p.id === game.winnerId)?.name ?? null : null;
  const bestMove = game.moveHistory.reduce<{ word: string; score: number }>(
    (b, m) => (m.type === 'play' && m.score > b.score ? { word: m.words.join(', '), score: m.score } : b),
    { word: '', score: 0 },
  );

  const playerTokens = game.players.map((p) => ({
    token: game.playerTokens.get(p.id) ?? '',
    name: p.name,
    score: p.score,
    won: p.id === game.winnerId,
  }));

  db.recordGameResult(
    {
      id: game.id,
      date: new Date().toISOString(),
      language: game.lang,
      players: game.players.map((p) => ({ name: p.name, score: p.score })),
      winnerName,
      moveCount: game.moveHistory.filter((m) => m.type === 'play').length,
      bestWord: bestMove.word,
      bestWordScore: bestMove.score,
    },
    playerTokens,
    game.moveHistory,
  );
}

// ── AI move helper ──

function triggerAIMoveIfNeeded(gameCode: string, game: Game) {
  const aiInfo = aiGames.get(gameCode.toUpperCase());
  if (!aiInfo) return;
  if (game.status !== 'playing') return;
  if (game.players[game.currentPlayerIndex]?.id !== aiInfo.aiPlayerId) return;

  scheduleAIMove(game, aiInfo.aiPlayerId, aiInfo.difficulty, () => {
    broadcastState(game);
    if (game.status === 'finished') {
      recordFinish(game);
      // XP + achievements for human player
      for (const p of game.players) {
        if (p.id === aiInfo.aiPlayerId) continue;
        const pToken = game.playerTokens.get(p.id);
        if (!pToken) continue;
        const won = p.id === game.winnerId;
        db.addXp(pToken, xpForGameEnd(won));
        checkAndNotifyAchievements(game, p.name, p.socketId, undefined, true, won);
        // Missions
        const mFinish = db.updateMissionProgress(pToken, 'game_finish', 1);
        let allCompleted = [...mFinish.completed];
        let latestMissions = mFinish.missions;
        if (won) {
          const mWin = db.updateMissionProgress(pToken, 'win_game', 1);
          allCompleted.push(...mWin.completed);
          latestMissions = mWin.missions;
        }
        const mScore = db.updateMissionProgress(pToken, 'total_score', p.score);
        allCompleted.push(...mScore.completed);
        latestMissions = mScore.missions;
        if (allCompleted.length > 0) {
          io.to(p.socketId).emit('mission-completed', { completed: allCompleted, missions: latestMissions });
        }
      }
    } else {
      // Check if it's AI's turn again (shouldn't happen in 2p but safety)
      triggerAIMoveIfNeeded(gameCode, game);
    }
  });
}

// ── Nudge timer: re-sync turn clock every 10s.
// We only broadcast if at least one human player is actually connected, and we
// skip work entirely for AI-only or fully-abandoned games.
setInterval(() => {
  for (const game of rooms.getAllGames()) {
    if (game.status !== 'playing') continue;
    if (!game.players.some((p) => !p.isAI && p.connected)) continue;
    broadcastState(game);
  }
}, 10000);

// Periodic cleanup of abandoned / finished rooms (every minute).
// Prevents memory leaks for AI games (AI player has no real socket) and for
// waiting/playing games where every human has been gone for a while.
setInterval(() => rooms.cleanupFinished(), 60_000);

// ── Socket handlers ──

// Map socket → player info for logs
const socketInfo = new Map<string, { name?: string; ip: string }>();

function getIp(socket: any): string {
  return socket.handshake?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    ?? socket.handshake?.address?.replace('::ffff:', '')
    ?? '?';
}

function tag(socketId: string) {
  const info = socketInfo.get(socketId);
  if (!info) return `[${socketId.substring(0, 8)}]`;
  return info.name ? `[${info.name}|${info.ip}]` : `[${info.ip}]`;
}

io.on('connection', (socket) => {
  const ip = getIp(socket);
  const ua = (socket.handshake?.headers?.['user-agent'] ?? '').substring(0, 60);
  socketInfo.set(socket.id, { ip });
  console.log(`🔌 +1 (${io.engine.clientsCount} online) ip=${ip} ua=${ua}`);
  io.emit('online-count', io.engine.clientsCount);

  // Rate limit middleware — wraps all event handlers
  socket.use(([event], next) => {
    if (event === 'disconnect') return next();
    if (rateLimit(socket.id)) {
      console.warn(`⚠️ ${tag(socket.id)} rate limited`);
      return next(new Error('Rate limit exceeded'));
    }
    next();
  });

  // ── Matchmaking ──

  socket.on('find-match', ({ playerName, language, token }: { playerName: string; language?: string; token?: string }, cb) => {
    const name = typeof playerName === 'string' ? playerName.trim().slice(0, 20) : '';
    if (!name) { if (cb) cb({ matched: false, error: 'Invalid name' }); return; }
    const lang = language === 'fr' ? 'fr' : 'en';
    if (token) db.getOrCreatePlayer(token, name);
    socketInfo.set(socket.id, { name, ip });

    const result = rooms.joinMatchQueue(socket.id, name, lang, token);
    if (result.matched) {
      console.log(`🎯 ${tag(socket.id)} matched! Game ${result.code}`);
      // Join the socket room
      socket.join(result.code.toUpperCase());
      const oppSocket = io.sockets.sockets.get(result.opponentSocketId);
      if (oppSocket) oppSocket.join(result.code.toUpperCase());

      // Emit to both players
      socket.emit('match-found', { code: result.code, playerId: result.playerId });
      io.to(result.opponentSocketId).emit('match-found', { code: result.code, playerId: result.opponentPlayerId });

      // Broadcast game state
      const game = rooms.getGame(result.code);
      if (game) broadcastState(game);
      if (cb) cb({ matched: true, code: result.code, playerId: result.playerId });
    } else {
      console.log(`⏳ ${tag(socket.id)} queued for matchmaking (${lang.toUpperCase()})`);
      socket.emit('matchmaking-waiting');
      if (cb) cb({ matched: false });
    }
  });

  socket.on('cancel-match', () => {
    rooms.leaveMatchQueue(socket.id);
    socket.emit('matchmaking-cancelled');
    console.log(`🚫 ${tag(socket.id)} cancelled matchmaking`);
  });

  // ── AI Game ──

  socket.on('create-ai-game', ({ playerName, language, difficulty, token }: { playerName: string; language?: string; difficulty?: string; token?: string }, cb) => {
    const lang = language === 'fr' ? 'fr' : 'en';
    const diff: AIDifficulty = (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') ? difficulty : 'medium';
    if (token) db.getOrCreatePlayer(token, playerName);
    socketInfo.set(socket.id, { name: playerName, ip });

    const { code, playerId } = rooms.createGame(playerName, socket.id, lang, token);
    socket.join(code);
    const aiName = getAIName(diff);
    const joinResult = rooms.joinGame(code, aiName, 'ai-' + code, undefined, true);
    if ('error' in joinResult) { cb({ error: joinResult.error }); return; }

    aiGames.set(code.toUpperCase(), { aiPlayerId: joinResult.playerId, difficulty: diff });
    console.log(`🤖 ${tag(socket.id)} created AI game ${code} (${diff}, ${lang.toUpperCase()}) vs ${aiName}`);
    cb({ code, playerId });

    const game = rooms.getGame(code)!;
    broadcastState(game);
    // If AI goes first, trigger its move
    triggerAIMoveIfNeeded(code, game);
  });


  // Auto-rejoin by token
  socket.on('auto-rejoin', ({ token }: { token: string }, cb) => {
    if (!token) { cb({ success: false }); return; }
    const player = db.getPlayerByToken(token);
    if (player) socketInfo.set(socket.id, { name: player.name, ip });

    const found = rooms.findGameByToken(token);
    if (!found) {
      console.log(`   ${tag(socket.id)} auto-rejoin: no active game`);
      cb({ success: false });
      return;
    }

    found.game.players.find((p) => p.id === found.playerId)!.socketId = socket.id;
    found.game.players.find((p) => p.id === found.playerId)!.connected = true;
    socket.join(found.code.toUpperCase());
    console.log(`🔄 ${tag(socket.id)} rejoined game ${found.code}`);
    cb({ success: true, gameCode: found.code, playerId: found.playerId });
    broadcastState(found.game);
  });

  socket.on('create-game', ({ playerName, language, token }: { playerName: string; language?: string; token?: string }, cb) => {
    const name = typeof playerName === 'string' ? playerName.trim().slice(0, 20) : '';
    if (!name) return cb({ error: 'Invalid name' });
    const lang = language === 'fr' ? 'fr' : 'en';
    if (token) db.getOrCreatePlayer(token, name);
    socketInfo.set(socket.id, { name, ip });
    const { code, playerId } = rooms.createGame(name, socket.id, lang, token);
    socket.join(code);
    console.log(`🆕 ${tag(socket.id)} created game ${code} (${lang.toUpperCase()})`);
    cb({ code, playerId });
    const game = rooms.getGame(code)!;
    socket.emit('game-state', game.getStateForPlayer(playerId));
  });

  socket.on('join-game', ({ code, playerName, token }: { code: string; playerName: string; token?: string }, cb) => {
    const name = typeof playerName === 'string' ? playerName.trim().slice(0, 20) : '';
    if (!name || typeof code !== 'string') return cb({ error: 'Invalid input' });
    if (token) db.getOrCreatePlayer(token, name);
    socketInfo.set(socket.id, { name, ip });
    const result = rooms.joinGame(code, name, socket.id, token);
    if ('error' in result) { cb({ error: result.error }); return; }
    console.log(`🎮 ${tag(socket.id)} joined game ${code} → GAME START`);
    socket.join(code.toUpperCase());
    cb({ playerId: result.playerId });
    broadcastState(result.game);
  });

  socket.on('rejoin-game', ({ code, playerId }: { code: string; playerId: string }, cb) => {
    const result = rooms.rejoinGame(code, playerId, socket.id);
    if ('error' in result) { cb({ success: false }); return; }
    socket.join(code.toUpperCase());
    cb({ success: true });
    broadcastState(result.game);
  });

  socket.on('play-move', ({ gameCode, playerId, tiles }: any, cb) => {
    if (typeof gameCode !== 'string' || typeof playerId !== 'string') {
      return cb({ error: 'Invalid payload' });
    }
    const game = rooms.getGame(gameCode);
    if (!game) { cb({ error: 'Game not found' }); return; }
    // Socket must actually belong to this player (no spoofing via playerId)
    const player = game.players.find((p) => p.id === playerId);
    if (!player || player.socketId !== socket.id) {
      return cb({ error: 'Not authorized' });
    }
    const result = game.playMove(playerId, tiles);
    if (!result.valid) {
      console.log(`   ${tag(socket.id)} play REJECTED in ${gameCode}: ${result.error}`);
      cb({ error: result.error }); return;
    }
    console.log(`✅ ${tag(socket.id)} played in ${gameCode} → +${result.score} pts`);
    cb({ success: true, words: result.words, score: result.score });

    // XP for the move
    const moveToken = [...game.playerTokens.entries()].find(([pid]) => pid === playerId)?.[1];
    if (moveToken) {
      const lastMove = game.moveHistory[game.moveHistory.length - 1];
      db.addXp(moveToken, xpForMove(result.score!, !!lastMove?.isFullRack));
      checkAndNotifyAchievements(game, game.players.find(p => p.id === playerId)!.name, socket.id, lastMove);

      // Mission progress: score of the move
      const missionResult1 = db.updateMissionProgress(moveToken, 'play_move', result.score!);
      // Mission progress: longest word length in this move
      const maxWordLen = result.words ? Math.max(...result.words.map((w: string) => w.length)) : 0;
      const missionResult2 = db.updateMissionProgress(moveToken, 'word_length', maxWordLen);
      const allCompleted = [...missionResult1.completed, ...missionResult2.completed];
      if (allCompleted.length > 0) {
        io.to(socket.id).emit('mission-completed', { completed: allCompleted, missions: missionResult2.missions });
      }
    }

    broadcastState(game);
    if (game.status === 'finished') {
      const winner = game.players.find(p => p.id === game.winnerId);
      console.log(`🏁 Game ${gameCode} finished! Winner: ${winner?.name ?? 'TIE'} (${game.players.map(p => `${p.name}:${p.score}`).join(' vs ')})`);
      recordFinish(game);

      // XP + achievements + missions for both players at game end
      for (const p of game.players) {
        const pToken = game.playerTokens.get(p.id);
        if (!pToken) continue;
        const won = p.id === game.winnerId;
        db.addXp(pToken, xpForGameEnd(won));
        checkAndNotifyAchievements(game, p.name, p.socketId, undefined, true, won);

        // Mission progress: game finished
        const mFinish = db.updateMissionProgress(pToken, 'game_finish', 1);
        let allEndCompleted = [...mFinish.completed];
        let latestMissions = mFinish.missions;
        if (won) {
          const mWin = db.updateMissionProgress(pToken, 'win_game', 1);
          allEndCompleted.push(...mWin.completed);
          latestMissions = mWin.missions;
        }
        const mScore = db.updateMissionProgress(pToken, 'total_score', p.score);
        allEndCompleted.push(...mScore.completed);
        latestMissions = mScore.missions;

        if (allEndCompleted.length > 0) {
          io.to(p.socketId).emit('mission-completed', { completed: allEndCompleted, missions: latestMissions });
        }
      }
    } else {
      triggerAIMoveIfNeeded(gameCode, game);
    }
  });

  socket.on('pass-turn', ({ gameCode, playerId }: any, cb) => {
    if (typeof gameCode !== 'string' || typeof playerId !== 'string') {
      return cb({ error: 'Invalid payload' });
    }
    const game = rooms.getGame(gameCode);
    if (!game) { cb({ error: 'Game not found' }); return; }
    const player = game.players.find((p) => p.id === playerId);
    if (!player || player.socketId !== socket.id) {
      return cb({ error: 'Not authorized' });
    }
    const result = game.passTurn(playerId);
    if (!result.valid) { cb({ error: result.error }); return; }
    console.log(`⏭️  ${tag(socket.id)} passed in ${gameCode}`);
    cb({ success: true });
    broadcastState(game);
    if (game.status === 'finished') {
      console.log(`🏁 Game ${gameCode} finished (passes). ${game.players.map(p => `${p.name}:${p.score}`).join(' vs ')}`);
      recordFinish(game);
      for (const p of game.players) {
        const pToken = game.playerTokens.get(p.id);
        if (!pToken) continue;
        const won = p.id === game.winnerId;
        db.addXp(pToken, xpForGameEnd(won));
        checkAndNotifyAchievements(game, p.name, p.socketId, undefined, true, won);

        // Mission progress
        const mFinish = db.updateMissionProgress(pToken, 'game_finish', 1);
        let allEndCompleted = [...mFinish.completed];
        let latestMissions = mFinish.missions;
        if (won) {
          const mWin = db.updateMissionProgress(pToken, 'win_game', 1);
          allEndCompleted.push(...mWin.completed);
          latestMissions = mWin.missions;
        }
        const mScore = db.updateMissionProgress(pToken, 'total_score', p.score);
        allEndCompleted.push(...mScore.completed);
        latestMissions = mScore.missions;

        if (allEndCompleted.length > 0) {
          io.to(p.socketId).emit('mission-completed', { completed: allEndCompleted, missions: latestMissions });
        }
      }
    } else {
      triggerAIMoveIfNeeded(gameCode, game);
    }
  });

  socket.on('exchange-tiles', ({ gameCode, playerId, tileIds }: any, cb) => {
    if (typeof gameCode !== 'string' || typeof playerId !== 'string') {
      return cb({ error: 'Invalid payload' });
    }
    const game = rooms.getGame(gameCode);
    if (!game) { cb({ error: 'Game not found' }); return; }
    const player = game.players.find((p) => p.id === playerId);
    if (!player || player.socketId !== socket.id) {
      return cb({ error: 'Not authorized' });
    }
    const result = game.exchangeTiles(playerId, tileIds);
    if (!result.valid) { cb({ error: result.error }); return; }
    console.log(`🔄 ${tag(socket.id)} exchanged ${tileIds.length} tiles in ${gameCode}`);
    cb({ success: true });
    broadcastState(game);
    triggerAIMoveIfNeeded(gameCode, game);
  });

  // ── Rematch ──

  socket.on('request-rematch', ({ gameCode, playerId }: { gameCode: string; playerId: string }, cb) => {
    console.log(`🔁 ${tag(socket.id)} requests rematch in ${gameCode}`);
    const status = rooms.requestRematch(gameCode, playerId);
    if (status === 'waiting') {
      cb({ status: 'waiting' });
      // Notify opponent
      const game = rooms.getGame(gameCode);
      if (game) {
        const other = game.players.find((p) => p.id !== playerId);
        if (other?.connected) {
          io.to(other.socketId).emit('rematch-requested', { by: playerId });
        }
      }
    } else {
      // Both want rematch → create new game
      const result = rooms.createRematch(gameCode);
      if (!result) { cb({ status: 'error' }); return; }
      cb({ status: 'accepted' });

      for (const a of result.playerAssignments) {
        const game = rooms.getGame(gameCode);
        const oldPlayer = game?.players.find((p) => p.id === a.oldPlayerId);
        if (oldPlayer) {
          // Update socket room
          const sock = io.sockets.sockets.get(oldPlayer.socketId);
          if (sock) sock.join(result.code);
          io.to(oldPlayer.socketId).emit('rematch-started', {
            code: result.code,
            playerId: a.newPlayerId,
          });
        }
      }

      // Broadcast new game state
      const newGame = rooms.getGame(result.code);
      if (newGame) broadcastState(newGame);
    }
  });

  // ── Stats & Leaderboard (from persistent DB) ──

  socket.on('get-player-stats', ({ playerName }: { playerName: string }, cb) => {
    cb({ stats: db.getPlayerStats(playerName) });
  });

  socket.on('get-game-history', ({ playerName }: { playerName: string }, cb) => {
    cb({ history: db.getPlayerHistory(playerName) });
  });

  socket.on('get-leaderboard', (_data: any, cb) => {
    cb({ leaderboard: db.getLeaderboard(), wallOfFame: db.getWallOfFame() });
  });

  // ── Account ──

  socket.on('check-name', ({ name }: { name: string }, cb) => {
    cb({ claimed: db.isNameClaimed(name) });
  });

  socket.on('claim-name', async ({ token, password }: { token: string; password: string }, cb) => {
    if (typeof token !== 'string' || typeof password !== 'string' || password.length < 3 || password.length > 200) {
      return cb({ success: false, error: 'Invalid input' });
    }
    const result = await db.claimName(token, password);
    if (result.success) console.log(`🔒 ${tag(socket.id)} claimed their name`);
    cb(result);
  });

  socket.on('login', async ({ name, password }: { name: string; password: string }, cb) => {
    if (typeof name !== 'string' || typeof password !== 'string' || !name.trim() || password.length > 200) {
      return cb({ success: false, error: 'Invalid input' });
    }
    const result = await db.loginWithPassword(name, password);
    if (result.success) {
      console.log(`🔑 ${name} logged in`);
      socketInfo.set(socket.id, { name, ip });
    }
    cb(result);
  });

  socket.on('get-profile', ({ token }: { token: string }, cb) => {
    const player = db.getPlayerByToken(token);
    const xp = player?.xp ?? 0;
    const achievements = player?.achievements ?? [];
    const unlockedThemes = player?.unlockedThemes ?? ['classic', 'neon'];
    const levelInfo = calculateLevel(xp);
    cb({ xp, achievements, unlockedThemes, level: levelInfo.level, title: levelInfo.title, nextLevelXp: levelInfo.nextLevelXp, progress: levelInfo.progress });
  });

  socket.on('get-game-replay', ({ gameId }: { gameId: string }, cb) => {
    const replay = db.getGameReplay(gameId);
    cb(replay ? { success: true, ...replay } : { success: false });
  });

  // ── H2H Record ──

  socket.on('get-h2h', ({ name1, name2 }: { name1: string; name2: string }, cb) => {
    cb(db.getH2HRecord(name1, name2));
  });

  // ── Daily Missions ──

  socket.on('get-daily-missions', ({ token }: { token: string }, cb) => {
    cb({ missions: db.getDailyMissions(token) });
  });

  socket.on('check-my-claim', ({ token, name }: { token: string; name?: string }, cb) => {
    // Ensure player exists in DB (handles DB reset)
    if (name && token) db.getOrCreatePlayer(token, name);
    cb({ claimed: db.isPlayerClaimed(token) });
  });

  // ── Emoji Reactions ──

  socket.on('send-reaction', ({ gameCode, playerId, emoji }: { gameCode: string; playerId: string; emoji: string }) => {
    if (typeof gameCode !== 'string' || typeof playerId !== 'string' || typeof emoji !== 'string') return;
    // Emoji payload: keep it short (1-2 glyphs). Prevents abuse via long strings.
    if (emoji.length === 0 || emoji.length > 16) return;
    const game = rooms.getGame(gameCode);
    if (!game) return;
    // Socket must own the claimed playerId
    const sender = game.players.find((p) => p.id === playerId);
    if (!sender || sender.socketId !== socket.id) return;
    if (!canSendReaction(playerId)) return;
    for (const p of game.players) {
      if (p.id !== playerId && p.connected) {
        io.to(p.socketId).emit('reaction', { playerId, emoji });
      }
    }
  });

  // ── Disconnect ──

  socket.on('disconnect', () => {
    console.log(`❌ ${tag(socket.id)} -1 (${Math.max(0, io.engine.clientsCount - 1)} online)`);
    // Delay broadcast so count reflects after disconnect
    setTimeout(() => io.emit('online-count', io.engine.clientsCount), 100);
    rooms.leaveMatchQueue(socket.id);
    const info = rooms.findGameBySocket(socket.id);
    if (info) {
      const player = info.game.players.find((p) => p.socketId === socket.id);
      if (player) { player.connected = false; broadcastState(info.game); }
    }
    socketInfo.delete(socket.id);
    rooms.cleanupFinished();
  });
});

const PORT = process.env.PORT || 3001;
server.listen(Number(PORT), '0.0.0.0', () => console.log(`Lettrix server on http://0.0.0.0:${PORT}`));
