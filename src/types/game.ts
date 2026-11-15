export type Subject = 'mixed' | 'math' | 'science' | 'geography' | 'vocabulary' | 'cs';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameRuleMode = 'classic' | 'portal' | 'blitz';

export type BoardThemeId = 'meadow' | 'ocean' | 'sandstone' | 'midnight';

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GridPoint {
  x: number;
  y: number;
}

export interface Question {
  id: string;
  subject: Exclude<Subject, 'mixed'>;
  prompt: string;
  correctAnswer: string;
  distractors: [string, string, string];
  explanation: string;
}

export type TokenLetter = 'A' | 'B' | 'C' | 'D';

export interface AnswerChoice {
  letter: TokenLetter;
  label: string;
  isCorrect: boolean;
  eliminated: boolean;
}

export interface BoardToken {
  id: string;
  x: number;
  y: number;
  letter: TokenLetter;
  label: string;
  isCorrect: boolean;
  spawnAnim: number; // 0 -> 1
  eliminated: boolean;
}

export type BonusKind = 'shield' | 'prune' | 'points';

export interface BonusFruit {
  x: number;
  y: number;
  kind: BonusKind;
  timeLeft: number;
  maxTime: number;
  spawnAnim: number;
}

export interface ReviewEntry {
  prompt: string;
  chosenAnswer: string;
  correctAnswer: string;
  explanation: string;
  subject: Exclude<Subject, 'mixed'>;
  wasCorrect: boolean;
}

export interface FeedbackBanner {
  text: string;
  tone: 'correct' | 'wrong' | 'bonus' | 'level';
  id: number;
}

export interface HudSnapshot {
  score: number;
  highScore: number;
  hearts: number;
  maxHearts: number;
  streak: number;
  bestStreak: number;
  level: number;
  correctCount: number;
  totalAttempts: number;
  hasShield: boolean;
  timeLeftSeconds: number | null;
  currentQuestion: Question | null;
  choices: AnswerChoice[];
  feedback: FeedbackBanner | null;
  reviewLog: ReviewEntry[];
  endReason: 'wall' | 'self' | 'hearts' | 'time' | null;
}

export interface GameConfig {
  subject: Subject;
  difficulty: Difficulty;
  ruleMode: GameRuleMode;
  theme: BoardThemeId;
}
