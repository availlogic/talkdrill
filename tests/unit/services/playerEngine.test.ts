import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerEngine } from '../../../src/services/playerEngine';

describe('PlayerEngine (TDD)', () => {
  let player: PlayerEngine;
  let mockAudio: {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    currentTime: number;
    duration: number;
    playbackRate: number;
    preservesPitch: boolean;
    src: string;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      currentTime: 0,
      duration: 10,
      playbackRate: 1.0,
      preservesPitch: true,
      src: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    player = new PlayerEngine(mockAudio as unknown as HTMLAudioElement);
  });

  it('initializes with default player state', () => {
    const state = player.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.playbackRate).toBe(1.0);
    expect(state.loopRegion).toBeNull();
  });

  it('sets playback rate with pitch preservation', () => {
    player.setPlaybackRate(1.25);
    expect(mockAudio.playbackRate).toBe(1.25);
    expect(mockAudio.preservesPitch).toBe(true);
    expect(player.getState().playbackRate).toBe(1.25);
  });

  it('manages A-B loop regions properly', () => {
    player.setLoopRegion(1.5, 4.0);
    expect(player.getState().loopRegion).toEqual({
      startSec: 1.5,
      endSec: 4.0,
      isActive: true,
    });

    // Test loop wrap around
    mockAudio.currentTime = 4.2;
    player.checkLoopBoundary();
    expect(mockAudio.currentTime).toBe(1.5);

    player.clearLoopRegion();
    expect(player.getState().loopRegion).toBeNull();
  });

  it('handles skip relative steps forward and backward', () => {
    mockAudio.currentTime = 5.0;
    player.skip(2);
    expect(mockAudio.currentTime).toBe(7.0);

    player.skip(-5);
    expect(mockAudio.currentTime).toBe(2.0);

    // Negative bound clamping
    player.skip(-10);
    expect(mockAudio.currentTime).toBe(0);
  });

  it('revokes previous Blob URL when loading new audio and on destroy', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const fakeBlob1 = new Blob(['1']);
    const fakeBlob2 = new Blob(['2']);

    await player.load(fakeBlob1);
    await player.load(fakeBlob2);
    expect(revokeSpy).toHaveBeenCalled();

    player.destroy();
    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it('notifies subscribers on state changes and pauses', async () => {
    const subscriber = vi.fn();
    const unsubscribe = player.subscribe(subscriber);

    player.pause();
    expect(mockAudio.pause).toHaveBeenCalled();
    expect(subscriber).toHaveBeenCalled();

    subscriber.mockClear();
    unsubscribe();
    player.pause();
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('calls play and unlocks context', async () => {
    await player.play();
    expect(mockAudio.play).toHaveBeenCalled();
  });
});
