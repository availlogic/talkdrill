import {
  type PlaybackRate,
  type LoopRegion,
  type PlayerState,
} from '../types/models';
import { audioContextManager } from '../utils/audioContextManager';

export interface IPlayerEngine {
  load(blob: Blob): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(timeSec: number): void;
  skip(deltaSec: number): void;
  setPlaybackRate(rate: PlaybackRate): void;
  setLoopRegion(startSec: number, endSec: number): void;
  clearLoopRegion(): void;
  unlockAudioContext(): Promise<boolean>;
  getState(): PlayerState;
  subscribe(listener: (state: PlayerState) => void): () => void;
  destroy(): void;
}

export class PlayerEngine implements IPlayerEngine {
  private audio: HTMLAudioElement;
  private currentBlobUrl: string | null = null;
  private loopRegion: LoopRegion | null = null;
  private playbackRate: PlaybackRate = 1.0;
  private isPlaying = false;
  private listeners: Set<(state: PlayerState) => void> = new Set();

  constructor(customAudioElement?: HTMLAudioElement) {
    this.audio = customAudioElement ?? new Audio();
    this.audio.preservesPitch = true;
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notify();
    });
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notify();
    });
    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.notify();
    });
    this.audio.addEventListener('timeupdate', () => {
      this.checkLoopBoundary();
      this.notify();
    });
  }

  checkLoopBoundary(): void {
    if (this.loopRegion && this.loopRegion.isActive) {
      if (this.audio.currentTime >= this.loopRegion.endSec) {
        this.audio.currentTime = this.loopRegion.startSec;
      }
    }
  }

  async load(blob: Blob): Promise<void> {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
    }
    this.currentBlobUrl = URL.createObjectURL(blob);
    this.audio.src = this.currentBlobUrl;
    this.audio.playbackRate = this.playbackRate;
    this.audio.preservesPitch = true;
    this.notify();
  }

  async play(): Promise<void> {
    this.isPlaying = true;
    this.notify();
    try {
      await this.unlockAudioContext();
      await this.audio.play();
    } catch (err) {
      this.isPlaying = false;
      this.notify();
      throw err;
    }
  }

  pause(): void {
    this.audio.pause();
    this.isPlaying = false;
    this.notify();
  }

  seek(timeSec: number): void {
    const clamped = Math.max(0, Math.min(timeSec, this.audio.duration || 0));
    this.audio.currentTime = clamped;
    this.notify();
  }

  skip(deltaSec: number): void {
    const target = (this.audio.currentTime || 0) + deltaSec;
    this.seek(target);
  }

  setPlaybackRate(rate: PlaybackRate): void {
    this.playbackRate = rate;
    this.audio.playbackRate = rate;
    this.audio.preservesPitch = true;
    this.notify();
  }

  setLoopRegion(startSec: number, endSec: number): void {
    const start = Math.max(0, startSec);
    const end = Math.max(start + 0.1, endSec);
    this.loopRegion = { startSec: start, endSec: end, isActive: true };
    this.notify();
  }

  clearLoopRegion(): void {
    this.loopRegion = null;
    this.notify();
  }

  async unlockAudioContext(): Promise<boolean> {
    return await audioContextManager.unlock();
  }

  getState(): PlayerState {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.audio.currentTime || 0,
      duration: this.audio.duration || 0,
      playbackRate: this.playbackRate,
      loopRegion: this.loopRegion,
      isAudioUnlocked: audioContextManager.isUnlocked(),
    };
  }

  subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  destroy(): void {
    this.pause();
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    this.listeners.clear();
  }
}

export const playerEngine = new PlayerEngine();
