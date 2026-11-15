import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { BOARD_THEMES } from '../data/themes';
import { BoardThemeId, Difficulty, GameConfig, GameRuleMode, Subject } from '../types/game';

interface TitleOverlayProps {
  config: GameConfig;
  highScore: number;
  muted: boolean;
  onChangeConfig: (next: GameConfig) => void;
  onStart: () => void;
  onToggleMute: () => void;
}

const SUBJECT_OPTIONS: { id: Subject; label: string }[] = [
  { id: 'mixed', label: 'All Subjects' },
  { id: 'math', label: 'Math' },
  { id: 'science', label: 'Science' },
  { id: 'geography', label: 'Geography' },
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'cs', label: 'CS & Logic' },
];

const DIFFICULTY_OPTIONS: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Explorer' },
  { id: 'medium', label: 'Scholar' },
  { id: 'hard', label: 'Master' },
];

const RULE_OPTIONS: { id: GameRuleMode; label: string; hint: string }[] = [
  { id: 'classic', label: 'Classic', hint: 'Walls crash' },
  { id: 'portal', label: 'Portal Walls', hint: 'Wrap edges' },
  { id: 'blitz', label: '90s Blitz', hint: 'Beat the clock' },
];

const THEME_IDS: BoardThemeId[] = ['meadow', 'ocean', 'sandstone', 'midnight'];

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  config,
  highScore,
  muted,
  onChangeConfig,
  onStart,
  onToggleMute,
}) => {
  const theme = BOARD_THEMES[config.theme];

  return (
    <aside
      aria-label="Game Setup"
      className="animate-pop-in w-full max-w-md lg:w-[410px] xl:w-[440px] shrink-0 rounded-2xl shadow-2xl border overflow-hidden"
      style={{
        backgroundColor: theme.isDarkBoard ? '#111827' : '#FFFFFF',
        borderColor: theme.isDarkBoard ? '#334155' : 'rgba(15, 23, 42, 0.14)',
        color: theme.isDarkBoard ? '#F8FAFC' : '#0F172A',
      }}
    >
      {/* Top World-Matched Frame Strip with Bespoke Inline SVG Lockup */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ backgroundColor: theme.hudBg, color: theme.hudText }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            width="42"
            height="42"
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect width="44" height="44" rx="12" fill={theme.cellLight} />
            <path
              d="M11 31C11 23 19 24 22 19C25 14 29 14 33 17"
              stroke={theme.snakePrimary}
              strokeWidth="7.5"
              strokeLinecap="round"
            />
            <circle cx="33" cy="17" r="5" fill={theme.snakePrimary} />
            <circle cx="34.5" cy="15.2" r="2" fill="#FFFFFF" />
            <circle cx="35.1" cy="15.2" r="1" fill="#0F172A" />
            <circle cx="15" cy="14" r="5" fill="#DC2626" />
            <path d="M15 9C16 7 18 6.5 19.5 7.5" stroke="#3F6212" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight leading-none">
              Scholar Snake
            </h1>
            <p className="text-xs mt-1 opacity-90">
              Slither to eat the right answer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[11px] opacity-80">Best</div>
            <div className="font-mono-num text-base font-bold leading-tight">{highScore}</div>
          </div>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
            style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="p-5 space-y-4">
        {/* Subject Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold">Subject</label>
            <span className="text-xs opacity-65">Board tokens match A · B · C · D</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {SUBJECT_OPTIONS.map((item) => {
              const active = config.subject === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeConfig({ ...config, subject: item.id })}
                  className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap truncate focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    active
                      ? 'shadow-sm'
                      : theme.isDarkBoard
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  style={
                    active
                      ? { backgroundColor: theme.hudBg, color: theme.hudText }
                      : undefined
                  }
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Difficulty</label>
          <div
            className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${
              theme.isDarkBoard ? 'bg-slate-800' : 'bg-slate-100'
            }`}
          >
            {DIFFICULTY_OPTIONS.map((item) => {
              const active = config.difficulty === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeConfig({ ...config, difficulty: item.id })}
                  className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? theme.isDarkBoard
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : theme.isDarkBoard
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Mode */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Board Mode</label>
          <div
            className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${
              theme.isDarkBoard ? 'bg-slate-800' : 'bg-slate-100'
            }`}
          >
            {RULE_OPTIONS.map((item) => {
              const active = config.ruleMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.hint}
                  onClick={() => onChangeConfig({ ...config, ruleMode: item.id })}
                  className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap truncate ${
                    active
                      ? theme.isDarkBoard
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : theme.isDarkBoard
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Board Theme Swatches */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Board Theme</label>
          <div className="grid grid-cols-4 gap-1.5">
            {THEME_IDS.map((id) => {
              const t = BOARD_THEMES[id];
              const active = config.theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChangeConfig({ ...config, theme: id })}
                  aria-label={`${t.name} theme`}
                  className={`min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'ring-2 ring-offset-1'
                      : theme.isDarkBoard
                      ? 'border-slate-700 bg-slate-800/70 text-slate-200'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                  style={
                    active
                      ? {
                          borderColor: t.hudBg,
                          boxShadow: `0 0 0 1px ${t.hudBg}`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-black/15"
                    style={{ backgroundColor: t.cellLight }}
                  />
                  <span>{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Start CTA */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onStart}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl font-display text-lg font-bold tracking-wide shadow-md transition-transform active:scale-[0.99] hover:brightness-105 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ backgroundColor: theme.hudBg, color: theme.hudText }}
          >
            Start Game
          </button>
          <p className="text-center text-xs mt-2.5 opacity-70 font-medium">
            WASD / Arrows Move · Space Boost · P / Esc Pause
          </p>
        </div>
      </div>
    </aside>
  );
};
