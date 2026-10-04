import React, { useState } from 'react';
import { Printer, Copy, Check, X } from 'lucide-react';
import { type Article } from '../types/models';
import { printExportService } from '../services/printExportService';

export interface PrintExportModalProps {
  article: Article;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintExportModal: React.FC<PrintExportModalProps> = ({
  article,
  isOpen,
  onClose,
}) => {
  const [tallyBoxes, setTallyBoxes] = useState<60 | 100>(100);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMarkdown = async () => {
    const md = printExportService.generateMarkdown(article, { tallyBoxes });
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const boxIndices = Array.from({ length: tallyBoxes }, (_, i) => i);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 id="print-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Print Worksheet & Tally Sheet Export
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

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tally Boxes:</span>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                aria-pressed={tallyBoxes === 60}
                onClick={() => setTallyBoxes(60)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  tallyBoxes === 60
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                60 Boxes (300 reps)
              </button>
              <button
                type="button"
                aria-pressed={tallyBoxes === 100}
                onClick={() => setTallyBoxes(100)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  tallyBoxes === 100
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                100 Boxes (500 reps)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-xl flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Worksheet</span>
            </button>
          </div>
        </div>

        {/* Paper Sheet Preview Area */}
        <div className="printable-sheet p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 font-serif space-y-4 max-h-[420px] overflow-y-auto">
          <div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">{article.title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">Target: {tallyBoxes * 5} reps shadowing drill</p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 print:border-none print:p-0">
            <p className="print-drill-text text-lg leading-relaxed text-slate-900 dark:text-slate-100">
              {article.targetText}
            </p>
          </div>

          <div>
            <h5 className="text-xs font-sans font-semibold text-slate-500 mb-2">
              Tally Sheet ({tallyBoxes} boxes, 5 reps per box):
            </h5>
            <div className="print-tally-grid grid grid-cols-10 gap-1.5">
              {boxIndices.map((i) => (
                <div
                  key={i}
                  className="print-tally-box aspect-square border border-dashed border-slate-300 dark:border-slate-700 rounded flex items-center justify-center text-[10px] text-slate-400 font-mono"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
