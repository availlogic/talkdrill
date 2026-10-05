import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

export interface DrillShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dictHotkeyLabel?: string;
}

interface ShortcutItem {
  keys: string[];
  action: string;
}

interface ShortcutGroupProps {
  title: string;
  items: ShortcutItem[];
}

const KeyBadge: React.FC<{ keyName: string }> = ({ keyName }) => (
  <kbd className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs font-semibold shadow-xs">
    {keyName}
  </kbd>
);

const ShortcutRow: React.FC<{ item: ShortcutItem }> = ({ item }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 text-xs">
    <span className="text-slate-600 dark:text-slate-300">{item.action}</span>
    <div className="flex items-center gap-1">
      {item.keys.map((k, idx) => (
        <React.Fragment key={k}>
          {idx > 0 && <span className="text-slate-400 text-[10px]">+</span>}
          <KeyBadge keyName={k} />
        </React.Fragment>
      ))}
    </div>
  </div>
);

const ShortcutGroup: React.FC<ShortcutGroupProps> = ({ title, items }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50">
    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
      {title}
    </h4>
    <div className="space-y-0.5">
      {items.map((item) => (
        <ShortcutRow key={item.action} item={item} />
      ))}
    </div>
  </div>
);

export const DrillShortcutsModal: React.FC<DrillShortcutsModalProps> = ({
  isOpen,
  onClose,
  dictHotkeyLabel = 'Option / Alt',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections = [
    {
      title: 'Drill Counter',
      items: [
        { keys: ['Space'], action: 'Drill +1 rep' },
        { keys: ['Z'], action: 'Undo last rep' },
        { keys: ['F'], action: 'Toggle Focus mode' },
      ],
    },
    {
      title: 'Audio Controls',
      items: [
        { keys: ['P'], action: 'Play / Resume audio' },
        { keys: ['S'], action: 'Pause audio (when playing)' },
      ],
    },
    {
      title: 'Dictionary Lookup',
      items: [
        { keys: ['Select text', dictHotkeyLabel], action: 'Look up selected word' },
        { keys: ['Esc'], action: 'Close lookup popover' },
      ],
    },
    {
      title: 'Navigation',
      items: [
        { keys: ['?'], action: 'Open shortcuts cheatsheet' },
        { keys: ['Esc'], action: 'Close cheatsheet' },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div
        data-testid="shortcuts-modal-backdrop"
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 id="shortcuts-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-slate-500">Fast hands-on-keys practice controls</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sections.map((sec) => (
            <ShortcutGroup key={sec.title} title={sec.title} items={sec.items} />
          ))}
        </div>
      </div>
    </div>
  );
};
