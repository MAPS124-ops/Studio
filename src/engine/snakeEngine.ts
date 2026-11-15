import { BOARD_THEMES, TOKEN_STYLES } from '../data/themes';
import { QuestionGenerator } from '../data/questions';
import {
  AnswerChoice,
  BoardToken,
  BonusFruit,
  BonusKind,
  Direction,
  FeedbackBanner,
  GameConfig,
  GameState,
  GridPoint,
  HudSnapshot,
  Question,
  ReviewEntry,
  TokenLetter,
} from '../types/game';
import { soundFx } from '../utils/sound';

export const GRID_COLS = 17;
export const GRID_ROWS = 15;

const LETTERS: TokenLetter[] = ['A', 'B', 'C', 'D'];

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingLabel {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

const OPPOSITE_DIR: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

const DIR_VEC: Record<Direction, GridPoint> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const STORAGE_KEY_PREFIX = 'scholar_snake_best_';

function loadBestScore(config: GameConfig): number {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${config.subject}_${config.difficulty}_${config.ruleMode}`);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(config: GameConfig, score: number): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${config.subject}_${config.difficulty}_${config.ruleMode}`;
    const prev = loadBestScore(config);
    if (score > prev) {
      localStorage.setItem(key, String(score));
    }
  } catch {
    // ignore storage errors
  }
}

export class SnakeEngine {
  private config: GameConfig;
  private gameState: GameState = 'TITLE_MENU';
  private onHudChange: (snapshot: HudSnapshot) => void;
  private onStateChange: (state: GameState) => void;

  private questionGen = new QuestionGenerator();

  // Snake grid coordinates (index 0 = head)
  private snake: GridPoint[] = [];
  private prevSnake: GridPoint[] = [];
  private direction: Direction = 'RIGHT';
  private turnQueue: Direction[] = [];
  private growPending = 0;

  // Timing & simulation
  private stepAccumulator = 0;
  private elapsedTime = 0;
  private hitstopTimer = 0;
  private boostHeld = false;
  private reducedMotion = false;

  // Educational & scoring state
  private score = 0;
  private highScore = 0;
  private hearts = 3;
  private maxHearts = 3;
  private streak = 0;
  private bestStreak = 0;
  private level = 1;
  private correctCount = 0;
  private totalAttempts = 0;
  private hasShield = false;
  private timeLeftSeconds: number | null = null;
  private endReason: HudSnapshot['endReason'] = null;

  private currentQuestion: Question | null = null;
  private tokens: BoardToken[] = [];
  private bonusFruit: BonusFruit | null = null;
  private questionsSinceBonus = 0;
  private reviewLog: ReviewEntry[] = [];
  private feedback: FeedbackBanner | null = null;
  private feedbackCounter = 0;
  private feedbackTimer = 0;

  // Visual juice
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private flashColor = '#ffffff';
  private flashAlpha = 0;
  private headPop = 0; // 0..1 squash/stretch
  private digestPos = -1; // travels down snake segments
  private particles: Particle[] = [];
  private floatingLabels: FloatingLabel[] = [];

  // Demo mode target
  private demoTarget: GridPoint | null = null;

  constructor(
    initialConfig: GameConfig,
    onHudChange: (snapshot: HudSnapshot) => void,
    onStateChange: (state: GameState) => void
  ) {
    this.config = initialConfig;
    this.onHudChange = onHudChange;
    this.onStateChange = onStateChange;

    if (typeof window !== 'undefined' && window.matchMedia) {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // Pre-allocate particle pool
    for (let i = 0; i < 80; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 3,
        color: '#ffffff',
        alpha: 0,
        life: 0,
        maxLife: 0.5,
      });
    }

    this.highScore = loadBestScore(this.config);
    this.initDemoWorld();
  }

  public updateConfig(nextConfig: GameConfig): void {
    this.config = nextConfig;
    this.highScore = loadBestScore(this.config);
    if (this.gameState === 'TITLE_MENU') {
      this.emitHud();
    }
  }

  public setBoost(held: boolean): void {
    this.boostHeld = held;
  }

  public queueTurn(dir: Direction): void {
    if (this.gameState !== 'PLAYING') return;
    const lastPlanned = this.turnQueue.length > 0 ? this.turnQueue[this.turnQueue.length - 1] : this.direction;
    if (dir === lastPlanned || dir === OPPOSITE_DIR[lastPlanned]) {
      return;
    }
    if (this.turnQueue.length < 2) {
      this.turnQueue.push(dir);
      soundFx.playTurn(dir === 'UP' || dir === 'RIGHT' ? 1 : -1);
    }
  }

  public getState(): GameState {
    return this.gameState;
  }

  public startNewGame(config?: GameConfig): void {
    if (config) {
      this.config = config;
    }
    this.questionGen.reset();
    this.highScore = loadBestScore(this.config);

    this.snake = [
      { x: 5, y: 7 },
      { x: 4, y: 7 },
      { x: 3, y: 7 },
      { x: 2, y: 7 },
    ];
    this.prevSnake = this.snake.map((p) => ({ ...p }));
    this.direction = 'RIGHT';
    this.turnQueue = [];
    this.growPending = 0;
    this.stepAccumulator = 0;
    this.hitstopTimer = 0;
    this.boostHeld = false;

    this.score = 0;
    this.maxHearts = 3;
    this.hearts = 3;
    this.streak = 0;
    this.bestStreak = 0;
    this.level = 1;
    this.correctCount = 0;
    this.totalAttempts = 0;
    this.hasShield = false;
    this.timeLeftSeconds = this.config.ruleMode === 'blitz' ? 90 : null;
    this.endReason = null;

    this.bonusFruit = null;
    this.questionsSinceBonus = 0;
    this.reviewLog = [];
    this.feedback = null;
    this.feedbackTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.flashAlpha = 0;
    this.headPop = 0;
    this.digestPos = -1;
    this.floatingLabels = [];
    this.clearParticles();

    this.spawnNextQuestion();
    this.setGameState('PLAYING');
    this.emitHud();
  }

  public returnToTitle(): void {
    this.boostHeld = false;
    this.initDemoWorld();
    this.setGameState('TITLE_MENU');
    this.emitHud();
  }

  public togglePause(): void {
    if (this.gameState === 'PLAYING') {
      this.boostHeld = false;
      this.setGameState('PAUSED');
    } else if (this.gameState === 'PAUSED') {
      this.setGameState('PLAYING');
    }
  }

  public pauseIfPlaying(): void {
    if (this.gameState === 'PLAYING') {
      this.boostHeld = false;
      this.setGameState('PAUSED');
    }
  }

  private setGameState(next: GameState): void {
    this.gameState = next;
    this.onStateChange(next);
  }

  private initDemoWorld(): void {
    this.snake = [
      { x: 6, y: 7 },
      { x: 5, y: 7 },
      { x: 4, y: 7 },
      { x: 3, y: 7 },
      { x: 2, y: 7 },
    ];
    this.prevSnake = this.snake.map((p) => ({ ...p }));
    this.direction = 'RIGHT';
    this.turnQueue = [];
    this.stepAccumulator = 0;
    this.hasShield = false;
    this.bonusFruit = null;
    this.tokens = [];
    this.currentQuestion = null;
    this.floatingLabels = [];
    this.clearParticles();

    // Place decorative tokens for live background world
    const demoCoords: GridPoint[] = [
      { x: 12, y: 4 },
      { x: 13, y: 10 },
      { x: 4, y: 3 },
      { x: 9, y: 11 },
    ];
    this.tokens = demoCoords.map((pt, idx) => ({
      id: `demo-${idx}`,
      x: pt.x,
      y: pt.y,
      letter: LETTERS[idx],
      label: LETTERS[idx],
      isCorrect: idx === 0,
      spawnAnim: 1,
      eliminated: false,
    }));
    this.demoTarget = demoCoords[0];
  }

  private clearParticles(): void {
    for (const p of this.particles) {
      p.active = false;
    }
  }

  private getStepDuration(): number {
    if (this.gameState === 'TITLE_MENU') {
      return 1 / 6.2;
    }
    const baseSpeed =
      this.config.difficulty === 'easy'
        ? 6.1
        : this.config.difficulty === 'medium'
        ? 7.3
        : 8.6;
    const blitzBonus = this.config.ruleMode === 'blitz' ? 0.6 : 0;
    const levelRamp = Math.min((this.level - 1) * 0.35, 3.2);
    const cellsPerSec = baseSpeed + blitzBonus + levelRamp;
    const baseDuration = 1 / cellsPerSec;
    return this.boostHeld ? baseDuration * 0.58 : baseDuration;
  }

  public update(rawDt: number): void {
    const dt = Math.min(rawDt, 0.05);
    this.elapsedTime += dt;

    // Update visual effects even during hitstop/game over
    this.updateParticles(dt);
    this.updateFloatingLabels(dt);
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.8);
    }
    if (this.headPop > 0) {
      this.headPop = Math.max(0, this.headPop - dt * 5.2);
    }
    if (this.digestPos >= 0) {
      this.digestPos += dt * 18;
      if (this.digestPos > this.snake.length + 1) {
        this.digestPos = -1;
      }
    }

    // Token spawn animations
    for (const t of this.tokens) {
      if (t.spawnAnim < 1) {
        t.spawnAnim = Math.min(1, t.spawnAnim + dt * 5.2);
      }
    }
    if (this.bonusFruit) {
      if (this.bonusFruit.spawnAnim < 1) {
        this.bonusFruit.spawnAnim = Math.min(1, this.bonusFruit.spawnAnim + dt * 5.2);
      }
      if (this.gameState === 'PLAYING') {
        this.bonusFruit.timeLeft -= dt;
        if (this.bonusFruit.timeLeft <= 0) {
          this.bonusFruit = null;
        }
      }
    }

    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt;
      if (this.feedbackTimer <= 0 && this.feedback) {
        this.feedback = null;
        this.emitHud();
      }
    }

    if (this.gameState === 'PAUSED' || this.gameState === 'GAME_OVER') {
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    // Blitz mode timer
    if (this.gameState === 'PLAYING' && this.timeLeftSeconds !== null) {
      const prevCeil = Math.ceil(this.timeLeftSeconds);
      this.timeLeftSeconds = Math.max(0, this.timeLeftSeconds - dt);
      const nextCeil = Math.ceil(this.timeLeftSeconds);
      if (nextCeil !== prevCeil) {
        this.emitHud();
      }
      if (this.timeLeftSeconds <= 0) {
        this.triggerGameOver('time');
        return;
      }
    }

    const stepDuration = this.getStepDuration();
    this.stepAccumulator += dt;

    while (this.stepAccumulator >= stepDuration) {
      this.stepAccumulator -= stepDuration;
      if (this.gameState === 'TITLE_MENU') {
        this.stepDemo();
      } else if (this.gameState === 'PLAYING') {
        this.stepPlay();
        if (this.gameState !== 'PLAYING') {
          break;
        }
      }
    }
  }

  private stepDemo(): void {
    this.prevSnake = this.snake.map((p) => ({ ...p }));
    const head = this.snake[0];

    // Simple safe autopilot toward demoTarget
    if (!this.demoTarget || !this.tokens.some((t) => t.x === this.demoTarget!.x && t.y === this.demoTarget!.y)) {
      this.demoTarget = this.tokens[0] ? { x: this.tokens[0].x, y: this.tokens[0].y } : { x: 8, y: 7 };
    }

    const candidates: Direction[] = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]).filter(
      (d) => d !== OPPOSITE_DIR[this.direction]
    );

    const safeDirs = candidates.filter((d) => {
      const v = DIR_VEC[d];
      const nx = (head.x + v.x + GRID_COLS) % GRID_COLS;
      const ny = (head.y + v.y + GRID_ROWS) % GRID_ROWS;
      return !this.snake.slice(0, -1).some((s) => s.x === nx && s.y === ny);
    });

    const pool = safeDirs.length > 0 ? safeDirs : candidates;
    pool.sort((a, b) => {
      const va = DIR_VEC[a];
      const vb = DIR_VEC[b];
      const nax = (head.x + va.x + GRID_COLS) % GRID_COLS;
      const nay = (head.y + va.y + GRID_ROWS) % GRID_ROWS;
      const nbx = (head.x + vb.x + GRID_COLS) % GRID_COLS;
      const nby = (head.y + vb.y + GRID_ROWS) % GRID_ROWS;
      const da = Math.abs(nax - this.demoTarget!.x) + Math.abs(nay - this.demoTarget!.y);
      const db = Math.abs(nbx - this.demoTarget!.x) + Math.abs(nby - this.demoTarget!.y);
      return da - db;
    });

    this.direction = pool[0];
    const vec = DIR_VEC[this.direction];
    const nextHead = {
      x: (head.x + vec.x + GRID_COLS) % GRID_COLS,
      y: (head.y + vec.y + GRID_ROWS) % GRID_ROWS,
    };

    this.snake.unshift(nextHead);
    this.snake.pop();

    const hitIdx = this.tokens.findIndex((t) => t.x === nextHead.x && t.y === nextHead.y);
    if (hitIdx !== -1) {
      const hit = this.tokens[hitIdx];
      const style = TOKEN_STYLES[hit.letter];
      this.spawnBurst(hit.x + 0.5, hit.y + 0.5, style.fill, 10);
      this.headPop = 1;
      const free = this.pickSafeSpawnCell(3);
      hit.x = free.x;
      hit.y = free.y;
      hit.spawnAnim = 0;
      const nextToken = this.tokens[(hitIdx + 1) % this.tokens.length];
      this.demoTarget = { x: nextToken.x, y: nextToken.y };
    }
  }

  private stepPlay(): void {
    this.prevSnake = this.snake.map((p) => ({ ...p }));

    if (this.turnQueue.length > 0) {
      const nextDir = this.turnQueue.shift()!;
      if (nextDir !== OPPOSITE_DIR[this.direction]) {
        this.direction = nextDir;
      }
    }

    const head = this.snake[0];
    const vec = DIR_VEC[this.direction];
    let nx = head.x + vec.x;
    let ny = head.y + vec.y;

    // Wall check
    if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) {
      if (this.config.ruleMode === 'portal') {
        nx = (nx + GRID_COLS) % GRID_COLS;
        ny = (ny + GRID_ROWS) % GRID_ROWS;
      } else if (this.hasShield) {
        this.hasShield = false;
        soundFx.playShieldSave();
        this.triggerImpact('#38BDF8', 0.35, 0.055, 6);
        this.showFeedback('Shield absorbed wall impact!', 'bonus');
        nx = (nx + GRID_COLS) % GRID_COLS;
        ny = (ny + GRID_ROWS) % GRID_ROWS;
        this.emitHud();
      } else {
        soundFx.playWrong();
        this.triggerGameOver('wall');
        return;
      }
    }

    // Self collision check (ignore tail tip if not growing)
    const bodyToCheck = this.growPending > 0 ? this.snake : this.snake.slice(0, -1);
    const hitsSelf = bodyToCheck.some((seg) => seg.x === nx && seg.y === ny);
    if (hitsSelf) {
      if (this.hasShield) {
        this.hasShield = false;
        soundFx.playShieldSave();
        this.triggerImpact('#38BDF8', 0.35, 0.055, 6);
        this.showFeedback('Shield saved you from self-collision!', 'bonus');
        this.emitHud();
      } else {
        soundFx.playWrong();
        this.triggerGameOver('self');
        return;
      }
    }

    // Advance snake
    this.snake.unshift({ x: nx, y: ny });
    if (this.growPending > 0) {
      this.growPending -= 1;
    } else {
      this.snake.pop();
    }

    // Check bonus fruit collision
    if (this.bonusFruit && this.bonusFruit.x === nx && this.bonusFruit.y === ny) {
      this.collectBonusFruit(this.bonusFruit);
    }

    // Check answer token collision
    const tokenIdx = this.tokens.findIndex((t) => !t.eliminated && t.x === nx && t.y === ny);
    if (tokenIdx !== -1) {
      this.handleTokenEat(this.tokens[tokenIdx]);
    }
  }

  private collectBonusFruit(fruit: BonusFruit): void {
    this.bonusFruit = null;
    this.headPop = 1;
    soundFx.playBonus();
    this.spawnBurst(fruit.x + 0.5, fruit.y + 0.5, '#FACC15', 16);

    if (fruit.kind === 'shield') {
      this.hasShield = true;
      this.floatingLabels.push({
        x: fruit.x + 0.5,
        y: fruit.y + 0.2,
        text: 'SHIELD!',
        color: '#38BDF8',
        life: 0.95,
        maxLife: 0.95,
      });
      this.showFeedback('Shield active — blocks 1 mistake or crash!', 'bonus');
    } else if (fruit.kind === 'prune') {
      const decoys = this.tokens.filter((t) => !t.isCorrect && !t.eliminated);
      if (decoys.length > 0) {
        const victim = decoys[Math.floor(Math.random() * decoys.length)];
        victim.eliminated = true;
        this.spawnBurst(victim.x + 0.5, victim.y + 0.5, '#94A3B8', 12);
      }
      this.floatingLabels.push({
        x: fruit.x + 0.5,
        y: fruit.y + 0.2,
        text: 'HINT -1',
        color: '#FDE047',
        life: 0.95,
        maxLife: 0.95,
      });
      this.showFeedback('Removed 1 wrong choice from the board!', 'bonus');
    } else {
      this.score += 150;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        saveBestScore(this.config, this.highScore);
      }
      this.floatingLabels.push({
        x: fruit.x + 0.5,
        y: fruit.y + 0.2,
        text: '+150',
        color: '#FDE047',
        life: 0.95,
        maxLife: 0.95,
      });
      this.showFeedback('Golden Fruit! +150 bonus points', 'bonus');
    }
    this.emitHud();
  }

  private handleTokenEat(token: BoardToken): void {
    if (!this.currentQuestion) return;

    this.totalAttempts += 1;
    this.headPop = 1;

    if (token.isCorrect) {
      this.correctCount += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.growPending += 1;
      this.digestPos = 0;

      const multiplier = Math.min(4, 1 + Math.floor((this.streak - 1) / 3));
      const gained = 100 * multiplier;
      this.score += gained;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        saveBestScore(this.config, this.highScore);
      }

      if (this.timeLeftSeconds !== null && this.streak % 3 === 0) {
        this.timeLeftSeconds = Math.min(120, this.timeLeftSeconds + 5);
      }

      const prevLevel = this.level;
      this.level = 1 + Math.floor(this.correctCount / 5);

      const style = TOKEN_STYLES[token.letter];
      this.spawnBurst(token.x + 0.5, token.y + 0.5, style.fill, 18);
      this.spawnBurst(token.x + 0.5, token.y + 0.5, '#FACC15', 8);

      this.floatingLabels.push({
        x: token.x + 0.5,
        y: token.y + 0.2,
        text: `+${gained}`,
        color: '#FFFFFF',
        life: 0.9,
        maxLife: 0.9,
      });

      this.reviewLog.push({
        prompt: this.currentQuestion.prompt,
        chosenAnswer: token.label,
        correctAnswer: this.currentQuestion.correctAnswer,
        explanation: this.currentQuestion.explanation,
        subject: this.currentQuestion.subject,
        wasCorrect: true,
      });

      if (this.level > prevLevel) {
        soundFx.playLevelUp();
        this.triggerImpact('#FACC15', 0.22, 0.03, 0);
        this.showFeedback(`Level ${this.level}! Speed increased · +${gained}`, 'level');
      } else {
        soundFx.playCorrect(this.streak);
        this.showFeedback(
          multiplier > 1 ? `Correct! ${multiplier}× Streak · +${gained}` : `Correct! +${gained}`,
          'correct'
        );
      }

      this.questionsSinceBonus += 1;
      if (this.questionsSinceBonus >= 4 && !this.bonusFruit) {
        this.questionsSinceBonus = 0;
        this.spawnBonusFruit();
      }

      this.spawnNextQuestion();
      this.emitHud();
    } else {
      // Wrong answer eaten!
      token.eliminated = true;
      this.spawnBurst(token.x + 0.5, token.y + 0.5, '#EF4444', 14);

      if (this.hasShield) {
        this.hasShield = false;
        soundFx.playShieldSave();
        this.triggerImpact('#38BDF8', 0.3, 0.05, 5);
        this.showFeedback(`Shield saved your heart! ("${token.label}" was wrong)`, 'bonus');
        this.emitHud();
        return;
      }

      this.streak = 0;
      this.hearts -= 1;
      soundFx.playWrong();
      this.triggerImpact('#EF4444', 0.38, 0.065, 8);

      this.floatingLabels.push({
        x: token.x + 0.5,
        y: token.y + 0.2,
        text: '−1 ♥',
        color: '#FCA5A5',
        life: 1.0,
        maxLife: 1.0,
      });

      this.reviewLog.push({
        prompt: this.currentQuestion.prompt,
        chosenAnswer: token.label,
        correctAnswer: this.currentQuestion.correctAnswer,
        explanation: this.currentQuestion.explanation,
        subject: this.currentQuestion.subject,
        wasCorrect: false,
      });

      if (this.hearts <= 0) {
        this.showFeedback(`Answer was: ${this.currentQuestion.correctAnswer}`, 'wrong');
        this.triggerGameOver('hearts');
        return;
      }

      this.showFeedback(`Not "${token.label}" — try another!`, 'wrong');
      this.emitHud();
    }
  }

  private triggerImpact(color: string, flash: number, hitstop: number, shake: number): void {
    if (this.reducedMotion) {
      this.flashColor = color;
      this.flashAlpha = flash * 0.4;
      return;
    }
    this.flashColor = color;
    this.flashAlpha = flash;
    this.hitstopTimer = hitstop;
    this.shakeTimer = shake > 0 ? 0.22 : 0;
    this.shakeIntensity = shake;
  }

  private triggerGameOver(reason: NonNullable<HudSnapshot['endReason']>): void {
    this.endReason = reason;
    this.boostHeld = false;
    saveBestScore(this.config, this.score);
    this.highScore = Math.max(this.highScore, this.score);
    this.triggerImpact('#EF4444', 0.45, 0.07, 10);
    soundFx.playGameOver();
    this.setGameState('GAME_OVER');
    this.emitHud();
  }

  private showFeedback(text: string, tone: FeedbackBanner['tone']): void {
    this.feedbackCounter += 1;
    this.feedback = { text, tone, id: this.feedbackCounter };
    this.feedbackTimer = 2.4;
  }

  private spawnNextQuestion(): void {
    const q = this.questionGen.next(this.config.subject, this.config.difficulty);
    this.currentQuestion = q;

    const rawOptions = shuffleArray([
      { label: q.correctAnswer, isCorrect: true },
      { label: q.distractors[0], isCorrect: false },
      { label: q.distractors[1], isCorrect: false },
      { label: q.distractors[2], isCorrect: false },
    ]);

    this.tokens = [];
    for (let i = 0; i < 4; i++) {
      const pt = this.pickSafeSpawnCell(3);
      this.tokens.push({
        id: `${q.id}-${LETTERS[i]}`,
        x: pt.x,
        y: pt.y,
        letter: LETTERS[i],
        label: rawOptions[i].label,
        isCorrect: rawOptions[i].isCorrect,
        spawnAnim: 0,
        eliminated: false,
      });
    }
  }

  private spawnBonusFruit(): void {
    const kinds: BonusKind[] = this.hasShield ? ['prune', 'points'] : ['shield', 'prune', 'points'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const pt = this.pickSafeSpawnCell(3);
    this.bonusFruit = {
      x: pt.x,
      y: pt.y,
      kind,
      timeLeft: 10,
      maxTime: 10,
      spawnAnim: 0,
    };
  }

  private pickSafeSpawnCell(minDistFromHead: number): GridPoint {
    const head = this.snake[0];
    const occupied = new Set<string>();
    for (const seg of this.snake) {
      occupied.add(`${seg.x},${seg.y}`);
    }
    for (const t of this.tokens) {
      occupied.add(`${t.x},${t.y}`);
    }
    if (this.bonusFruit) {
      occupied.add(`${this.bonusFruit.x},${this.bonusFruit.y}`);
    }

    const candidates: GridPoint[] = [];
    const fallback: GridPoint[] = [];
    const forward = DIR_VEC[this.direction];

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (occupied.has(`${x},${y}`)) continue;
        const dist = Math.abs(x - head.x) + Math.abs(y - head.y);
        const directlyInFront =
          (x === head.x + forward.x && y === head.y + forward.y) ||
          (x === head.x + forward.x * 2 && y === head.y + forward.y * 2);

        // Also keep a little spacing between tokens if possible
        const tooCloseToToken = this.tokens.some(
          (t) => Math.abs(t.x - x) + Math.abs(t.y - y) < 3
        );

        if (dist >= minDistFromHead && !directlyInFront && !tooCloseToToken) {
          candidates.push({ x, y });
        } else if (dist >= 2 && !directlyInFront) {
          fallback.push({ x, y });
        }
      }
    }

    const pool = candidates.length > 0 ? candidates : fallback;
    if (pool.length === 0) {
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          if (!occupied.has(`${x},${y}`)) return { x, y };
        }
      }
      return { x: 0, y: 0 };
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private spawnBurst(gx: number, gy: number, color: string, count: number): void {
    if (this.reducedMotion) return;
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.8 + Math.random() * 4.5;
        p.active = true;
        p.x = gx;
        p.y = gy;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.radius = 2.5 + Math.random() * 3.5;
        p.color = color;
        p.maxLife = 0.35 + Math.random() * 0.25;
        p.life = p.maxLife;
        p.alpha = 1;
        spawned += 1;
        if (spawned >= count) break;
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.alpha = p.life / p.maxLife;
    }
  }

  private updateFloatingLabels(dt: number): void {
    for (let i = this.floatingLabels.length - 1; i >= 0; i--) {
      const f = this.floatingLabels[i];
      f.life -= dt;
      f.y -= dt * 1.1;
      if (f.life <= 0) {
        this.floatingLabels.splice(i, 1);
      }
    }
  }

  public getHudSnapshot(): HudSnapshot {
    const choices: AnswerChoice[] = this.tokens.map((t) => ({
      letter: t.letter,
      label: t.label,
      isCorrect: t.isCorrect,
      eliminated: t.eliminated,
    }));
    return {
      score: this.score,
      highScore: this.highScore,
      hearts: this.hearts,
      maxHearts: this.maxHearts,
      streak: this.streak,
      bestStreak: this.bestStreak,
      level: this.level,
      correctCount: this.correctCount,
      totalAttempts: this.totalAttempts,
      hasShield: this.hasShield,
      timeLeftSeconds: this.timeLeftSeconds,
      currentQuestion: this.currentQuestion,
      choices,
      feedback: this.feedback,
      reviewLog: [...this.reviewLog],
      endReason: this.endReason,
    };
  }

  private emitHud(): void {
    this.onHudChange(this.getHudSnapshot());
  }

  // ==================== 60FPS CANVAS RENDERING ====================

  public render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const theme = BOARD_THEMES[this.config.theme];
    const cellW = width / GRID_COLS;
    const cellH = height / GRID_ROWS;
    const cell = Math.min(cellW, cellH);

    ctx.save();

    // Camera shake
    if (this.shakeTimer > 0 && !this.reducedMotion) {
      const decay = this.shakeTimer / 0.22;
      const dx = (Math.random() - 0.5) * 2 * this.shakeIntensity * decay;
      const dy = (Math.random() - 0.5) * 2 * this.shakeIntensity * decay;
      ctx.translate(dx, dy);
    }

    // 1. Checkerboard Playfield
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? theme.cellLight : theme.cellDark;
        ctx.fillRect(x * cell, y * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }

    // 2. Subtle Portal Edge Indicators when in Portal mode
    if (this.config.ruleMode === 'portal' && this.gameState !== 'TITLE_MENU') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = Math.max(2, cell * 0.08);
      ctx.setLineDash([cell * 0.28, cell * 0.28]);
      ctx.strokeRect(
        ctx.lineWidth / 2,
        ctx.lineWidth / 2,
        width - ctx.lineWidth,
        height - ctx.lineWidth
      );
      ctx.restore();
    }

    // 3. Draw Answer Tokens
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      if (!token.eliminated) {
        this.drawToken(ctx, token, cell, i);
      }
    }

    // 4. Draw Bonus Fruit if active
    if (this.bonusFruit) {
      this.drawBonusFruit(ctx, this.bonusFruit, cell);
    }

    // 5. Draw Smooth Interpolated Snake
    this.drawSnake(ctx, cell, theme);

    // 6. Draw Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * cell, p.y * cell, p.radius * (cell / 42), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 7. Draw Floating Score/Damage Labels
    for (const f of this.floatingLabels) {
      const alpha = Math.min(1, (f.life / f.maxLife) * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `700 ${Math.round(cell * 0.42)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.strokeText(f.text, f.x * cell, f.y * cell);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x * cell, f.y * cell);
      ctx.restore();
    }

    // 8. Hit / Level Flash
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawToken(ctx: CanvasRenderingContext2D, token: BoardToken, cell: number, index: number): void {
    const style = TOKEN_STYLES[token.letter];
    const cx = (token.x + 0.5) * cell;
    const bob = this.reducedMotion ? 0 : Math.sin(this.elapsedTime * 3.2 + index * 1.4) * (cell * 0.035);
    const cy = (token.y + 0.52) * cell + bob;

    // Elastic pop-in curve
    const t = token.spawnAnim;
    const scale =
      t < 1
        ? 1 + Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) * -1
        : 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, cell * 0.34, cell * 0.31, cell * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    const r = cell * 0.36;

    // Fruit leaf / stem
    ctx.fillStyle = '#4D7C0F';
    ctx.beginPath();
    ctx.ellipse(r * 0.24, -r * 0.96, r * 0.28, r * 0.14, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#365314';
    ctx.lineWidth = Math.max(1.5, cell * 0.045);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.72);
    ctx.quadraticCurveTo(r * 0.05, -r * 1.05, r * 0.16, -r * 1.12);
    ctx.stroke();

    // Fruit body
    ctx.fillStyle = style.fill;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gloss highlight
    ctx.fillStyle = style.highlight;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.28, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label: In Demo mode show letter, in Play mode show short value directly or A/B/C/D letter
    const isShort = this.gameState !== 'TITLE_MENU' && token.label.length <= 4;
    const text = isShort ? token.label : token.letter;
    const fontSize =
      text.length <= 1
        ? Math.round(cell * 0.38)
        : text.length <= 2
        ? Math.round(cell * 0.33)
        : text.length === 3
        ? Math.round(cell * 0.27)
        : Math.round(cell * 0.22);

    ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 3;
    ctx.fillText(text, 0, cell * 0.02);
    ctx.shadowBlur = 0;

    // If showing short answer directly, render tiny A/B/C/D corner badge
    if (isShort) {
      const bx = r * 0.78;
      const by = -r * 0.72;
      const br = cell * 0.15;
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${Math.round(cell * 0.18)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(token.letter, bx, by + 0.5);
    }

    ctx.restore();
  }

  private drawBonusFruit(ctx: CanvasRenderingContext2D, fruit: BonusFruit, cell: number): void {
    const cx = (fruit.x + 0.5) * cell;
    const cy = (fruit.y + 0.5) * cell;
    const r = cell * 0.34;
    const pulse = this.reducedMotion ? 1 : 1 + Math.sin(this.elapsedTime * 7) * 0.06;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse * fruit.spawnAnim, pulse * fruit.spawnAnim);

    // Countdown ring
    const frac = Math.max(0, fruit.timeLeft / fruit.maxTime);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.lineWidth = Math.max(2, cell * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();

    // Star/Orb fill
    ctx.fillStyle = fruit.kind === 'shield' ? '#38BDF8' : fruit.kind === 'prune' ? '#A78BFA' : '#FACC15';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.stroke();

    // Crisp symbol inside
    ctx.fillStyle = '#0F172A';
    ctx.font = `800 ${Math.round(cell * 0.34)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symbol = fruit.kind === 'shield' ? 'S' : fruit.kind === 'prune' ? '−1' : '★';
    ctx.fillText(symbol, 0, 1);

    ctx.restore();
  }

  private drawSnake(ctx: CanvasRenderingContext2D, cell: number, theme: typeof BOARD_THEMES.meadow): void {
    if (this.snake.length === 0) return;

    const stepDuration = this.getStepDuration();
    const interp =
      this.gameState === 'GAME_OVER'
        ? 1
        : Math.min(1, Math.max(0, this.stepAccumulator / stepDuration));

    const pts: GridPoint[] = this.snake.map((curr, idx) => {
      const prev = this.prevSnake[idx] ?? this.prevSnake[this.prevSnake.length - 1] ?? curr;
      // Avoid interpolating across portal wrap jumps
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        return { x: (curr.x + 0.5) * cell, y: (curr.y + 0.5) * cell };
      }
      return {
        x: (prev.x + dx * interp + 0.5) * cell,
        y: (prev.y + dy * interp + 0.5) * cell,
      };
    });

    const baseWidth = cell * 0.72;

    // Subtle shadow underneath snake
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = baseWidth;
    this.strokeSegmentedPolyline(ctx, pts, cell, 0, cell * 0.08);
    ctx.restore();

    // Main smooth body polyline (skipping portal breaks)
    ctx.save();
    ctx.strokeStyle = theme.snakePrimary;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = baseWidth;
    this.strokeSegmentedPolyline(ctx, pts, cell, 0, 0);
    ctx.restore();

    // Dorsal stripe / digestive bulge along segments
    for (let i = pts.length - 1; i >= 1; i--) {
      const p = pts[i];
      const tailRatio = i / Math.max(1, pts.length - 1);
      let radius = (baseWidth * 0.5) * (1 - tailRatio * 0.28);

      if (this.digestPos >= 0) {
        const dist = Math.abs(i - this.digestPos);
        if (dist < 1.2) {
          radius *= 1 + (1 - dist / 1.2) * 0.24;
        }
      }

      ctx.fillStyle = i % 2 === 0 ? theme.snakePrimary : theme.snakeHighlight;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.78, 0, Math.PI * 2);
      ctx.fill();
    }

    // Expressive Head
    const head = pts[0];
    const neck = pts[1] ?? head;
    let angle = 0;
    const vx = head.x - neck.x;
    const vy = head.y - neck.y;
    if (Math.hypot(vx, vy) > 0.1 && Math.hypot(vx, vy) < cell * 2.2) {
      angle = Math.atan2(vy, vx);
    } else {
      const dv = DIR_VEC[this.direction];
      angle = Math.atan2(dv.y, dv.x);
    }

    // Shield aura around head
    if (this.hasShield) {
      ctx.save();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = Math.max(2, cell * 0.07);
      ctx.globalAlpha = 0.75 + Math.sin(this.elapsedTime * 6) * 0.2;
      ctx.beginPath();
      ctx.arc(head.x, head.y, cell * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);

    const popScale = 1 + this.headPop * 0.22;
    ctx.scale(popScale, popScale * (1 - this.headPop * 0.08));

    // Flicking forked tongue when near any active token
    const nearToken = this.tokens.some((t) => {
      if (t.eliminated) return false;
      const dist = Math.hypot((t.x + 0.5) * cell - head.x, (t.y + 0.5) * cell - head.y);
      return dist < cell * 3.6;
    });
    if (nearToken && this.gameState !== 'GAME_OVER' && Math.sin(this.elapsedTime * 14) > 0.1) {
      const tongueLen = cell * (0.28 + Math.sin(this.elapsedTime * 24) * 0.06);
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = Math.max(2, cell * 0.06);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cell * 0.34, 0);
      ctx.lineTo(cell * 0.34 + tongueLen, 0);
      ctx.lineTo(cell * 0.34 + tongueLen + cell * 0.09, -cell * 0.07);
      ctx.moveTo(cell * 0.34 + tongueLen, 0);
      ctx.lineTo(cell * 0.34 + tongueLen + cell * 0.09, cell * 0.07);
      ctx.stroke();
    }

    // Rounded head capsule
    const hr = cell * 0.42;
    ctx.fillStyle = theme.snakePrimary;
    ctx.beginPath();
    ctx.ellipse(cell * 0.04, 0, hr * 1.05, hr * 0.94, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cute nostrils
    ctx.fillStyle = theme.snakeDark;
    ctx.beginPath();
    ctx.arc(hr * 0.72, -hr * 0.24, cell * 0.032, 0, Math.PI * 2);
    ctx.arc(hr * 0.72, hr * 0.24, cell * 0.032, 0, Math.PI * 2);
    ctx.fill();

    // Eyes tracking nearest token
    const eyeOffsetX = cell * 0.06;
    const eyeOffsetY = cell * 0.22;
    const eyeR = cell * 0.155;

    let lookDx = 1;
    let lookDy = 0;
    let nearestDist = Infinity;
    for (const t of this.tokens) {
      if (t.eliminated) continue;
      const tx = (t.x + 0.5) * cell - head.x;
      const ty = (t.y + 0.5) * cell - head.y;
      const d = Math.hypot(tx, ty);
      if (d < nearestDist) {
        nearestDist = d;
        // Transform world delta into head-local rotated space
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        lookDx = (tx * cos - ty * sin) / Math.max(1, d);
        lookDy = (tx * sin + ty * cos) / Math.max(1, d);
      }
    }

    for (const side of [-1, 1]) {
      const ex = eyeOffsetX;
      const ey = side * eyeOffsetY;

      // White sclera
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();

      if (this.gameState === 'GAME_OVER') {
        // Dizzy X eyes
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = Math.max(1.5, cell * 0.045);
        const xr = eyeR * 0.45;
        ctx.beginPath();
        ctx.moveTo(ex - xr, ey - xr);
        ctx.lineTo(ex + xr, ey + xr);
        ctx.moveTo(ex + xr, ey - xr);
        ctx.lineTo(ex - xr, ey + xr);
        ctx.stroke();
      } else {
        // Tracking pupil
        const pupilR = eyeR * 0.52;
        const maxShift = eyeR * 0.34;
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(ex + lookDx * maxShift, ey + lookDy * maxShift, pupilR, 0, Math.PI * 2);
        ctx.fill();

        // Catchlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(
          ex + lookDx * maxShift - pupilR * 0.25,
          ey + lookDy * maxShift - pupilR * 0.25,
          pupilR * 0.28,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private strokeSegmentedPolyline(
    ctx: CanvasRenderingContext2D,
    pts: GridPoint[],
    cell: number,
    offsetX: number,
    offsetY: number
  ): void {
    if (pts.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x + offsetX, pts[0].y + offsetY);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (Math.hypot(b.x - a.x, b.y - a.y) > cell * 2.2) {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.x + offsetX, b.y + offsetY);
      } else {
        ctx.lineTo(b.x + offsetX, b.y + offsetY);
      }
    }
    ctx.stroke();
  }
}
