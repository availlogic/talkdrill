import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audioContextManager } from '../../../src/utils/audioContextManager';

describe('audioContextManager (TDD)', () => {
  beforeEach(() => {
    audioContextManager.resetForTesting();
  });

  it('reports initial unlocked state as false', () => {
    expect(audioContextManager.isUnlocked()).toBe(false);
  });

  it('unlocks on user gesture event', async () => {
    const mockContext = {
      state: 'suspended',
      resume: vi.fn().mockResolvedValue(undefined),
    };

    audioContextManager.setContext(mockContext as unknown as AudioContext);
    const success = await audioContextManager.unlock();

    expect(success).toBe(true);
    expect(audioContextManager.isUnlocked()).toBe(true);
    expect(mockContext.resume).toHaveBeenCalledOnce();
  });
});
