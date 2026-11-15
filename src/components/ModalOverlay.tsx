import React from 'react';
import { BOARD_THEMES } from '../data/themes';
import { BoardThemeId, GameState, HudSnapshot } from '../types/game';

interface ModalOverlayProps {
  gameState: GameState;
  themeId: BoardThemeId;
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onTitleMenu: () => void;
}

const END_REASON_TEXT: Record<NonNullable<HudSnapshot['endReason']>, string> = {
  wall: 'Crashed into the orchard wall',
  self: 'Ran into your own tail',
  hearts: 'Out of hearts',
  time: 'Time is up!',
};

export const ModalOverlay: React.FC<ModalOverlayProps> = ({
  gameState,
  themeId,
  hud,
  onResume,
  onRestart,
  onTitleMenu,
}) => {
  if (gameState !== 'PAUSED' && gameState !== 'GAME_OVER') {
    return null;
  }

  const theme = BOARD_THEMES[themeId];
  const accuracy =
    hud.totalAttempts > 0 ? Math.round((hud.correctCount / hud.totalAttempts) * 100) : 0;

  const missedQuestions = hud.reviewLog.filter((entry) => !entry.wasCorrect);
  const recentCorrect = hud.reviewLog.filter((entry) => entry.wasCorrect).slice(-3);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/55">
      <div
        className="animate-pop-in w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: theme.isDarkBoard ? '#111827' : '#FFFFFF',
          borderColor: theme.isDarkBoard ? '#334155' : 'rgba(15, 23, 42, 0.14)',
          color: theme.isDarkBoard ? '#F8FAFC' : '#0F172A',
        }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: theme.hudBg, color: theme.hudText }}
        >
          <div>
            <h2 className="font-display text-2xl font-extrabold leading-tight">
              {gameState === 'PAUSED' ? 'Game Paused' : hud.endReason === 'time' ? 'Round Complete' : 'Game Over'}
            </h2>
            <p className="text-xs sm:text-sm opacity-85 mt-0.5">
              {gameState === 'PAUSED'
                ? 'Take a breather, then jump right back in.'
                : hud.endReason
                ? END_REASON_TEXT[hud.endReason]
                : 'Great effort!'}
            </p>
          </div>
          {gameState === 'GAME_OVER' && hud.score >= hud.highScore && hud.score > 0 && (
            <span
              className="font-mono-num text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
              style={{ backgroundColor: theme.accentBg, color: theme.accentText }}
            >
              New Best!
            </span>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Stats Summary Row */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className={`p-3 rounded-xl ${theme.isDarkBoard ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="text-xs opacity-70">Score</div>
              <div className="font-mono-num text-xl font-bold mt-0.5">{hud.score}</div>
            </div>
            <div className={`p-3 rounded-xl ${theme.isDarkBoard ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="text-xs opacity-70">Best</div>
              <div className="font-mono-num text-xl font-bold mt-0.5">{hud.highScore}</div>
            </div>
            <div className={`p-3 rounded-xl ${theme.isDarkBoard ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="text-xs opacity-70">Accuracy</div>
              <div className="font-mono-num text-xl font-bold mt-0.5">{accuracy}%</div>
            </div>
            <div className={`p-3 rounded-xl ${theme.isDarkBoard ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="text-xs opacity-70">Streak</div>
              <div className="font-mono-num text-xl font-bold mt-0.5">{hud.bestStreak}</div>
            </div>
          </div>

          {/* Study Review Section on Game Over */}
          {gameState === 'GAME_OVER' && (missedQuestions.length > 0 || recentCorrect.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">
                  {missedQuestions.length > 0 ? 'Study Review (Missed)' : 'Mastered Questions'}
                </h3>
                <span className="text-xs opacity-65 font-mono-num">
                  {hud.correctCount} correct
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                {(missedQuestions.length > 0 ? missedQuestions : recentCorrect).map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-sm ${
                      theme.isDarkBoard
                        ? 'bg-slate-800/70 border-slate-700'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{item.prompt}</span>
                      <span
                        className={`font-mono-num text-xs font-bold shrink-0 px-2 py-0.5 rounded-md ${
                          item.wasCorrect
                            ? 'bg-emerald-600/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {item.correctAnswer}
                      </span>
                    </div>
                    <p className="text-xs opacity-75 mt-1 leading-relaxed">{item.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            {gameState === 'PAUSED' ? (
              <button
                type="button"
                onClick={onResume}
                className="flex-1 min-h-[46px] px-5 py-2.5 rounded-xl font-display text-base font-bold cursor-pointer transition-transform active:scale-[0.99] hover:brightness-105"
                style={{ backgroundColor: theme.hudBg, color: theme.hudText }}
              >
                Resume Game
              </button>
            ) : (
              <button
                type="button"
                onClick={onRestart}
                className="flex-1 min-h-[46px] px-5 py-2.5 rounded-xl font-display text-base font-bold cursor-pointer transition-transform active:scale-[0.99] hover:brightness-105"
                style={{ backgroundColor: theme.hudBg, color: theme.hudText }}
              >
                Play Again
              </button>
            )}

            {gameState === 'PAUSED' && (
              <button
                type="button"
                onClick={onRestart}
                className={`min-h-[46px] px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-colors ${
                  theme.isDarkBoard
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                Restart
              </button>
            )}

            <button
              type="button"
              onClick={onTitleMenu}
              className={`min-h-[46px] px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-colors ${
                theme.isDarkBoard
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              Change Subject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
