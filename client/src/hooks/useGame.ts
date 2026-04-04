import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import socket from '../socket';
import { GameState, Tile } from '../types';
import type { MoveResultInfo } from '../components/ScoreCelebration';

function getToken(): string {
  let token = localStorage.getItem('lettrix-token');
  if (!token) {
    token = crypto.randomUUID?.() ?? Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('lettrix-token', token);
  }
  return token;
}

export function useGame() {
  const [connected, setConnected] = useState(false);
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [placedTiles, setPlacedTiles] = useState<Map<string, Tile>>(new Map());
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeSelection, setExchangeSelection] = useState<Set<string>>(new Set());
  const [blankTarget, setBlankTarget] = useState<{ row: number; col: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rackOrder, setRackOrder] = useState<string[]>([]);
  const [lastMoveResult, setLastMoveResult] = useState<MoveResultInfo | null>(null);
  const [rematchState, setRematchState] = useState<'none' | 'requested' | 'opponent-wants'>('none');
  const [searching, setSearching] = useState(false);

  const gameStateRef = useRef<GameState | null>(null);
  const playerIdRef = useRef<string | null>(null);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);

  useEffect(() => {
    socket.connect();
    const token = getToken();

    const onConnect = () => {
      setConnected(true);
      // Auto-rejoin by token (survives refresh)
      socket.emit('auto-rejoin', { token }, (res: any) => {
        if (res.success) {
          setGameCode(res.gameCode);
          setPlayerId(res.playerId);
          sessionStorage.setItem('gameCode', res.gameCode);
          sessionStorage.setItem('playerId', res.playerId);
        } else {
          // Fallback: try sessionStorage
          const savedCode = sessionStorage.getItem('gameCode');
          const savedId = sessionStorage.getItem('playerId');
          if (savedCode && savedId) {
            socket.emit('rejoin-game', { code: savedCode, playerId: savedId }, (r: any) => {
              if (r.success) { setGameCode(savedCode); setPlayerId(savedId); }
            });
          }
        }
      });
    };

    const onDisconnect = () => setConnected(false);

    const onState = (state: GameState) => {
      const prev = gameStateRef.current;
      const pid = playerIdRef.current;

      // Only clear placed tiles when a real change happened (not timer ticks)
      const moveCountChanged = !prev || state.moveHistory.length !== prev.moveHistory.length;
      const statusChanged = prev && state.status !== prev.status;
      const turnChanged = prev && state.currentPlayerId !== prev.currentPlayerId;
      const shouldReset = moveCountChanged || statusChanged || turnChanged;

      if (prev && state.moveHistory.length > prev.moveHistory.length) {
        const lastMove = state.moveHistory[state.moveHistory.length - 1];
        if (lastMove.type === 'play' && lastMove.score > 0) {
          const myName = state.players.find((p) => p.id === pid)?.name;
          setLastMoveResult({
            playerName: lastMove.playerName, score: lastMove.score,
            words: lastMove.words, isMe: lastMove.playerName === myName,
            isFullRack: lastMove.isFullRack,
          });
        }
      }

      setGameState(state);
      if (shouldReset) {
        setPlacedTiles(new Map());
        setSelectedTile(null);
        setBlankTarget(null);
      }
      setError(null);
      if (state.status === 'playing') setRematchState('none');
    };

    const onError = (msg: string) => setError(msg);

    const onRematchRequested = () => setRematchState('opponent-wants');

    const onRematchStarted = ({ code, playerId: newPid }: { code: string; playerId: string }) => {
      setGameCode(code);
      setPlayerId(newPid);
      setRematchState('none');
      setPlacedTiles(new Map());
      setError(null);
      sessionStorage.setItem('gameCode', code);
      sessionStorage.setItem('playerId', newPid);
    };

    const onMatchFound = ({ code, playerId: pid }: { code: string; playerId: string }) => {
      setSearching(false);
      setGameCode(code);
      setPlayerId(pid);
      sessionStorage.setItem('gameCode', code);
      sessionStorage.setItem('playerId', pid);
    };

    const onMatchmakingWaiting = () => {
      setSearching(true);
    };

    const onMatchmakingCancelled = () => {
      setSearching(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game-state', onState);
    socket.on('error', onError);
    socket.on('rematch-requested', onRematchRequested);
    socket.on('rematch-started', onRematchStarted);
    socket.on('match-found', onMatchFound);
    socket.on('matchmaking-waiting', onMatchmakingWaiting);
    socket.on('matchmaking-cancelled', onMatchmakingCancelled);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game-state', onState);
      socket.off('error', onError);
      socket.off('rematch-requested', onRematchRequested);
      socket.off('rematch-started', onRematchStarted);
      socket.off('match-found', onMatchFound);
      socket.off('matchmaking-waiting', onMatchmakingWaiting);
      socket.off('matchmaking-cancelled', onMatchmakingCancelled);
    };
  }, []);

  // Derived
  const myPlayer = gameState?.players.find((p) => p.id === playerId);
  const opponent = gameState?.players.find((p) => p.id !== playerId);
  const isMyTurn = gameState?.currentPlayerId === playerId;
  const placedTileIds = new Set(Array.from(placedTiles.values()).map((t) => t.id));

  // Sync rack order
  const myRackIds = (myPlayer?.rack ?? []).map((t) => t.id).join(',');
  useEffect(() => {
    const rack = myPlayer?.rack;
    if (!rack || rack.length === 0) return;
    const ids = new Set(rack.map((t) => t.id));
    setRackOrder((prev) => {
      const kept = prev.filter((id) => ids.has(id));
      const keptSet = new Set(kept);
      const added = rack.filter((t) => !keptSet.has(t.id)).map((t) => t.id);
      return [...kept, ...added];
    });
  }, [myRackIds]); // eslint-disable-line

  const rackTiles = useMemo(() => {
    const available = new Map(
      (myPlayer?.rack ?? []).filter((t) => !placedTileIds.has(t.id)).map((t) => [t.id, t]),
    );
    const ordered: Tile[] = [];
    for (const id of rackOrder) {
      const t = available.get(id);
      if (t) { ordered.push(t); available.delete(id); }
    }
    for (const t of available.values()) ordered.push(t);
    return ordered;
  }, [rackOrder, myRackIds, placedTileIds.size]); // eslint-disable-line

  // ── Actions ──

  const createGame = useCallback((playerName: string, language: string) => {
    const token = getToken();
    socket.emit('create-game', { playerName, language, token }, (res: any) => {
      if (res.error) { setError(res.error); return; }
      setGameCode(res.code); setPlayerId(res.playerId);
      sessionStorage.setItem('gameCode', res.code);
      sessionStorage.setItem('playerId', res.playerId);
    });
  }, []);

  const joinGame = useCallback((code: string, playerName: string) => {
    const token = getToken();
    socket.emit('join-game', { code: code.toUpperCase(), playerName, token }, (res: any) => {
      if (res.error) { setError(res.error); return; }
      setGameCode(code.toUpperCase()); setPlayerId(res.playerId);
      sessionStorage.setItem('gameCode', code.toUpperCase());
      sessionStorage.setItem('playerId', res.playerId);
    });
  }, []);

  const placeTile = useCallback((row: number, col: number) => {
    if (!selectedTile) return;
    if (gameState?.board[row][col]) return;
    if (placedTiles.has(`${row},${col}`)) return;
    if (selectedTile.isBlank) { setBlankTarget({ row, col }); return; }
    setPlacedTiles((prev) => new Map(prev).set(`${row},${col}`, selectedTile));
    setSelectedTile(null);
  }, [selectedTile, gameState, placedTiles]);

  const placeTileDirect = useCallback((row: number, col: number, tile: Tile) => {
    if (gameState?.board[row][col]) return;
    if (placedTiles.has(`${row},${col}`)) return;
    if (tile.isBlank) { setSelectedTile(tile); setBlankTarget({ row, col }); return; }
    setPlacedTiles((prev) => new Map(prev).set(`${row},${col}`, tile));
  }, [gameState, placedTiles]);

  const selectBlankLetter = useCallback((letter: string) => {
    if (!blankTarget || !selectedTile) return;
    setPlacedTiles((prev) => new Map(prev).set(`${blankTarget.row},${blankTarget.col}`, { ...selectedTile, letter: letter.toUpperCase() }));
    setSelectedTile(null); setBlankTarget(null);
  }, [blankTarget, selectedTile]);

  const cancelBlank = useCallback(() => {
    setSelectedTile(null);
    setBlankTarget(null);
  }, []);

  const removePlacedTile = useCallback((row: number, col: number) => {
    setPlacedTiles((prev) => { const n = new Map(prev); n.delete(`${row},${col}`); return n; });
  }, []);

  const recallTiles = useCallback(() => { setPlacedTiles(new Map()); setSelectedTile(null); setBlankTarget(null); }, []);

  const submitMove = useCallback(() => {
    if (!gameCode || !playerId || placedTiles.size === 0) return;
    const tiles = Array.from(placedTiles.entries()).map(([key, tile]) => {
      const [row, col] = key.split(',').map(Number);
      return { tileId: tile.id, row, col, letter: tile.letter };
    });
    socket.emit('play-move', { gameCode, playerId, tiles }, (res: any) => { if (res.error) setError(res.error); });
  }, [gameCode, playerId, placedTiles]);

  const passTurn = useCallback(() => {
    if (!gameCode || !playerId) return;
    socket.emit('pass-turn', { gameCode, playerId }, (res: any) => { if (res.error) setError(res.error); });
  }, [gameCode, playerId]);

  const toggleExchangeMode = useCallback(() => { setExchangeMode((p) => !p); setExchangeSelection(new Set()); setSelectedTile(null); setBlankTarget(null); setPlacedTiles(new Map()); setError(null); }, []);

  const toggleExchangeSelection = useCallback((tileId: string) => {
    setExchangeSelection((prev) => { const n = new Set(prev); if (n.has(tileId)) n.delete(tileId); else n.add(tileId); return n; });
  }, []);

  const submitExchange = useCallback(() => {
    if (!gameCode || !playerId || exchangeSelection.size === 0) return;
    socket.emit('exchange-tiles', { gameCode, playerId, tileIds: Array.from(exchangeSelection) }, (res: any) => {
      if (res.error) setError(res.error);
      else { setExchangeMode(false); setExchangeSelection(new Set()); }
    });
  }, [gameCode, playerId, exchangeSelection]);

  const reorderRack = useCallback((activeId: string, overId: string) => {
    setRackOrder((prev) => {
      const oi = prev.indexOf(activeId); const ni = prev.indexOf(overId);
      if (oi === -1 || ni === -1) return prev;
      return arrayMove(prev, oi, ni);
    });
  }, []);

  const shuffleRack = useCallback(() => {
    setRackOrder((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    });
  }, []);

  const requestRematch = useCallback(() => {
    if (!gameCode || !playerId) return;
    setRematchState('requested');
    socket.emit('request-rematch', { gameCode, playerId }, (res: any) => {
      if (res.status === 'error') setRematchState('none');
    });
  }, [gameCode, playerId]);

  const findMatch = useCallback((playerName: string, language: string) => {
    const token = getToken();
    if (!socket.connected) socket.connect();
    setSearching(true);
    socket.emit('find-match', { playerName, language, token });
  }, []);

  const cancelMatch = useCallback(() => {
    socket.emit('cancel-match');
    setSearching(false);
  }, []);

  // AI game
  const createAIGame = useCallback((playerName: string, language: string, difficulty: string) => {
    const token = getToken();
    socket.emit('create-ai-game', { playerName, language, difficulty, token }, (res: any) => {
      if (res.error) { setError(res.error); return; }
      setGameCode(res.code); setPlayerId(res.playerId);
      sessionStorage.setItem('gameCode', res.code);
      sessionStorage.setItem('playerId', res.playerId);
    });
  }, []);

  // Reactions
  const [incomingReaction, setIncomingReaction] = useState<string | null>(null);

  useEffect(() => {
    const onReaction = (data: { emoji: string }) => {
      setIncomingReaction(data.emoji);
    };
    socket.on('reaction', onReaction);
    return () => { socket.off('reaction', onReaction); };
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    if (!gameCode || !playerId) return;
    socket.emit('send-reaction', { gameCode, playerId, emoji });
  }, [gameCode, playerId]);

  const clearReaction = useCallback(() => setIncomingReaction(null), []);

  const leaveGame = useCallback(() => {
    sessionStorage.removeItem('gameCode'); sessionStorage.removeItem('playerId');
    setGameCode(null); setPlayerId(null); setGameState(null); setPlacedTiles(new Map());
    setError(null); setRackOrder([]); setRematchState('none');
  }, []);

  return {
    connected, gameCode, playerId, gameState, myPlayer, opponent, isMyTurn, rackTiles,
    selectedTile, placedTiles, exchangeMode, exchangeSelection, blankTarget, error, rackOrder,
    lastMoveResult, rematchState, searching, incomingReaction,
    createGame, joinGame, createAIGame, findMatch, cancelMatch, setSelectedTile, placeTile, placeTileDirect, selectBlankLetter, cancelBlank,
    removePlacedTile, recallTiles, submitMove, passTurn, toggleExchangeMode,
    toggleExchangeSelection, submitExchange, reorderRack, shuffleRack,
    requestRematch, leaveGame, sendReaction, clearReaction,
    clearError: () => setError(null),
    clearLastMove: useCallback(() => setLastMoveResult(null), []),
  };
}
