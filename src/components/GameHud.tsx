import React from 'react';
import { Heart, Pause, Play, Shield, Volume2, VolumeX } from 'lucide-react';
import { BOARD_THEMES, TOKEN_STYLES } from '../data/themes';
import { BoardThemeId, GameState, HudSnapshot } from '../types/game';

interface TopHudProps {
  themeId: BoardThemeId;
  gameState: GameState;
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
}

const SUBJECT_LABELS: Record<string, string> = {
  math: 'Math',
  science: 'Science',
  geography: 'Geography',
  vocabulary: 'Vocabulary',
  cs: 'CS & Logic',
};

export const TopHud: React.FC<TopHudProps> = ({
  themeId,
  gameState,
  hud,
  muted,
  onToggleMute,
  onTogglePause,
}) => {
  const theme = BOARD_THEMES[themeId];
  const multiplier = Math.min(4, 1 + Math.floor(Math.max(0, hud.streak - 1) / 3));

  return (
    <div
      className="w-full px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 shrink-0 border-b"
      style={{
        backgroundColor: theme.hudBg,
        borderColor: theme.hudBorder,
        color: theme.hudText,
      }}
    >
      {/* Left Cluster: Hearts + Score + Streak */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        {/* Hearts */}
        <div className="flex items-center gap-1" aria-label={`Hearts: ${hud.hearts} of ${hud.maxHearts}`}>
          {Array.from({ length: hud.maxHearts }).map((_, idx) => {
            const filled = idx < hud.hearts;
            return (
              <Heart
                key={idx}
                className={`w-5 h-5 transition-transform duration-150 ${
                  filled ? 'fill-rose-500 text-rose-100 scale-100' : 'fill-black/25 text-white/25 scale-90'
                }`}
              />
            );
          })}
          {hud.hasShield && (
            <Shield
              className="w-5 h-5 ml-1 fill-sky-400 text-white"
              aria-label="Shield Active"
            />
          )}
        </div>

        {/* Score & Best */}
        <div className="flex items-baseline gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs opacity-80 hidden sm:inline">Score</span>
            <span className="font-mono-num text-lg sm:text-xl font-bold leading-none">
              {hud.score}
            </span>
          </div>
          {hud.streak >= 2 && (
            <span
              className="font-mono-num text-xs font-bold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: theme.accentBg, color: theme.accentText }}
            >
              {hud.streak} streak{multiplier > 1 ? ` · ${multiplier}×` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Center Cluster: Active Educational Question Prompt */}
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center px-2">
        {hud.currentQuestion ? (
          <>
            <div className="text-[11px] sm:text-xs font-semibold tracking-wide opacity-80 leading-none mb-1">
              {SUBJECT_LABELS[hud.currentQuestion.subject]} · Level {hud.level}
              {hud.feedback ? (
                <span
                  className={`ml-2 font-bold ${
                    hud.feedback.tone === 'wrong'
                      ? 'text-rose-200'
                      : hud.feedback.tone === 'bonus' || hud.feedback.tone === 'level'
                      ? 'text-amber-200'
                      : 'text-emerald-200'
                  }`}
                >
                  — {hud.feedback.text}
                </span>
              ) : null}
            </div>
            <div className="font-display text-base sm:text-xl md:text-2xl font-bold leading-tight truncate max-w-full">
              {hud.currentQuestion.prompt}
            </div>
          </>
        ) : (
          <div className="font-display text-base sm:text-lg font-bold opacity-90">
            Scholar Snake
          </div>
        )}
      </div>

      {/* Right Cluster: Timer (Blitz), Level/Best, Mute, Pause */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {hud.timeLeftSeconds !== null && (
          <div
            className={`font-mono-num text-sm sm:text-base font-bold px-2.5 py-1 rounded-lg ${
              hud.timeLeftSeconds <= 15 ? 'bg-rose-600 text-white' : 'bg-black/25 text-white'
            }`}
          >
            {Math.ceil(hud.timeLeftSeconds)}s
          </div>
        )}

        <div className="hidden md:flex items-baseline gap-1.5 text-xs opacity-85 mr-1">
          <span>Best</span>
          <span className="font-mono-num font-bold text-sm">{hud.highScore}</span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-black/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          style={{ backgroundColor: 'rgba(0,0,0,0.16)' }}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {gameState === 'PLAYING' || gameState === 'PAUSED' ? (
          <button
            type="button"
            onClick={onTogglePause}
            aria-label={gameState === 'PAUSED' ? 'Resume game' : 'Pause game'}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-black/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
            style={{ backgroundColor: 'rgba(0,0,0,0.16)' }}
          >
            {gameState === 'PAUSED' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        ) : null}
      </div>
    </div>
  );
};

interface BottomLegendProps {
  themeId: BoardThemeId;
  hud: HudSnapshot;
}

export const BottomChoiceLegend: React.FC<BottomLegendProps> = ({ themeId, hud }) => {
  const theme = BOARD_THEMES[themeId];

  if (!hud.currentQuestion || hud.choices.length === 0) {
    return (
      <div
        className="w-full px-4 py-2.5 text-center text-xs sm:text-sm font-medium shrink-0"
        style={{ backgroundColor: theme.hudBg, color: theme.hudMuted }}
      >
        WASD / Arrow Keys Move · Hold Space to Boost · Esc Pause
      </div>
    );
  }

  return (
    <div
      className="w-full px-2.5 sm:px-4 py-2 shrink-0 border-t"
      style={{
        backgroundColor: theme.hudBg,
        borderColor: theme.hudBorder,
        color: theme.hudText,
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-4xl mx-auto">
        {hud.choices.map((choice) => {
          const tokenStyle = TOKEN_STYLES[choice.letter];
          return (
            <div
              key={choice.letter}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-opacity duration-150 ${
                choice.eliminated ? 'opacity-30 line-through' : 'opacity-100'
              }`}
              style={{ backgroundColor: theme.choiceBg }}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center font-mono-num text-sm font-bold text-white shrink-0 border border-white/75 shadow-sm"
                style={{ backgroundColor: tokenStyle.fill }}
              >
                {choice.letter}
              </span>
              <span className="text-sm sm:text-base font-semibold truncate text-white">
                {choice.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
