import { useEffect, useRef, useState, useCallback } from 'react';
import { ClientPlayer, MoveHistoryEntry } from '../types';
import { BONUS_GRID } from '../constants';
import { useLang } from '../contexts/LangContext';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { encodeGif, type GifFrame } from '../utils/gifEncoder';

interface Props {
  players: ClientPlayer[];
  moveHistory: MoveHistoryEntry[];
  winnerId: string | null;
  board: ({ letter: string; value: number; isBlank: boolean } | null)[][];
  onClose: () => void;
}

// ── Canvas constants ──
const W = 540;
const BOARD_SIZE = 15;
const HEADER_H = 62;
const FOOTER_H = 56;
const CELL = 30;
const BOARD_PX = CELL * BOARD_SIZE; // 450
const BOARD_X = (W - BOARD_PX) / 2; // 45
const BOARD_Y = HEADER_H;
const H = HEADER_H + BOARD_PX + FOOTER_H; // 568

// ── Theme palettes ──
interface ThemePalette {
  bg1: string; bg2: string; bg3: string;
  boardBg: string; boardLine: string;
  cellEmpty: string;
  tileBg1: string; tileBg2: string; tileBg3: string;
  tileNew1: string; tileNew2: string; tileNew3: string;
  tileText: string; tileVal: string;
  accent: string; accentGlow: string;
  p1Color: string; p2Color: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  bonusTW: string; bonusDW: string; bonusTL: string; bonusDL: string;
  bonusTextTW: string; bonusTextDW: string; bonusTextTL: string; bonusTextDL: string;
}

const PALETTES: Record<Theme, ThemePalette> = {
  neon: {
    bg1: '#0a0a1a', bg2: '#0d1033', bg3: '#1a0a2e',
    boardBg: '#0a1a0a', boardLine: 'rgba(255,255,255,0.06)',
    cellEmpty: 'rgba(6,78,59,0.2)',
    tileBg1: '#fde68a', tileBg2: '#fbbf24', tileBg3: '#d97706',
    tileNew1: '#d9f99d', tileNew2: '#a3e635', tileNew3: '#65a30d',
    tileText: '#1c1917', tileVal: '#57534e',
    accent: '#fbbf24', accentGlow: 'rgba(251,191,36,0.4)',
    p1Color: '#fbbf24', p2Color: '#60a5fa',
    textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.6)', textMuted: 'rgba(255,255,255,0.3)',
    bonusTW: '#991b1b', bonusDW: '#86198f', bonusTL: '#1e40af', bonusDL: '#0e7490',
    bonusTextTW: '#fecaca', bonusTextDW: '#f5d0fe', bonusTextTL: '#bfdbfe', bonusTextDL: '#cffafe',
  },
  classic: {
    bg1: '#3e2723', bg2: '#2c1a12', bg3: '#1a0f09',
    boardBg: '#2d5016', boardLine: 'rgba(0,0,0,0.2)',
    cellEmpty: '#1b5e20',
    tileBg1: '#fff8e1', tileBg2: '#ffe0b2', tileBg3: '#d7ccc8',
    tileNew1: '#c8e6c9', tileNew2: '#81c784', tileNew3: '#4caf50',
    tileText: '#3e2723', tileVal: '#795548',
    accent: '#8B6914', accentGlow: 'rgba(139,105,20,0.4)',
    p1Color: '#ffb300', p2Color: '#42a5f5',
    textPrimary: '#fff8e1', textSecondary: 'rgba(255,248,225,0.7)', textMuted: 'rgba(255,248,225,0.4)',
    bonusTW: '#b71c1c', bonusDW: '#e65100', bonusTL: '#0d47a1', bonusDL: '#006064',
    bonusTextTW: '#ffffff', bonusTextDW: '#fff3e0', bonusTextTL: '#ffffff', bonusTextDL: '#e0f7fa',
  },
  ocean: {
    bg1: '#0a192f', bg2: '#0d253f', bg3: '#112240',
    boardBg: '#0a2a3f', boardLine: 'rgba(6,182,212,0.1)',
    cellEmpty: 'rgba(6,182,212,0.08)',
    tileBg1: '#e0f2fe', tileBg2: '#7dd3fc', tileBg3: '#0ea5e9',
    tileNew1: '#d9f99d', tileNew2: '#a3e635', tileNew3: '#65a30d',
    tileText: '#0c4a6e', tileVal: '#0369a1',
    accent: '#06b6d4', accentGlow: 'rgba(6,182,212,0.4)',
    p1Color: '#22d3ee', p2Color: '#a78bfa',
    textPrimary: '#e0f2fe', textSecondary: 'rgba(224,242,254,0.7)', textMuted: 'rgba(224,242,254,0.3)',
    bonusTW: '#991b1b', bonusDW: '#7e22ce', bonusTL: '#1e40af', bonusDL: '#0e7490',
    bonusTextTW: '#fecaca', bonusTextDW: '#e9d5ff', bonusTextTL: '#bfdbfe', bonusTextDL: '#cffafe',
  },
  sakura: {
    bg1: '#1a0a1e', bg2: '#2d1033', bg3: '#1a0520',
    boardBg: '#1a0a1a', boardLine: 'rgba(244,114,182,0.1)',
    cellEmpty: 'rgba(244,114,182,0.06)',
    tileBg1: '#fce7f3', tileBg2: '#f9a8d4', tileBg3: '#ec4899',
    tileNew1: '#d9f99d', tileNew2: '#a3e635', tileNew3: '#65a30d',
    tileText: '#831843', tileVal: '#9d174d',
    accent: '#f472b6', accentGlow: 'rgba(244,114,182,0.4)',
    p1Color: '#f472b6', p2Color: '#a78bfa',
    textPrimary: '#fce7f3', textSecondary: 'rgba(252,231,243,0.7)', textMuted: 'rgba(252,231,243,0.3)',
    bonusTW: '#991b1b', bonusDW: '#86198f', bonusTL: '#1e40af', bonusDL: '#0e7490',
    bonusTextTW: '#fecaca', bonusTextDW: '#f5d0fe', bonusTextTL: '#bfdbfe', bonusTextDL: '#cffafe',
  },
  hacker: {
    bg1: '#0a0a0a', bg2: '#0d1a0d', bg3: '#001a00',
    boardBg: '#001100', boardLine: 'rgba(34,197,94,0.1)',
    cellEmpty: 'rgba(34,197,94,0.06)',
    tileBg1: '#dcfce7', tileBg2: '#86efac', tileBg3: '#22c55e',
    tileNew1: '#fef08a', tileNew2: '#facc15', tileNew3: '#ca8a04',
    tileText: '#052e16', tileVal: '#166534',
    accent: '#22c55e', accentGlow: 'rgba(34,197,94,0.4)',
    p1Color: '#4ade80', p2Color: '#a78bfa',
    textPrimary: '#dcfce7', textSecondary: 'rgba(220,252,231,0.7)', textMuted: 'rgba(220,252,231,0.3)',
    bonusTW: '#991b1b', bonusDW: '#86198f', bonusTL: '#1e40af', bonusDL: '#0e7490',
    bonusTextTW: '#fecaca', bonusTextDW: '#f5d0fe', bonusTextTL: '#bfdbfe', bonusTextDL: '#cffafe',
  },
  gold: {
    bg1: '#1a1000', bg2: '#221800', bg3: '#2a1a00',
    boardBg: '#1a1200', boardLine: 'rgba(255,200,50,0.08)',
    cellEmpty: 'rgba(255,200,50,0.04)',
    tileBg1: '#fffcf0', tileBg2: '#fff4c8', tileBg3: '#f8d878',
    tileNew1: '#d9f99d', tileNew2: '#a3e635', tileNew3: '#65a30d',
    tileText: '#3a2800', tileVal: '#6b5a2e',
    accent: '#ffd700', accentGlow: 'rgba(255,215,0,0.4)',
    p1Color: '#ffd700', p2Color: '#c0c0c0',
    textPrimary: '#fffcf0', textSecondary: 'rgba(255,252,240,0.7)', textMuted: 'rgba(255,252,240,0.3)',
    bonusTW: '#991b1b', bonusDW: '#9a3412', bonusTL: '#1e40af', bonusDL: '#0369a1',
    bonusTextTW: '#fecaca', bonusTextDW: '#fed7aa', bonusTextTL: '#bfdbfe', bonusTextDL: '#cffafe',
  },
  midnight: {
    bg1: '#0f0a2e', bg2: '#1a1145', bg3: '#0d0825',
    boardBg: '#100a28', boardLine: 'rgba(99,102,241,0.1)',
    cellEmpty: 'rgba(99,102,241,0.06)',
    tileBg1: '#e0e7ff', tileBg2: '#c7d2fe', tileBg3: '#a5b4fc',
    tileNew1: '#d9f99d', tileNew2: '#a3e635', tileNew3: '#65a30d',
    tileText: '#1e1b4b', tileVal: '#3730a3',
    accent: '#818cf8', accentGlow: 'rgba(129,140,248,0.4)',
    p1Color: '#818cf8', p2Color: '#f472b6',
    textPrimary: '#e0e7ff', textSecondary: 'rgba(224,231,255,0.7)', textMuted: 'rgba(224,231,255,0.3)',
    bonusTW: '#991b1b', bonusDW: '#6d28d9', bonusTL: '#1e40af', bonusDL: '#0e7490',
    bonusTextTW: '#fecaca', bonusTextDW: '#ddd6fe', bonusTextTL: '#bfdbfe', bonusTextDL: '#cffafe',
  },
  retro: {
    bg1: '#1a0800', bg2: '#2d1400', bg3: '#0f0600',
    boardBg: '#1a0a00', boardLine: 'rgba(249,115,22,0.1)',
    cellEmpty: 'rgba(249,115,22,0.04)',
    tileBg1: '#fff7ed', tileBg2: '#fed7aa', tileBg3: '#fdba74',
    tileNew1: '#fef08a', tileNew2: '#facc15', tileNew3: '#ca8a04',
    tileText: '#431407', tileVal: '#9a3412',
    accent: '#f97316', accentGlow: 'rgba(249,115,22,0.4)',
    p1Color: '#fb923c', p2Color: '#facc15',
    textPrimary: '#fff7ed', textSecondary: 'rgba(255,247,237,0.7)', textMuted: 'rgba(255,247,237,0.3)',
    bonusTW: '#991b1b', bonusDW: '#9a3412', bonusTL: '#1e40af', bonusDL: '#0369a1',
    bonusTextTW: '#fecaca', bonusTextDW: '#fed7aa', bonusTextTL: '#bfdbfe', bonusTextDL: '#cffafe',
  },
  aurora: {
    bg1: '#021a1a', bg2: '#042f2e', bg3: '#1a0a2e',
    boardBg: '#031a1a', boardLine: 'rgba(20,184,166,0.1)',
    cellEmpty: 'rgba(20,184,166,0.04)',
    tileBg1: '#ccfbf1', tileBg2: '#99f6e4', tileBg3: '#5eead4',
    tileNew1: '#d9f99d', tileNew2: '#a3e635', tileNew3: '#65a30d',
    tileText: '#042f2e', tileVal: '#0d9488',
    accent: '#14b8a6', accentGlow: 'rgba(20,184,166,0.4)',
    p1Color: '#2dd4bf', p2Color: '#a78bfa',
    textPrimary: '#ccfbf1', textSecondary: 'rgba(204,251,241,0.7)', textMuted: 'rgba(204,251,241,0.3)',
    bonusTW: '#991b1b', bonusDW: '#7e22ce', bonusTL: '#1e40af', bonusDL: '#0e7490',
    bonusTextTW: '#fecaca', bonusTextDW: '#e9d5ff', bonusTextTL: '#bfdbfe', bonusTextDL: '#cffafe',
  },
};

const BONUS_LABELS: Record<string, string> = { TW: 'M×3', DW: 'M×2', TL: 'L×3', DL: 'L×2' };
const RAINBOW = ['#ff0000','#ff4400','#ff8800','#ffbb00','#ffee00','#88ff00','#00ff88','#00ffee','#00aaff','#4444ff','#8800ff','#ff00ff'];

type BoardState = ({ letter: string; value: number; isBlank: boolean } | null)[][];

function emptyBoard(): BoardState {
  return Array.from({ length: 15 }, () => Array(15).fill(null));
}

function buildSnapshots(playMoves: MoveHistoryEntry[]) {
  const snapshots: { board: BoardState; newCells: Set<string> }[] = [];
  const board = emptyBoard();
  for (const move of playMoves) {
    const newCells = new Set<string>();
    if (move.placements) {
      for (const p of move.placements) {
        board[p.row][p.col] = { letter: p.letter, value: p.value, isBlank: p.isBlank };
        newCells.add(`${p.row},${p.col}`);
      }
    }
    snapshots.push({ board: board.map(r => r.map(c => c ? { ...c } : null)), newCells });
  }
  return snapshots;
}

function buildSnapshotsFromFinalBoard(finalBoard: Props['board'], playMoves: MoveHistoryEntry[]) {
  const snapshots: { board: BoardState; newCells: Set<string> }[] = [];
  const allCells: { row: number; col: number }[] = [];
  for (let r = 0; r < 15; r++)
    for (let c = 0; c < 15; c++)
      if (finalBoard[r][c]) allCells.push({ row: r, col: c });
  const perMove = Math.max(1, Math.ceil(allCells.length / Math.max(playMoves.length, 1)));
  const board = emptyBoard();
  let idx = 0;
  for (let i = 0; i < playMoves.length; i++) {
    const newCells = new Set<string>();
    const end = Math.min(idx + perMove, allCells.length);
    for (let j = idx; j < end; j++) {
      const { row, col } = allCells[j];
      const t = finalBoard[row][col]!;
      board[row][col] = { letter: t.letter, value: t.value, isBlank: t.isBlank };
      newCells.add(`${row},${col}`);
    }
    idx = end;
    snapshots.push({ board: board.map(r => r.map(c => c ? { ...c } : null)), newCells });
  }
  return snapshots;
}

// ── Drawing ──

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();
}

function drawBackground(ctx: CanvasRenderingContext2D, p: ThemePalette) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, p.bg1); grad.addColorStop(0.5, p.bg2); grad.addColorStop(1, p.bg3);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
}

function drawBoardGrid(ctx: CanvasRenderingContext2D, p: ThemePalette) {
  // Board background
  ctx.fillStyle = p.boardBg;
  ctx.fillRect(BOARD_X - 2, BOARD_Y - 2, BOARD_PX + 4, BOARD_PX + 4);

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const x = BOARD_X + c * CELL;
      const y = BOARD_Y + r * CELL;
      const bonus = BONUS_GRID[r][c];
      const isCenter = r === 7 && c === 7;

      if (bonus) {
        const bonusKey = `bonus${bonus}` as keyof ThemePalette;
        const textKey = `bonusText${bonus}` as keyof ThemePalette;
        ctx.fillStyle = p[bonusKey] as string;
        ctx.fillRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        ctx.fillStyle = p[textKey] as string;
        ctx.font = `bold ${CELL * 0.3}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(BONUS_LABELS[bonus] ?? '', x + CELL / 2, y + CELL / 2);
      } else if (isCenter) {
        ctx.fillStyle = p.accentGlow;
        ctx.fillRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        ctx.fillStyle = p.accent;
        ctx.font = `${CELL * 0.6}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('★', x + CELL / 2, y + CELL / 2);
      } else {
        ctx.fillStyle = p.cellEmpty;
        ctx.fillRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
    }
  }
  ctx.strokeStyle = p.boardLine; ctx.lineWidth = 0.5;
  for (let i = 0; i <= BOARD_SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(BOARD_X + i * CELL, BOARD_Y); ctx.lineTo(BOARD_X + i * CELL, BOARD_Y + BOARD_PX); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(BOARD_X, BOARD_Y + i * CELL); ctx.lineTo(BOARD_X + BOARD_PX, BOARD_Y + i * CELL); ctx.stroke();
  }
}

function drawTile(ctx: CanvasRenderingContext2D, p: ThemePalette, x: number, y: number, letter: string, value: number, isBlank: boolean, isNew: boolean) {
  const pad = 1;
  const tx = x + pad, ty = y + pad, tw = CELL - pad * 2, th = CELL - pad * 2;
  const c1 = isNew ? p.tileNew1 : p.tileBg1;
  const c2 = isNew ? p.tileNew2 : p.tileBg2;
  const c3 = isNew ? p.tileNew3 : p.tileBg3;
  const g = ctx.createLinearGradient(tx, ty, tx + tw, ty + th);
  g.addColorStop(0, c1); g.addColorStop(0.5, c2); g.addColorStop(1, c3);
  ctx.fillStyle = g;
  roundRect(ctx, tx, ty, tw, th, 3);
  if (isNew) { ctx.shadowColor = p.tileNew2; ctx.shadowBlur = 8; roundRect(ctx, tx, ty, tw, th, 3); ctx.shadowBlur = 0; }
  ctx.fillStyle = p.tileText;
  ctx.font = `bold ${CELL * 0.55}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(letter, x + CELL / 2, y + CELL / 2 + 1);
  if (!isBlank && value > 0) {
    ctx.font = `bold ${CELL * 0.25}px system-ui, sans-serif`;
    ctx.fillStyle = p.tileVal; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(String(value), x + CELL - 3, y + CELL - 2);
  }
  if (isBlank) {
    ctx.font = `bold ${CELL * 0.25}px system-ui, sans-serif`;
    ctx.fillStyle = p.accent; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('*', x + 2, y + 1);
  }
}

function drawHeader(ctx: CanvasRenderingContext2D, p: ThemePalette, p1Name: string, p2Name: string, s1: number, s2: number) {
  // Title
  ctx.fillStyle = p.accent;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('LETTRIX', W / 2, 6);
  // P1
  ctx.fillStyle = p.p1Color + '20'; roundRect(ctx, 10, 34, 200, 24, 8);
  ctx.fillStyle = p.p1Color; ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(p1Name, 18, 46);
  ctx.textAlign = 'right'; ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillText(String(s1), 204, 46);
  // P2
  ctx.fillStyle = p.p2Color + '20'; roundRect(ctx, W - 210, 34, 200, 24, 8);
  ctx.fillStyle = p.p2Color; ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(p2Name, W - 18, 46);
  ctx.textAlign = 'left'; ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillText(String(s2), W - 204, 46);
}

function getTier(score: number, isFullRack: boolean) {
  if (isFullRack) return 'fullrack';
  if (score >= 70) return 'legendary';
  if (score >= 50) return 'incredible';
  if (score >= 35) return 'excellent';
  if (score >= 20) return 'great';
  return 'basic';
}

function drawMoveInfo(ctx: CanvasRenderingContext2D, p: ThemePalette, move: MoveHistoryEntry, isP1: boolean, moveNum: number, totalMoves: number, effectPhase: number) {
  const y = BOARD_Y + BOARD_PX + 6;
  const tier = getTier(move.score, !!move.isFullRack);

  // Player name
  ctx.fillStyle = isP1 ? p.p1Color : p.p2Color;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(move.playerName, 12, y + 4);

  // Words
  const wordsText = move.words.join(' + ').toUpperCase();
  ctx.fillStyle = p.textPrimary;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(wordsText, W / 2, y + 4);

  // Score with tier-based styling
  const scoreColor = tier === 'fullrack' ? '#ff6600' : tier === 'legendary' ? '#fbbf24' : tier === 'incredible' ? '#fbbf24' : tier === 'excellent' ? '#34d399' : tier === 'great' ? '#60a5fa' : '#a3e635';
  ctx.fillStyle = scoreColor;
  ctx.font = `bold ${tier === 'fullrack' || tier === 'legendary' ? 20 : 16}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(`+${move.score}`, W - 12, y + 4);

  // Tier label for big moves
  if (tier !== 'basic' && tier !== 'great') {
    const labels: Record<string, string> = { fullrack: '🔥 LETTRIX!', legendary: '🔥 LEGENDAIRE', incredible: '⚡ INCROYABLE', excellent: '✨ EXCELLENT' };
    ctx.fillStyle = scoreColor;
    ctx.font = `bold ${tier === 'fullrack' ? 14 : 11}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(labels[tier] ?? '', W / 2, y + 24);
  }

  // Progress bar
  ctx.fillStyle = p.textMuted; roundRect(ctx, 12, y + 42, W - 24, 4, 2);
  ctx.fillStyle = p.accent + '88'; roundRect(ctx, 12, y + 42, ((moveNum + 1) / totalMoves) * (W - 24), 4, 2);

  // ── Wow effects (particles, flash) ──
  if (effectPhase > 0 && effectPhase < 1 && (tier === 'incredible' || tier === 'legendary' || tier === 'fullrack')) {
    // Screen flash
    const flashAlpha = Math.max(0, (1 - effectPhase) * (tier === 'fullrack' ? 0.3 : 0.15));
    const grad = ctx.createRadialGradient(W / 2, BOARD_Y + BOARD_PX / 2, 0, W / 2, BOARD_Y + BOARD_PX / 2, W * 0.6);
    grad.addColorStop(0, tier === 'fullrack' ? `rgba(255,100,0,${flashAlpha})` : `rgba(251,191,36,${flashAlpha})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    // Particle burst from score
    const count = tier === 'fullrack' ? 20 : 12;
    const colors = tier === 'fullrack' ? RAINBOW : ['#fbbf24','#34d399','#60a5fa','#f472b6','#a78bfa'];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = effectPhase * (100 + Math.sin(i * 7) * 50);
      const alpha = Math.max(0, 1 - effectPhase);
      const px = W / 2 + Math.cos(angle) * dist;
      const py = BOARD_Y + BOARD_PX / 2 + Math.sin(angle) * dist;
      const size = 3 + Math.random() * 3;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Rainbow border for full rack
  if (tier === 'fullrack' && effectPhase > 0 && effectPhase < 1) {
    const idx = Math.floor(effectPhase * RAINBOW.length * 3) % RAINBOW.length;
    ctx.strokeStyle = RAINBOW[idx]; ctx.lineWidth = 3;
    ctx.strokeRect(BOARD_X - 3, BOARD_Y - 3, BOARD_PX + 6, BOARD_PX + 6);
    ctx.lineWidth = 1;
  }
}

function drawOutro(ctx: CanvasRenderingContext2D, p: ThemePalette, winnerId: string | null, players: ClientPlayer[], alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, W, H);
  const winner = players.find(pl => pl.id === winnerId);
  const isTie = !winnerId;
  const sorted = [...players].sort((a, b) => b.score - a.score);

  // Trophy
  ctx.font = '48px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = p.textPrimary;
  ctx.fillText(isTie ? '🤝' : '🏆', W / 2, H / 2 - 70);

  // Result
  ctx.fillStyle = p.accent; ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(isTie ? 'Egalite !' : `${winner?.name} gagne !`, W / 2, H / 2 - 20);

  // Score boxes
  const boxW = 120, boxH = 50, gap = 30;
  // P1 box
  ctx.fillStyle = p.p1Color + '15'; roundRect(ctx, W / 2 - boxW - gap / 2, H / 2 + 10, boxW, boxH, 10);
  ctx.fillStyle = p.p1Color; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.fillText(sorted[0]?.name ?? '', W / 2 - gap / 2 - boxW / 2, H / 2 + 24);
  ctx.font = 'bold 24px system-ui, sans-serif'; ctx.fillText(String(sorted[0]?.score ?? 0), W / 2 - gap / 2 - boxW / 2, H / 2 + 48);
  // P2 box
  ctx.fillStyle = p.p2Color + '15'; roundRect(ctx, W / 2 + gap / 2, H / 2 + 10, boxW, boxH, 10);
  ctx.fillStyle = p.p2Color; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.fillText(sorted[1]?.name ?? '', W / 2 + gap / 2 + boxW / 2, H / 2 + 24);
  ctx.font = 'bold 24px system-ui, sans-serif'; ctx.fillText(String(sorted[1]?.score ?? 0), W / 2 + gap / 2 + boxW / 2, H / 2 + 48);

  // VS
  ctx.fillStyle = p.textMuted; ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('vs', W / 2, H / 2 + 35);

  // URL watermark
  ctx.fillStyle = p.textMuted; ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(typeof window !== 'undefined' ? window.location.host : 'lettrix', W / 2, H / 2 + 85);

  ctx.globalAlpha = 1;
}

function drawFrame(
  ctx: CanvasRenderingContext2D, pal: ThemePalette,
  snapshots: { board: BoardState; newCells: Set<string> }[],
  playMoves: MoveHistoryEntry[], players: ClientPlayer[],
  winnerId: string | null, moveIndex: number, effectPhase: number, outroAlpha: number,
) {
  const p1 = players[0], p2 = players[1];
  let s1 = 0, s2 = 0;
  for (let i = 0; i <= Math.min(moveIndex, playMoves.length - 1); i++) {
    const m = playMoves[i];
    if (m.playerName === p1?.name) s1 += m.score; else s2 += m.score;
  }
  drawBackground(ctx, pal);
  drawHeader(ctx, pal, p1?.name ?? '?', p2?.name ?? '?', s1, s2);
  drawBoardGrid(ctx, pal);
  if (moveIndex >= 0 && snapshots.length > 0) {
    const si = Math.min(moveIndex, snapshots.length - 1);
    const snap = snapshots[si];
    for (let r = 0; r < 15; r++)
      for (let c = 0; c < 15; c++) {
        const tile = snap.board[r][c];
        if (!tile) continue;
        drawTile(ctx, pal, BOARD_X + c * CELL, BOARD_Y + r * CELL, tile.letter, tile.value, tile.isBlank, snap.newCells.has(`${r},${c}`) && moveIndex === si);
      }
  }
  if (moveIndex >= 0 && moveIndex < playMoves.length)
    drawMoveInfo(ctx, pal, playMoves[moveIndex], playMoves[moveIndex].playerName === p1?.name, moveIndex, playMoves.length, effectPhase);
  if (outroAlpha > 0) drawOutro(ctx, pal, winnerId, players, outroAlpha);
}

// ═══════════════════════════════════
//  Component
// ═══════════════════════════════════

export default function GameReplayModal({ players, moveHistory, winnerId, board, onClose }: Props) {
  const { t } = useLang();
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentMove, setCurrentMove] = useState(-1);
  const [effectPhase, setEffectPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  const pal = PALETTES[theme] ?? PALETTES.neon;
  const playMoves = moveHistory.filter(m => m.type === 'play');
  const hasPlacementData = playMoves.some(m => m.placements && m.placements.length > 0);
  const snapshots = useRef(hasPlacementData ? buildSnapshots(playMoves) : buildSnapshotsFromFinalBoard(board, playMoves)).current;
  const winner = players.find(p => p.id === winnerId);

  // Animation loop
  useEffect(() => {
    if (!playing) return;
    const move = playMoves[currentMove];
    const tier = move ? getTier(move.score, !!move.isFullRack) : 'basic';
    const hasBigEffect = tier === 'incredible' || tier === 'legendary' || tier === 'fullrack';
    const moveDelay = currentMove === -1 ? 1200 : hasBigEffect ? 2800 : 1800;

    const timer = setTimeout(() => {
      if (currentMove < playMoves.length) {
        setCurrentMove(m => m + 1);
        setEffectPhase(0);
      } else {
        setTimeout(() => { setCurrentMove(-1); setEffectPhase(0); }, 3500);
      }
    }, moveDelay);
    return () => clearTimeout(timer);
  }, [currentMove, playing, playMoves]);

  // Effect animation for big moves
  useEffect(() => {
    const move = playMoves[currentMove];
    if (!move) return;
    const tier = getTier(move.score, !!move.isFullRack);
    if (tier === 'basic' || tier === 'great') return;
    let frame = 0;
    const total = tier === 'fullrack' ? 40 : tier === 'legendary' ? 30 : 20;
    const anim = setInterval(() => {
      frame++;
      setEffectPhase(frame / total);
      if (frame >= total) clearInterval(anim);
    }, 40);
    return () => clearInterval(anim);
  }, [currentMove]); // eslint-disable-line

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = W; canvas.height = H;
    const outroAlpha = currentMove >= playMoves.length ? 1 : 0;
    drawFrame(ctx, pal, snapshots, playMoves, players, winnerId, currentMove, effectPhase, outroAlpha);
  }, [currentMove, effectPhase, snapshots, playMoves, players, winnerId, pal]);

  // GIF generation — scaled down for smaller file + faster encoding
  const GIF_SCALE = 0.75;
  const GIF_W = Math.round(W * GIF_SCALE);
  const GIF_H = Math.round(H * GIF_SCALE);

  const generateGif = useCallback(async () => {
    setGenerating(true); setGifUrl(null); setGenProgress('');

    // Full-res canvas for drawing
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = W; srcCanvas.height = H;
    const srcCtx = srcCanvas.getContext('2d')!;

    // Scaled canvas for GIF frames
    const gifCanvas = document.createElement('canvas');
    gifCanvas.width = GIF_W; gifCanvas.height = GIF_H;
    const gifCtx = gifCanvas.getContext('2d', { willReadFrequently: true })!;
    gifCtx.imageSmoothingEnabled = true;
    gifCtx.imageSmoothingQuality = 'high';

    const frames: GifFrame[] = [];

    const captureFrame = (delay: number) => {
      gifCtx.clearRect(0, 0, GIF_W, GIF_H);
      gifCtx.drawImage(srcCanvas, 0, 0, GIF_W, GIF_H);
      frames.push({ delay, imageData: gifCtx.getImageData(0, 0, GIF_W, GIF_H) });
    };

    // Total frames estimation for progress
    let totalExpected = 2; // intro + outro
    for (const m of playMoves) {
      totalExpected++;
      const t = getTier(m.score, !!m.isFullRack);
      if (t === 'incredible' || t === 'legendary' || t === 'fullrack') totalExpected += (t === 'fullrack' ? 6 : 4);
    }

    // Intro frame (empty board, hold 1s)
    drawFrame(srcCtx, pal, snapshots, playMoves, players, winnerId, -1, 0, 0);
    captureFrame(100);
    setGenProgress(`1 / ${totalExpected}`);

    // Yield to UI
    await new Promise(r => setTimeout(r, 0));

    // Moves
    for (let i = 0; i < playMoves.length; i++) {
      const move = playMoves[i];
      const tier = getTier(move.score, !!move.isFullRack);
      const hasBigEffect = tier === 'incredible' || tier === 'legendary' || tier === 'fullrack';

      // Main frame: board with new tiles
      drawFrame(srcCtx, pal, snapshots, playMoves, players, winnerId, i, 0, 0);
      captureFrame(hasBigEffect ? 60 : 120);

      // Effect frames for big moves
      if (hasBigEffect) {
        const effectCount = tier === 'fullrack' ? 6 : 4;
        for (let e = 1; e <= effectCount; e++) {
          drawFrame(srcCtx, pal, snapshots, playMoves, players, winnerId, i, e / effectCount, 0);
          captureFrame(tier === 'fullrack' ? 25 : 20);
        }
      }

      setGenProgress(`${frames.length} / ${totalExpected}`);
      // Yield every 3 moves so UI stays responsive
      if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // Outro (hold 2s)
    drawFrame(srcCtx, pal, snapshots, playMoves, players, winnerId, playMoves.length, 0, 1);
    captureFrame(200);

    setGenProgress(`Encoding ${frames.length} frames...`);
    await new Promise(r => setTimeout(r, 10));

    const blob = encodeGif(GIF_W, GIF_H, frames);
    console.log(`[Lettrix GIF] ${frames.length} frames, ${GIF_W}x${GIF_H}, ${(blob.size / 1024).toFixed(0)} KB`);
    setGifUrl(URL.createObjectURL(blob));
    setGenerating(false);
  }, [pal, snapshots, playMoves, players, winnerId, GIF_W, GIF_H]);

  const downloadGif = useCallback(() => {
    if (!gifUrl) return;
    const a = document.createElement('a'); a.href = gifUrl; a.download = 'lettrix-replay.gif'; a.click();
  }, [gifUrl]);

  // Build share text
  const shareText = useCallback(() => {
    const p1 = players[0], p2 = players[1];
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    const best = playMoves.reduce<{ word: string; score: number }>((b, m) => m.score > b.score ? { word: m.words[0] ?? '', score: m.score } : b, { word: '', score: 0 });
    return `🎮 Lettrix: ${p1?.name} ${p1?.score} - ${p2?.score} ${p2?.name}${best.word ? `\n⭐ Best: ${best.word} (+${best.score})` : ''}\n${url}`;
  }, [players, playMoves]);

  // Native share (mobile) — with GIF file if supported, text-only fallback
  const shareNative = useCallback(async () => {
    const text = shareText();
    if (!navigator.share) return;
    try {
      // Try sharing with GIF file first
      if (gifUrl) {
        const res = await fetch(gifUrl);
        const blob = await res.blob();
        const file = new File([blob], 'lettrix-replay.gif', { type: 'image/gif' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Lettrix Replay', text });
          return;
        }
      }
      // Fallback: text only
      await navigator.share({ title: 'Lettrix', text });
    } catch { /* user cancelled */ }
  }, [gifUrl, shareText]);

  const copyResult = useCallback(async () => {
    await navigator.clipboard?.writeText(shareText());
  }, [shareText]);

  const shareTwitter = useCallback(() => {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText())}`, '_blank');
  }, [shareText]);

  const shareWhatsApp = useCallback(() => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, '_blank');
  }, [shareText]);

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-3" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-4 sm:p-5 max-w-[580px] w-full space-y-3 gradient-border animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-black gradient-text text-center">{t('replayTitle')}</h3>

        <div className="flex justify-center">
          <canvas ref={canvasRef} className="rounded-xl w-full max-w-[540px]" style={{ aspectRatio: `${W}/${H}`, imageRendering: 'auto' }} />
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPlaying(p => !p)}
            className="glass rounded-lg px-4 py-2 text-sm font-bold text-gray-300 hover:text-white transition-all active:scale-95">
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onClick={() => { setCurrentMove(-1); setEffectPhase(0); setPlaying(true); }}
            className="glass rounded-lg px-4 py-2 text-sm font-bold text-gray-300 hover:text-white transition-all active:scale-95">
            ↺ Restart
          </button>
        </div>

        {/* GIF export */}
        <div className="flex flex-wrap gap-2 justify-center">
          {!gifUrl ? (
            <button onClick={generateGif} disabled={generating}
              className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 hover:from-amber-400 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 active:scale-[0.97]">
              {generating ? (genProgress || t('replayGenerating')) : t('replayCreateGif')}
            </button>
          ) : (
            <>
              <button onClick={downloadGif}
                className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500 active:scale-[0.97]">
                {t('replayDownload')} GIF
              </button>
              {canNativeShare && (
                <button onClick={shareNative}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500 active:scale-[0.97]">
                  {t('replayShare')}
                </button>
              )}
            </>
          )}
        </div>

        {/* Share text + close */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={copyResult}
            className="px-4 py-2.5 glass rounded-xl font-bold text-sm text-amber-400 hover:text-amber-300 transition-all active:scale-[0.97]">
            {t('copyLink')}
          </button>
          <button onClick={shareTwitter}
            className="px-4 py-2.5 glass rounded-xl font-bold text-sm text-gray-300 hover:text-white transition-all active:scale-[0.97]">
            𝕏
          </button>
          <button onClick={shareWhatsApp}
            className="px-4 py-2.5 glass rounded-xl font-bold text-sm text-green-400 hover:text-green-300 transition-all active:scale-[0.97]">
            WhatsApp
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 glass rounded-xl font-bold text-sm text-gray-500 hover:text-white transition-all active:scale-[0.97]">
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
