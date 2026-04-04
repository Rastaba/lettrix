import { BonusType } from './types';

const _ = null;
const TW: BonusType = 'TW';
const DW: BonusType = 'DW';
const TL: BonusType = 'TL';
const DL: BonusType = 'DL';

export const BONUS_GRID: BonusType[][] = [
  [TW, _, _, DL, _, _, _, TW, _, _, _, DL, _, _, TW],
  [_, DW, _, _, _, TL, _, _, _, TL, _, _, _, DW, _],
  [_, _, DW, _, _, _, DL, _, DL, _, _, _, DW, _, _],
  [DL, _, _, DW, _, _, _, DL, _, _, _, DW, _, _, DL],
  [_, _, _, _, DW, _, _, _, _, _, DW, _, _, _, _],
  [_, TL, _, _, _, TL, _, _, _, TL, _, _, _, TL, _],
  [_, _, DL, _, _, _, DL, _, DL, _, _, _, DL, _, _],
  [TW, _, _, DL, _, _, _, DW, _, _, _, DL, _, _, TW],
  [_, _, DL, _, _, _, DL, _, DL, _, _, _, DL, _, _],
  [_, TL, _, _, _, TL, _, _, _, TL, _, _, _, TL, _],
  [_, _, _, _, DW, _, _, _, _, _, DW, _, _, _, _],
  [DL, _, _, DW, _, _, _, DL, _, _, _, DW, _, _, DL],
  [_, _, DW, _, _, _, DL, _, DL, _, _, _, DW, _, _],
  [_, DW, _, _, _, TL, _, _, _, TL, _, _, _, DW, _],
  [TW, _, _, DL, _, _, _, TW, _, _, _, DL, _, _, TW],
];

// Labels shown on board cells - language-aware via getLabelForBonus()
export const BONUS_LABELS_EN: Record<string, string> = { TW: 'W×3', DW: 'W×2', TL: 'L×3', DL: 'L×2' };
export const BONUS_LABELS_FR: Record<string, string> = { TW: 'M×3', DW: 'M×2', TL: 'L×3', DL: 'L×2' };
// Fallback for non-language-aware imports
export const BONUS_LABELS: Record<string, string> = BONUS_LABELS_FR;

export const BONUS_STYLES: Record<string, { bg: string; glow: string }> = {
  TW: {
    bg: 'bg-gradient-to-br from-red-600 to-red-800 text-red-100',
    glow: 'glow-red',
  },
  DW: {
    bg: 'bg-gradient-to-br from-pink-500 to-fuchsia-700 text-pink-100',
    glow: 'glow-pink',
  },
  TL: {
    bg: 'bg-gradient-to-br from-blue-500 to-indigo-700 text-blue-100',
    glow: 'glow-blue',
  },
  DL: {
    bg: 'bg-gradient-to-br from-cyan-400 to-sky-600 text-cyan-100',
    glow: 'glow-cyan',
  },
};
