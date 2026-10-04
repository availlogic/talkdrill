import React, { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, HardDrive, Sparkles } from 'lucide-react';
import { corpusService } from '../services/corpusService';
import { checkStorageCapacity } from '../utils/storageQuota';
import { type Article } from '../types/models';

export interface LibraryOverviewProps {
  onSelectArticle: (id: string) => void;
  onNewArticle: () => void;
  onOpenSettings: () => void;
}

export const LibraryOverview: React.FC<LibraryOverviewProps> = ({
  onSelectArticle,
  onNewArticle,
  onOpenSettings,
}) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [storageInfo, setStorageInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const list = await corpusService.listArticles(showArchived);
    setArticles(list);
    const cap = await checkStorageCapacity();
    setStorageInfo(`${(cap.usageBytes / (1024 * 1024)).toFixed(1)} MB / ${(cap.quotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [showArchived]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this drill? All audio and repetition history will be permanently removed.')) {
      await corpusService.deleteArticle(id);
      loadData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
            T
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              TalkDrill
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 font-mono font-medium">
                Offline Shadowing
              </span>
            </h1>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Muscle Memory 300-500 Reps Overlearning Trainer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {storageInfo && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 font-mono font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-3 rounded-xl shadow-xs">
              <HardDrive className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{storageInfo}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onNewArticle}
            aria-label="New Drill"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Drill</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-200/70 dark:bg-slate-800/90 border border-slate-300/70 dark:border-slate-700 p-0.5 rounded-xl shadow-xs">
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              !showArchived
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              showArchived
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Cards List or Empty State */}
      {articles.length === 0 && !loading ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 rounded-2xl space-y-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Shadowing Drills Yet</h3>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 max-w-sm mx-auto mt-1">
              Import foreign text or draft ideas, and generate spoken native audio for muscle memory overlearning.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewArticle}
            aria-label="Create First Drill"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Drill</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((art) => {
            const progress = Math.min(100, Math.round((art.currentCount / art.targetCount) * 100));
            return (
              <div
                key={art.id}
                onClick={() => onSelectArticle(art.id)}
                className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 font-semibold">
                      {art.targetLang}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {art.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, art.id)}
                    aria-label={`Delete ${art.title}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {art.targetText}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
                    <span>{progress}%</span>
                    <span>{art.currentCount} / {art.targetCount} reps</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
