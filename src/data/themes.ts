import { BoardThemeId, TokenLetter } from '../types/game';

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  outerBg: string;
  hudBg: string;
  hudBorder: string;
  boardFrame: string;
  cellLight: string;
  cellDark: string;
  snakePrimary: string;
  snakeHighlight: string;
  snakeDark: string;
  hudText: string;
  hudMuted: string;
  accentBg: string;
  accentText: string;
  choiceBg: string;
  choiceText: string;
  isDarkBoard: boolean;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  meadow: {
    id: 'meadow',
    name: 'Orchard',
    outerBg: '#3D6323',
    hudBg: '#4A752C',
    hudBorder: '#3B5E22',
    boardFrame: '#578A34',
    cellLight: '#AAD751',
    cellDark: '#A2D149',
    snakePrimary: '#4674E9',
    snakeHighlight: '#6D95FA',
    snakeDark: '#3057C4',
    hudText: '#FFFFFF',
    hudMuted: '#D9F2B8',
    accentBg: '#FACC15',
    accentText: '#1E293B',
    choiceBg: '#3B6121',
    choiceText: '#FFFFFF',
    isDarkBoard: false,
  },
  ocean: {
    id: 'ocean',
    name: 'Lagoon',
    outerBg: '#0E374E',
    hudBg: '#134966',
    hudBorder: '#0B2E42',
    boardFrame: '#195E82',
    cellLight: '#7DD3FC',
    cellDark: '#69C6F5',
    snakePrimary: '#EA580C',
    snakeHighlight: '#FB923C',
    snakeDark: '#C2410C',
    hudText: '#FFFFFF',
    hudMuted: '#BAE6FD',
    accentBg: '#FDE047',
    accentText: '#0F172A',
    choiceBg: '#0F3B54',
    choiceText: '#FFFFFF',
    isDarkBoard: false,
  },
  sandstone: {
    id: 'sandstone',
    name: 'Canyon',
    outerBg: '#71320C',
    hudBg: '#8B3E10',
    hudBorder: '#632B09',
    boardFrame: '#A64D15',
    cellLight: '#FDE68A',
    cellDark: '#FAD96B',
    snakePrimary: '#0F766E',
    snakeHighlight: '#2DD4BF',
    snakeDark: '#115E59',
    hudText: '#FFFFFF',
    hudMuted: '#FEF3C7',
    accentBg: '#FEF08A',
    accentText: '#451A03',
    choiceBg: '#6B2F0B',
    choiceText: '#FFFFFF',
    isDarkBoard: false,
  },
  midnight: {
    id: 'midnight',
    name: 'Observatory',
    outerBg: '#090E1A',
    hudBg: '#111827',
    hudBorder: '#1F2937',
    boardFrame: '#1E293B',
    cellLight: '#243044',
    cellDark: '#1D2738',
    snakePrimary: '#10B981',
    snakeHighlight: '#34D399',
    snakeDark: '#059669',
    hudText: '#F8FAFC',
    hudMuted: '#94A3B8',
    accentBg: '#38BDF8',
    accentText: '#0F172A',
    choiceBg: '#182235',
    choiceText: '#F8FAFC',
    isDarkBoard: true,
  },
};

export interface TokenVisualStyle {
  fill: string;
  highlight: string;
  stem: string;
  shape: 'apple' | 'citrus' | 'plum' | 'berry';
}

export const TOKEN_STYLES: Record<TokenLetter, TokenVisualStyle> = {
  A: {
    fill: '#DC2626',
    highlight: '#F87171',
    stem: '#3F6212',
    shape: 'apple',
  },
  B: {
    fill: '#EA580C',
    highlight: '#FB923C',
    stem: '#365314',
    shape: 'citrus',
  },
  C: {
    fill: '#7C3AED',
    highlight: '#A78BFA',
    stem: '#3F6212',
    shape: 'plum',
  },
  D: {
    fill: '#DB2777',
    highlight: '#F472B6',
    stem: '#365314',
    shape: 'berry',
  },
};
