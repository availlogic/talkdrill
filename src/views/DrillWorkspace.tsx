import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Printer, Eye, EyeOff, Award, SlidersHorizontal, Edit3, Archive, ArchiveRestore } from 'lucide-react';
import { corpusService } from '../services/corpusService';
import { drillCounterService } from '../services/drillCounterService';
import { audioService } from '../services/audioService';
import { playerEngine } from '../services/playerEngine';
import { ZhengMatrix } from '../components/ZhengMatrix';
import { BigDrillCapsule } from '../components/BigDrillCapsule';
import { AudioPlayerBar } from '../components/AudioPlayerBar';
import { NumericOverrideModal } from '../components/NumericOverrideModal';
import { PrintExportModal } from '../views/PrintExportModal';
import { type Article, type MilestoneResult, type PlayerState } from '../types/models';

export interface DrillWorkspaceProps {
  articleId: string;
  onBack: () => void;
  onEdit?: () => void;
}

export const DrillWorkspace: React.FC<DrillWorkspaceProps> = ({ articleId, onBack, onEdit }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [currentCount, setCurrentCount] = useState(0);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState<MilestoneResult | null>(null);

  // Audio player state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const loopStartRef = useRef<number | null>(null);
  const loopEndRef = useRef<number | null>(null);

  const resetLoopState = useCallback(() => {
    loopStartRef.current = null;
    loopEndRef.current = null;
    setLoopStart(null);
    setLoopEnd(null);
    setIsLooping(false);
    playerEngine.clearLoopRegion();
  }, []);

  const handlePlayerStateUpdate = useCallback((state: PlayerState) => {
    setIsPlaying(state.isPlaying);
    setCurrentTime(state.currentTime);
    setDuration(state.duration);
    setPlaybackRate(state.playbackRate);
    setIsLooping(state.loopRegion?.isActive ?? false);
    if (state.loopRegion) {
      loopStartRef.current = state.loopRegion.startSec;
      loopEndRef.current = state.loopRegion.endSec;
      setLoopStart(state.loopRegion.startSec);
      setLoopEnd(state.loopRegion.endSec);
    } else {
      setLoopStart(loopStartRef.current);
      setLoopEnd(loopEndRef.current);
    }
  }, []);

  // Load article, count and audio
  useEffect(() => {
    let unmounted = false;
    resetLoopState();

    corpusService.getArticle(articleId).then((art) => {
      if (!unmounted && art) {
        setArticle(art);
        drillCounterService.loadArticle(art.id).then((c) => {
          if (!unmounted) setCurrentCount(c);
        });
      }
    });

    const unsubPlayer = playerEngine.subscribe((state) => {
      if (!unmounted) handlePlayerStateUpdate(state);
    });

    audioService.getAudioByArticleId(articleId).then((item) => {
      if (!unmounted && item) {
        playerEngine.load(item.blob).then(() => {
          if (!unmounted) setAudioUrl('loaded');
        });
      }
    });

    const unsubMilestone = drillCounterService.onMilestone((res) => {
      if (!unmounted && res.hasReached) {
        setActiveMilestone(res);
        setTimeout(() => setActiveMilestone(null), 4000);
      }
    });

    return () => {
      unmounted = true;
      unsubPlayer();
      unsubMilestone();
      drillCounterService.flushPendingSaves();
      playerEngine.destroy();
    };
  }, [articleId, handlePlayerStateUpdate, resetLoopState]);

  const handleIncrement = useCallback(() => {
    const next = drillCounterService.increment(articleId);
    setCurrentCount(next);
  }, [articleId]);

  const handleUndo = useCallback(() => {
    const next = drillCounterService.undo(articleId);
    setCurrentCount(next);
  }, [articleId]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOverrideModalOpen || isPrintModalOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleIncrement();
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        handleUndo();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        playerEngine.seek(loopStart ?? 0);
        playerEngine.play();
        setIsPlaying(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleIncrement, handleUndo, isOverrideModalOpen, isPrintModalOpen, loopStart]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      playerEngine.pause();
      setIsPlaying(false);
    } else {
      playerEngine.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((t: number) => {
    playerEngine.seek(t);
    setCurrentTime(t);
  }, []);

  const handleRateChange = useCallback((r: number) => {
    playerEngine.setPlaybackRate(r as 0.5 | 0.75 | 1.0 | 1.25 | 1.5);
  }, []);

  const handleJump = useCallback((delta: number) => {
    playerEngine.skip(delta);
  }, []);

  const handleSetLoopPoint = useCallback((pt: 'A' | 'B') => {
    if (pt === 'A') {
      loopStartRef.current = currentTime;
      setLoopStart(currentTime);
      if (loopEndRef.current !== null) {
        const start = Math.min(currentTime, loopEndRef.current);
        const end = Math.max(currentTime + 0.1, loopEndRef.current);
        loopStartRef.current = start;
        loopEndRef.current = end;
        setLoopStart(start);
        setLoopEnd(end);
        playerEngine.setLoopRegion(start, end);
        setIsLooping(true);
      }
    } else {
      const currentStart = loopStartRef.current;
      if (currentStart !== null) {
        const start = Math.min(currentStart, currentTime);
        const end = Math.max(currentStart + 0.1, currentTime);
        loopStartRef.current = start;
        loopEndRef.current = end;
        setLoopStart(start);
        setLoopEnd(end);
        playerEngine.setLoopRegion(start, end);
        setIsLooping(true);
      } else {
        loopEndRef.current = currentTime;
        setLoopEnd(currentTime);
      }
    }
  }, [currentTime]);

  const handleClearLoop = useCallback(() => {
    resetLoopState();
  }, [resetLoopState]);

  const renderAudioPlayerBar = () => {
    if (!audioUrl) return null;
    return (
      <AudioPlayerBar
        audioUrl={audioUrl}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        currentTime={currentTime}
        duration={duration}
        isLooping={isLooping}
        loopStart={loopStart}
        loopEnd={loopEnd}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onRateChange={handleRateChange}
        onJump={handleJump}
        onSetLoopPoint={handleSetLoopPoint}
        onClearLoop={handleClearLoop}
      />
    );
  };

  if (!article) {
    return <div className="p-8 text-center text-slate-500">Loading workspace...</div>;
  }

  const handleManualOverrideConfirm = (count: number) => {
    const updated = drillCounterService.manualSet(articleId, count);
    setCurrentCount(updated);
    setIsOverrideModalOpen(false);
  };

  const handleToggleArchive = async () => {
    if (!article) return;
    const nextArchived = !article.isArchived;
    const updated = await corpusService.updateArticle(articleId, { isArchived: nextArchived });
    setArticle(updated);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isZenMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/50 dark:bg-slate-950'}`}>
      {/* Top Header */}
      {!isZenMode && (
        <header className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Library"
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                {article.title}
              </h2>
              <span className="text-[10px] font-mono text-slate-500">{article.targetLang}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit Drill"
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleArchive}
              aria-label={article.isArchived ? 'Restore Drill' : 'Archive Drill'}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
            >
              {article.isArchived ? (
                <>
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Restore</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Archive</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsZenMode(true)}
              aria-label="Focus Mode"
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              aria-label="Print Worksheet"
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOverrideModalOpen(true)}
              aria-label="Adjust Repetition Count"
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center gap-1.5 font-mono"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{currentCount} reps</span>
            </button>
          </div>
        </header>
      )}

      {/* Zen Mode Exit Button */}
      {isZenMode && (
        <div className="absolute top-4 right-4 z-30">
          <button
            type="button"
            onClick={() => setIsZenMode(false)}
            aria-label="Exit Focus"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Exit Focus</span>
          </button>
        </div>
      )}

      {/* Milestone Celebration Banner */}
      {activeMilestone && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 shadow-md flex items-center justify-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <Award className="w-5 h-5 animate-bounce" />
          <span>Milestone reached: {activeMilestone.milestone} reps! [{activeMilestone.title}] - {activeMilestone.description}</span>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col justify-between space-y-6">
        {/* Foreign Target Corpus Display */}
        <section className="flex-1 flex flex-col justify-center items-center text-center p-6 sm:p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <p className="text-2xl sm:text-4xl font-serif font-medium leading-relaxed sm:leading-loose text-slate-900 dark:text-slate-50 tracking-wide select-none whitespace-pre-wrap break-words">
            {article.targetText}
          </p>
          {article.sourceText && !isZenMode && (
            <p className="text-sm sm:text-base text-slate-400 dark:text-slate-500 mt-4 font-sans max-w-xl whitespace-pre-wrap break-words">
              {article.sourceText}
            </p>
          )}
        </section>

        {/* Audio Player in Non-Focus Mode (between Corpus Display and Tally Progress Board) */}
        {!isZenMode && renderAudioPlayerBar()}

        {/* Zheng Matrix live drawing */}
        {!isZenMode && (
          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono px-1">
              <span>Tally Progress Board</span>
              <span>Target: {article.targetCount} reps</span>
            </div>
            <ZhengMatrix
              count={currentCount}
              targetCount={article.targetCount}
              onBoxClick={() => setIsOverrideModalOpen(true)}
            />
          </section>
        )}

        {/* Bottom Bar: Player (Focus Mode only) and Giant Drill Capsule */}
        <section className="space-y-4 pt-2">
          {isZenMode && renderAudioPlayerBar()}

          <BigDrillCapsule
            currentCount={currentCount}
            onIncrement={handleIncrement}
            onUndo={handleUndo}
          />
        </section>
      </main>

      {/* Modals */}
      <NumericOverrideModal
        isOpen={isOverrideModalOpen}
        initialValue={currentCount}
        onConfirm={handleManualOverrideConfirm}
        onClose={() => setIsOverrideModalOpen(false)}
      />

      <PrintExportModal
        article={article}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};
