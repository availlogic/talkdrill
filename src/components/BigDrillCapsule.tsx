import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface BigDrillCapsuleProps {
  currentCount: number;
  onIncrement: () => void;
  onUndo: () => void;
  disabled?: boolean;
}

export const BigDrillCapsule: React.FC<BigDrillCapsuleProps> = ({
  currentCount,
  onIncrement,
  onUndo,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-2 w-full max-w-md mx-auto min-h-[58px] touch-manipulation">
      <button
        type="button"
        onClick={onUndo}
        disabled={disabled}
        aria-label="Undo last count"
        className="h-14 sm:h-16 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
      >
        <RotateCcw className="w-5 h-5 mr-1" />
        <span className="text-sm">-1</span>
      </button>

      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        aria-label="Drill +1"
        className="flex-1 h-14 sm:h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold flex items-center justify-between px-6 shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg tracking-wide">Drill</span>
          <span className="text-xs bg-blue-500/50 py-0.5 px-2 rounded-full font-mono hidden sm:inline-block">
            Space
          </span>
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl font-bold font-mono">{currentCount}</span>
          <span className="text-xs opacity-80">reps (+1)</span>
        </div>
      </button>
    </div>
  );
};
