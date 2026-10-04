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

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="space-y-1">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          disabled={disabled}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          aria-label="Audio progress bar"
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-40"
        />
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>{timeDisplay}</span>
          {isLooping && loopStart !== null && loopEnd !== null && (
            <span className="text-amber-600 dark:text-amber-400">
              A-B Loop [{formatAudioTime(loopStart)} - {formatAudioTime(loopEnd)}]
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onJump(-5)}
            aria-label="Rewind 5s"
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-xs font-mono disabled:opacity-40"
          >
            -5s
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onJump(-2)}
            aria-label="Rewind 2s"
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-xs font-mono disabled:opacity-40"
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
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-xs font-mono disabled:opacity-40"
          >
            +2s
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onJump(5)}
            aria-label="Forward 5s"
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-xs font-mono disabled:opacity-40"
          >
            +5s
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
          {SPEED_OPTIONS.map((rate) => (
            <button
              key={rate}
              type="button"
              disabled={disabled}
              onClick={() => onRateChange(rate)}
              aria-label={`${rate}x`}
              className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                playbackRate === rate
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
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
                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            } disabled:opacity-40`}
          >
            B
          </button>
          {isLooping && (
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
