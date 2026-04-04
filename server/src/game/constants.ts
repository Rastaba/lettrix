export type BonusType = 'TW' | 'DW' | 'TL' | 'DL' | null;
export type GameLang = 'fr' | 'en';

export const BOARD_SIZE = 15;
export const RACK_SIZE = 7;
export const FULL_RACK_BONUS = 50;
export const MAX_CONSECUTIVE_PASSES = 6;

// ── English ──

export const LETTER_VALUES_EN: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1,
  S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
};

export const TILE_DISTRIBUTION_EN: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9,
  J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6,
  S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, '?': 2,
};

// ── Français ──

export const LETTER_VALUES_FR: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 8, K: 10, L: 1, M: 2, N: 1, O: 1, P: 3, Q: 8, R: 1,
  S: 1, T: 1, U: 1, V: 4, W: 10, X: 10, Y: 10, Z: 10,
};

export const TILE_DISTRIBUTION_FR: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 3, E: 15, F: 2, G: 2, H: 2, I: 8,
  J: 1, K: 1, L: 5, M: 3, N: 6, O: 6, P: 2, Q: 1, R: 6,
  S: 6, T: 6, U: 6, V: 2, W: 1, X: 1, Y: 1, Z: 1, '?': 2,
};

// ── Helpers ──

export function getLetterValues(lang: GameLang): Record<string, number> {
  return lang === 'fr' ? LETTER_VALUES_FR : LETTER_VALUES_EN;
}

export function getTileDistribution(lang: GameLang): Record<string, number> {
  return lang === 'fr' ? TILE_DISTRIBUTION_FR : TILE_DISTRIBUTION_EN;
}

// ── Board bonus grid ──

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
