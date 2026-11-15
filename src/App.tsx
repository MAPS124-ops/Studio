import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { BottomChoiceLegend, TopHud } from './components/GameHud';
import { ModalOverlay } from './components/ModalOverlay';
import { SnakeCanvas } from './components/SnakeCanvas';
import { TitleOverlay } from './components/TitleOverlay';
import { BOARD_THEMES } from './data/themes';
import { SnakeEngine } from './engine/snakeEngine';
import { Direction, GameConfig, GameState, HudSnapshot } from './types/game';
import { soundFx } from './utils/sound';

const INITIAL_CONFIG: GameConfig = {
  subject: 'mixed',
  difficulty: 'medium',
  ruleMode: 'classic',
  theme: 'meadow',
};

const EMPTY_HUD: HudSnapshot = {
  score: 0,
  highScore: 0,
  hearts: 3,
  maxHearts: 3,
  streak: 0,
  bestStreak: 0,
  level: 1,
  correctCount: 0,
  totalAttempts: 0,
  hasShield: false,
  timeLeftSeconds: null,
  currentQuestion: null,
  choices: [],
  feedback: null,
  reviewLog: [],
  endReason: null,
};

export default function App() {
  const [config, setConfig] = useState<GameConfig>(INITIAL_CONFIG);
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [muted, setMuted] = useState<boolean>(false);

  const engineRef = useRef<SnakeEngine | null>(null);
  const gameStateRef = useRef<GameState>('TITLE_MENU');
  const configRef = useRef<GameConfig>(INITIAL_CONFIG);

  if (!engineRef.current) {
    engineRef.current = new SnakeEngine(
      INITIAL_CONFIG,
      (snapshot) => setHud(snapshot),
      (nextState) => {
        gameStateRef.current = nextState;
        setGameState(nextState);
      }
    );
  }

  useEffect(() => {
    setHud(engineRef.current!.getHudSnapshot());
  }, []);

  const handleConfigChange = useCallback((next: GameConfig) => {
    configRef.current = next;
    setConfig(next);
    engineRef.current?.updateConfig(next);
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startNewGame(configRef.current);
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundFx.toggleMute();
    setMuted(nextMuted);
  }, []);

  const handleDirection = useCallback((dir: Direction) => {
    engineRef.current?.queueTurn(dir);
  }, []);

  // Keyboard controls: buffered directional turns, held Space/Shift boost, Esc/P pause, Enter start
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      const key = e.key;

      if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight' || key === ' ') {
        if (state === 'PLAYING') {
          e.preventDefault();
        }
      }

      if (state === 'TITLE_MENU') {
        if (key === 'Enter' || (key === ' ' && document.activeElement === document.body)) {
          e.preventDefault();
          engineRef.current?.startNewGame(configRef.current);
        }
        return;
      }

      if (key === 'Escape' || key === 'p' || key === 'P') {
        if (state === 'PLAYING' || state === 'PAUSED') {
          e.preventDefault();
          engineRef.current?.togglePause();
        }
        return;
      }

      if (state === 'GAME_OVER' && key === 'Enter' && document.activeElement === document.body) {
        e.preventDefault();
        engineRef.current?.startNewGame(configRef.current);
        return;
      }

      if (state !== 'PLAYING') return;

      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        engineRef.current?.queueTurn('UP');
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        engineRef.current?.queueTurn('DOWN');
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        engineRef.current?.queueTurn('LEFT');
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        engineRef.current?.queueTurn('RIGHT');
      } else if (key === ' ' || key === 'Shift') {
        engineRef.current?.setBoost(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Shift') {
        engineRef.current?.setBoost(false);
      }
    };

    const onBlur = () => {
      engineRef.current?.setBoost(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const theme = BOARD_THEMES[config.theme];

  return (
    <main
      className="relative h-dvh w-screen overflow-hidden select-none flex flex-col"
      style={{ backgroundColor: theme.outerBg }}
    >
      {/* Top Integrated HUD Bar (Outside active grid) */}
      {gameState !== 'TITLE_MENU' && (
        <TopHud
          themeId={config.theme}
          gameState={gameState}
          hud={hud}
          muted={muted}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
        />
      )}

      {/* Main Playfield + Desktop Title Side Panel */}
      <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 px-2 sm:px-4">
        <div className="flex-1 w-full h-full min-h-0 flex flex-col items-center justify-center">
          <SnakeCanvas engineRef={engineRef} borderColor={theme.boardFrame} />
        </div>

        {gameState === 'TITLE_MENU' && (
          <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/45 lg:static lg:inset-auto lg:bg-transparent lg:p-0 lg:pr-4">
            <TitleOverlay
              config={config}
              highScore={hud.highScore}
              muted={muted}
              onChangeConfig={handleConfigChange}
              onStart={handleStart}
              onToggleMute={handleToggleMute}
            />
          </div>
        )}
      </div>

      {/* Bottom Choice Legend Bar (Outside active grid) */}
      {gameState !== 'TITLE_MENU' && (
        <BottomChoiceLegend themeId={config.theme} hud={hud} />
      )}

      {/* Compact Touch D-Pad on small mobile screens during active play */}
      {gameState === 'PLAYING' && (
        <div
          className="sm:hidden pb-2 pt-1 flex items-center justify-center gap-2 shrink-0"
          style={{ backgroundColor: theme.hudBg }}
        >
          <button
            type="button"
            aria-label="Turn Left"
            onClick={() => handleDirection('LEFT')}
            className="w-12 h-11 rounded-xl bg-black/25 text-white flex items-center justify-center active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              aria-label="Turn Up"
              onClick={() => handleDirection('UP')}
              className="w-12 h-11 rounded-xl bg-black/25 text-white flex items-center justify-center active:scale-95"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <button
              type="button"
              aria-label="Turn Down"
              onClick={() => handleDirection('DOWN')}
              className="w-12 h-11 rounded-xl bg-black/25 text-white flex items-center justify-center active:scale-95"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>
          <button
            type="button"
            aria-label="Turn Right"
            onClick={() => handleDirection('RIGHT')}
            className="w-12 h-11 rounded-xl bg-black/25 text-white flex items-center justify-center active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Pause & Game Over Modals */}
      <ModalOverlay
        gameState={gameState}
        themeId={config.theme}
        hud={hud}
        onResume={handleTogglePause}
        onRestart={handleStart}
        onTitleMenu={handleReturnToTitle}
      />
    </main>
  );
}
