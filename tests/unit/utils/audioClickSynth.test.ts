import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playMechanicalClick, setAudioContextFactory } from '../../../src/utils/audioClickSynth';

describe('audioClickSynth', () => {
  let mockContext: {
    state: string;
    currentTime: number;
    createOscillator: ReturnType<typeof vi.fn>;
    createGain: ReturnType<typeof vi.fn>;
    destination: object;
    resume: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockContext = {
      state: 'running',
      currentTime: 10,
      createOscillator: vi.fn().mockReturnValue({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }),
      createGain: vi.fn().mockReturnValue({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      }),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
    };

    setAudioContextFactory(() => mockContext as unknown as AudioContext);
  });

  it('triggers an acoustic click oscillator and gain decay', () => {
    playMechanicalClick();
    expect(mockContext.createOscillator).toHaveBeenCalledOnce();
    expect(mockContext.createGain).toHaveBeenCalledOnce();
  });
});
