import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export interface NumericOverrideModalProps {
  isOpen: boolean;
  initialValue: number;
  onConfirm: (count: number) => void;
  onClose: () => void;
}

export const NumericOverrideModal: React.FC<NumericOverrideModalProps> = ({
  isOpen,
  initialValue,
  onConfirm,
  onClose,
}) => {
  const [value, setValue] = useState(String(initialValue));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(String(initialValue));
      setError(null);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleApplyPreset = (delta: number) => {
    const current = parseInt(value, 10) || 0;
    const next = Math.max(0, Math.min(99999, current + delta));
    setValue(String(next));
    setError(null);
  };

  const handleResetToZero = () => {
    setValue('0');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(value.trim(), 10);
    if (isNaN(num) || num < 0 || num > 99999 || String(num) !== value.trim()) {
      setError('Please enter a valid integer between 0 and 99999');
      return;
    }
    onConfirm(num);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="override-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h3 id="override-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Adjust Repetition Count
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <input
              type="number"
              min="0"
              max="99999"
              step="1"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              className="w-full text-center text-3xl font-mono font-bold py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && (
              <p className="mt-1.5 text-xs text-rose-500 text-center font-medium">{error}</p>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset(10)}
              className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              +10
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(50)}
              className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              +50
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(100)}
              className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              +100
            </button>
            <button
              type="button"
              onClick={handleResetToZero}
              className="py-1.5 px-2 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
