import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, useSensor, useSensors, PointerSensor, TouchSensor, closestCenter } from '@dnd-kit/core';
import { useLang } from '../contexts/LangContext';
import { GameState, Tile } from '../types';
import { previewScore } from '../scoring';
import { playTileClick, playTilePlace, playTileReturn, playYourTurn, playPass, playShuffle, playGameOver } from '../sounds';
import socket from '../socket';
import { useTheme } from '../contexts/ThemeContext';
import SettingsBar from './SettingsBar';
import TileComponent from './TileComponent';
import Board from './Board';
import Rack from './Rack';
import Controls from './Controls';
import ScoreBoard from './ScoreBoard';
import MoveHistory from './MoveHistory';
import BlankTileModal from './BlankTileModal';
import GameOver from './GameOver';
import ScoreCelebration, { MoveResultInfo } from './ScoreCelebration';
import ShareButtons from './ShareButtons';
import AchievementToast, { AchievementNotif } from './AchievementToast';
import HelpModal from './HelpModal';
import FirstTimeTutorial from './FirstTimeTutorial';
import ReactionBar from './ReactionBar';
import ReactionDisplay from './ReactionDisplay';

interface Props {
  gameState: GameState; gameCode: string; playerId: string; rackTiles: Tile[];
  selectedTile: Tile | null; placedTiles: Map<string, Tile>;
  exchangeMode: boolean; exchangeSelection: Set<string>;
  blankTarget: { row: number; col: number } | null; isMyTurn: boolean; error: string | null;
  onSetSelectedTile: (tile: Tile | null) => void;
  onPlaceTile: (r: number, c: number) => void;
  onPlaceTileDirect: (r: number, c: number, tile: Tile) => void;
  onRemovePlacedTile: (r: number, c: number) => void;
  onSelectBlankLetter: (l: string) => void;
  onCancelBlank: () => void;
  onRecall: () => void; onSubmitMove: () => void; onPass: () => void;
  onToggleExchange: () => void; onToggleExchangeSelection: (id: string) => void;
  onSubmitExchange: () => void; onLeave: () => void; onClearError: () => void;
  onReorderRack: (activeId: string, overId: string) => void;
  onShuffle: () => void;
  lastMoveResult: MoveResultInfo | null;
  onClearLastMove: () => void;
  rematchState: 'none' | 'requested' | 'opponent-wants';
  onRematch: () => void;
  onSendReaction?: (emoji: string) => void;
  incomingReaction?: string | null;
  onClearReaction?: () => void;
}

export default function Game(p: Props) {
  const { t } = useLang();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dragTileRef = useRef<Tile | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [achievementQueue, setAchievementQueue] = useState<AchievementNotif[]>([]);
  const [showTutorial] = useState(() => {
    if (localStorage.getItem('lettrix-tuto-done')) return false;
    return true;
  });
  const [tutorialDismissed, setTutorialDismissed] = useState(false);

  // Listen for achievement notifications
  const { setUnlockedThemes } = useTheme();
  useEffect(() => {
    const onAch = (data: { achievements: AchievementNotif[]; unlockedThemes?: string[] }) => {
      setAchievementQueue(data.achievements);
      if (data.unlockedThemes) setUnlockedThemes(new Set(data.unlockedThemes));
    };
    socket.on('achievements-unlocked', onAch);
    return () => { socket.off('achievements-unlocked', onAch); };
  }, []);

  const handleTutorialDone = () => {
    localStorage.setItem('lettrix-tuto-done', '1');
    setTutorialDismissed(true);
  };

  // Tab title
  useEffect(() => {
    const status = p.gameState.status === 'waiting' ? `⏳ ${p.gameCode}`
      : p.isMyTurn ? '🟢 ' + t('yourTurn')
      : '⏳ ' + t('opponentTurn');
    document.title = `Lettrix - ${status}`;
    return () => { document.title = 'Lettrix'; };
  }, [p.gameState.status, p.isMyTurn, p.gameCode, t]);

  // Sound on turn change
  useEffect(() => {
    if (p.isMyTurn && p.gameState.moveHistory.length > 0) playYourTurn();
  }, [p.isMyTurn]); // eslint-disable-line

  // Sound on game over
  useEffect(() => {
    if (p.gameState.status === 'finished') {
      const won = p.gameState.winnerId === p.playerId;
      playGameOver(won);
    }
  }, [p.gameState.status]); // eslint-disable-line

  // Auto-dismiss errors
  useEffect(() => {
    if (!p.error) return;
    const timer = setTimeout(() => p.onClearError(), 5000);
    return () => clearTimeout(timer);
  }, [p.error, p.onClearError]);

  // Keyboard shortcuts for game actions
  useEffect(() => {
    if (p.gameState.status !== 'playing') return;
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture if typing in an input or modal is open
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (p.blankTarget || showQuitConfirm || showHelp) return;

      if (e.key === 'Enter' && p.isMyTurn && p.placedTiles.size > 0 && !p.exchangeMode) {
        e.preventDefault();
        p.onSubmitMove();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (p.exchangeMode) p.onToggleExchange();
        else if (p.placedTiles.size > 0) p.onRecall();
        else if (p.selectedTile) p.onSetSelectedTile(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [p.gameState.status, p.isMyTurn, p.placedTiles.size, p.exchangeMode, p.blankTarget, p.selectedTile, showQuitConfirm, showHelp]); // eslint-disable-line

  // Score preview
  const preview = useMemo(
    () => previewScore(p.gameState.board, p.placedTiles, p.gameState.moveHistory),
    [p.gameState.board, p.placedTiles, p.gameState.moveHistory],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  const activeDragTile = dragTileRef.current;

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    const tile = p.rackTiles.find((t) => t.id === id) ?? null;
    setActiveDragId(id);
    dragTileRef.current = tile;
    playTileClick();
    p.onSetSelectedTile(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const tile = dragTileRef.current;
    setActiveDragId(null);
    dragTileRef.current = null;
    if (!over) return;
    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (overId.startsWith('cell-')) {
      const [, r, c] = overId.split('-');
      if (tile && p.isMyTurn && !p.exchangeMode) {
        playTilePlace();
        p.onPlaceTileDirect(parseInt(r), parseInt(c), tile);
      }
      return;
    }
    if (activeId !== overId && p.rackTiles.some((t) => t.id === overId)) {
      p.onReorderRack(activeId, overId);
    }
  }

  function handleDragCancel() {
    setActiveDragId(null);
    dragTileRef.current = null;
  }

  const copyCode = useCallback(() => {
    navigator.clipboard?.writeText(p.gameCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [p.gameCode]);

  const handleCellClick = (row: number, col: number) => {
    if (p.exchangeMode) return;
    const key = `${row},${col}`;
    if (p.placedTiles.has(key)) {
      playTileReturn();
      p.onRemovePlacedTile(row, col);
    } else if (!p.gameState.board[row][col] && p.selectedTile && p.isMyTurn) {
      playTilePlace();
      p.onPlaceTile(row, col);
    }
  };

  const handleRackClick = (tile: Tile) => {
    playTileClick();
    if (p.exchangeMode) p.onToggleExchangeSelection(tile.id);
    else p.onSetSelectedTile(p.selectedTile?.id === tile.id ? null : tile);
  };

  const handlePass = () => { playPass(); p.onPass(); };
  const handleShuffle = () => { playShuffle(); p.onShuffle(); };

  const toggles = <SettingsBar onHelp={() => setShowHelp(true)} />;

  // ── Waiting ──
  if (p.gameState.status === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="fixed top-4 right-4 z-50">{toggles}</div>
        <div className="glass-strong rounded-3xl p-10 max-w-md w-full text-center space-y-8 gradient-border animate-slide-up">
          <div className="animate-float">
            <h2 className="text-2xl font-bold gradient-text mb-2">{t('waitingOpponent')}</h2>
            <p className="text-gray-500 text-sm">{t('shareCode')}</p>
          </div>
          <button onClick={copyCode} className="w-full glass-strong rounded-2xl py-6 px-4 glow-amber transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
            <div className="text-5xl font-mono font-black tracking-[0.4em] gradient-text text-glow-amber">{p.gameCode}</div>
            <div className="text-xs text-gray-500 mt-2">{copied ? '✓ Copied!' : '↑ Tap to copy'}</div>
          </button>

          <ShareButtons
            text={`${t('shareInvite')} ${p.gameCode}`}
            url={typeof window !== 'undefined' ? window.location.origin : ''}
          />

          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-1.5">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
            <span className="text-gray-500 text-sm">{t('waitingP2')}</span>
          </div>
          <button onClick={p.onLeave} className="text-gray-600 hover:text-gray-300 text-sm transition-all duration-300">{t('cancel')}</button>
        </div>
      </div>
    );
  }

  // ── Game ──
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="min-h-screen flex flex-col lg:flex-row gap-4 p-3 sm:p-4 max-w-7xl mx-auto relative z-10">
        {/* Sidebar */}
        <div className="lg:w-80 flex flex-col gap-4 order-1">
          <div className="glass rounded-xl px-3 py-2 flex items-center justify-between gap-2">
            <button onClick={copyCode} className="text-xs text-gray-600 font-mono shrink-0 hover:text-amber-400 transition-colors" title="Copy code" aria-label={t('copyLink')}>
              {t('game')} <span className="text-amber-400/80 font-bold">{p.gameCode}</span>
              {copied && <span className="text-emerald-400 ml-1">✓</span>}
            </button>
            {toggles}
          </div>
          <div className={`glass rounded-xl px-4 py-2.5 text-center text-sm font-black transition-all duration-500
            ${p.isMyTurn ? 'glow-green text-emerald-400 animate-pulse-glow' : 'text-gray-500'}`}
            role="status" aria-live="polite" aria-atomic="true">
            {p.isMyTurn ? t('yourTurn') : t('opponentTurn')}
          </div>
          <ScoreBoard players={p.gameState.players} currentPlayerId={p.gameState.currentPlayerId} myPlayerId={p.playerId} tilesRemaining={p.gameState.tilesRemaining} />
          <div className="hidden lg:block"><MoveHistory history={p.gameState.moveHistory} /></div>

          {/* Quit button */}
          <button
            onClick={() => setShowQuitConfirm(true)}
            className="glass rounded-xl px-4 py-2 text-xs text-gray-500 hover:text-red-400
              hover:border-red-500/20 transition-all duration-300 text-center"
          >
            {t('quitGame')}
          </button>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col items-center gap-4 order-2">
          {p.error && (
            <div onClick={p.onClearError} role="alert" aria-live="assertive" className="w-full max-w-[600px] glass rounded-xl px-4 py-3 border border-red-500/30 text-red-300 text-sm cursor-pointer glow-red animate-slide-up">
              {p.error} <span className="text-red-500/50 text-xs ml-2">{t('clickDismiss')}</span>
            </div>
          )}
          <Board board={p.gameState.board} placedTiles={p.placedTiles} lastMove={p.gameState.lastMove} isDragging={!!activeDragId} ghostTile={p.isMyTurn && !p.exchangeMode ? p.selectedTile : null} onCellClick={handleCellClick} />
          <Rack tiles={p.rackTiles} selectedTile={p.selectedTile} exchangeMode={p.exchangeMode} exchangeSelection={p.exchangeSelection} onTileClick={handleRackClick} />
          <Controls isMyTurn={p.isMyTurn} hasPlacedTiles={p.placedTiles.size > 0} exchangeMode={p.exchangeMode} hasExchangeSelection={p.exchangeSelection.size > 0} canExchange={p.gameState.tilesRemaining >= 1} previewScore={preview?.score ?? null} previewWords={preview?.words ?? []} turnElapsed={p.gameState.turnElapsed ?? 0} gameActive={p.gameState.status === 'playing'} onSubmitMove={p.onSubmitMove} onRecall={p.onRecall} onPass={handlePass} onToggleExchange={p.onToggleExchange} onSubmitExchange={p.onSubmitExchange} onShuffle={handleShuffle} />
          {p.onSendReaction && <div className="flex justify-center"><ReactionBar onReact={p.onSendReaction} /></div>}
          <div className="lg:hidden w-full max-w-[600px]"><MoveHistory history={p.gameState.moveHistory} /></div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragTile && <div className="glow-amber" style={{ opacity: 0.9 }}><TileComponent tile={activeDragTile} /></div>}
        </DragOverlay>
      </div>

      {/* Quit confirmation */}
      {showQuitConfirm && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="glass-strong rounded-2xl p-8 max-w-sm w-full text-center space-y-5 gradient-border animate-slide-up">
            <div className="text-4xl">🚪</div>
            <h3 className="text-xl font-bold text-white">{t('quitConfirmTitle')}</h3>
            <p className="text-gray-400 text-sm">{t('quitConfirmText')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-3 glass rounded-xl font-bold text-sm text-gray-300
                  hover:bg-white/5 transition-all active:scale-[0.97]"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => { setShowQuitConfirm(false); p.onLeave(); }}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all
                  bg-gradient-to-r from-red-600 to-red-700 text-white
                  hover:from-red-500 hover:to-red-600 active:scale-[0.97]"
              >
                {t('quitGame')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {p.blankTarget && <BlankTileModal onSelect={p.onSelectBlankLetter} onCancel={p.onCancelBlank} />}
      {p.gameState.status === 'finished' && <GameOver players={p.gameState.players} winnerId={p.gameState.winnerId} myPlayerId={p.playerId} moveHistory={p.gameState.moveHistory} board={p.gameState.board} rematchState={p.rematchState} onRematch={p.onRematch} onLeave={p.onLeave} />}
      {p.lastMoveResult && <ScoreCelebration result={p.lastMoveResult} onDone={p.onClearLastMove} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showTutorial && !tutorialDismissed && p.gameState.status === 'playing' && <FirstTimeTutorial onDone={handleTutorialDone} />}
      {achievementQueue.length > 0 && <AchievementToast achievements={achievementQueue} onDone={() => setAchievementQueue([])} />}
      {p.incomingReaction && p.onClearReaction && <ReactionDisplay emoji={p.incomingReaction} onDone={p.onClearReaction} />}
    </DndContext>
  );
}
