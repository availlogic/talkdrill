import { Play, Pause, X } from 'lucide-react';

export interface AudioPlayerBarProps {
  audioUrl: string | null;
  isPlaying: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onRateChange: (rate: number) => void;
  onJump: (deltaSeconds: number) => void;
  onSetLoopPoint: (point: 'A' | 'B') => void;
  onClearLoop: () => void;
}

export function formatAudioTime(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5];

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  audioUrl,
  isPlaying,
  playbackRate,
  currentTime,
  duration,
  isLooping,
  loopStart,
  loopEnd,
  onPlayPause,
  onSeek,
  onRateChange,
  onJump,
  onSetLoopPoint,
  onClearLoop,
}) => {
  const disabled = !audioUrl;
  const timeDisplay = `${formatAudioTime(currentTime)} / ${formatAudioTime(duration)}`;
  const hasLoopSelection = loopStart !== null || loopEnd !== null || isLooping;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="space-y-1">
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            disabled={disabled}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            aria-label="Audio progress bar"
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-40 relative z-0"
          />
          {duration > 0 && loopStart !== null && (
            <div
              aria-hidden="true"
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-amber-500 dark:bg-amber-400 rounded-xs pointer-events-none shadow-xs border border-white dark:border-slate-900 z-10"
              style={{ left: `${Math.min(100, Math.max(0, (loopStart / duration) * 100))}%` }}
            />
          )}
          {duration > 0 && isLooping && loopStart !== null && loopEnd !== null && loopEnd > loopStart && (
            <div
              aria-hidden="true"
              className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-amber-500/40 dark:bg-amber-400/40 rounded-lg pointer-events-none"
              style={{
                left: `${(loopStart / duration) * 100}%`,
                width: `${Math.min(100 - (loopStart / duration) * 100, ((loopEnd - loopStart) / duration) * 100)}%`,
              }}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
          <span>{timeDisplay}</span>
          {isLooping && loopStart !== null && loopEnd !== null ? (
            <span className="text-amber-700 dark:text-amber-300 font-semibold">
              A-B Loop [{formatAudioTime(loopStart)} - {formatAudioTime(loopEnd)}]
            </span>
          ) : loopStart !== null && loopEnd === null ? (
            <span className="text-amber-700 dark:text-amber-300 font-semibold">
              A: [{formatAudioTime(loopStart)}] → Set B (or clear)
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onJump(-5)}
            aria-label="Rewind 5s"
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 text-xs font-mono font-semibold disabled:opacity-40"
          >
            -5s
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onJump(-2)}
            aria-label="Rewind 2s"
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 text-xs font-mono font-semibold disabled:opacity-40"
          >
            -2s
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={onPlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/25 transition-transform active:scale-95 disabled:opacity-40"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onJump(2)}
            aria-label="Forward 2s"
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 text-xs font-mono font-semibold disabled:opacity-40"
          >
            +2s
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onJump(5)}
            aria-label="Forward 5s"
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 text-xs font-mono font-semibold disabled:opacity-40"
          >
            +5s
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 border border-slate-300/70 dark:border-slate-700 p-0.5 rounded-xl shadow-xs">
          {SPEED_OPTIONS.map((rate) => (
            <button
              key={rate}
              type="button"
              disabled={disabled}
              onClick={() => onRateChange(rate)}
              aria-label={`${rate}x`}
              className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                playbackRate === rate
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              } disabled:opacity-40`}
            >
              {rate}x
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSetLoopPoint('A')}
            aria-label="Set loop start A"
            className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-colors ${
              loopStart !== null
                ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-300'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            } disabled:opacity-40`}
          >
            A
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSetLoopPoint('B')}
            aria-label="Set loop end B"
            className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-colors ${
              loopEnd !== null
                ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-300'
                : loopStart !== null
                ? 'border-amber-400 text-amber-700 dark:text-amber-300 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            } disabled:opacity-40`}
          >
            B
          </button>
          {hasLoopSelection && (
            <button
              type="button"
              onClick={onClearLoop}
              aria-label="Clear loop"
              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
