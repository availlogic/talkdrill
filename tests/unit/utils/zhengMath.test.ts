import { describe, it, expect } from 'vitest';
import { calculateZhengStrokes, checkMilestone } from '../../../src/utils/zhengMath';

describe('zhengMath - calculateZhengStrokes', () => {
  it('handles zero count correctly', () => {
    const result = calculateZhengStrokes(0);
    expect(result).toEqual({
      fullZhengCount: 0,
      partialStrokes: 0,
      totalCount: 0,
    });
  });

  it('clamps negative numbers to zero', () => {
    const result = calculateZhengStrokes(-5);
    expect(result).toEqual({
      fullZhengCount: 0,
      partialStrokes: 0,
      totalCount: 0,
    });
  });

  it('handles partial strokes between 1 and 4', () => {
    expect(calculateZhengStrokes(1)).toEqual({
      fullZhengCount: 0,
      partialStrokes: 1,
      totalCount: 1,
    });
    expect(calculateZhengStrokes(2)).toEqual({
      fullZhengCount: 0,
      partialStrokes: 2,
      totalCount: 2,
    });
    expect(calculateZhengStrokes(3)).toEqual({
      fullZhengCount: 0,
      partialStrokes: 3,
      totalCount: 3,
    });
    expect(calculateZhengStrokes(4)).toEqual({
      fullZhengCount: 0,
      partialStrokes: 4,
      totalCount: 4,
    });
  });

  it('handles full Zheng characters at multiples of 5', () => {
    expect(calculateZhengStrokes(5)).toEqual({
      fullZhengCount: 1,
      partialStrokes: 0,
      totalCount: 5,
    });
    expect(calculateZhengStrokes(25)).toEqual({
      fullZhengCount: 5,
      partialStrokes: 0,
      totalCount: 25,
    });
    expect(calculateZhengStrokes(500)).toEqual({
      fullZhengCount: 100,
      partialStrokes: 0,
      totalCount: 500,
    });
  });

  it('handles combination of full Zheng characters and partial strokes', () => {
    expect(calculateZhengStrokes(13)).toEqual({
      fullZhengCount: 2,
      partialStrokes: 3,
      totalCount: 13,
    });
    expect(calculateZhengStrokes(342)).toEqual({
      fullZhengCount: 68,
      partialStrokes: 2,
      totalCount: 342,
    });
  });
});

describe('zhengMath - checkMilestone', () => {
  it('returns hasReached false when count does not change or decreases', () => {
    expect(checkMilestone(10, 10)).toEqual({ hasReached: false });
    expect(checkMilestone(10, 9)).toEqual({ hasReached: false });
    expect(checkMilestone(50, 50)).toEqual({ hasReached: false });
    expect(checkMilestone(51, 50)).toEqual({ hasReached: false });
  });

  it('returns hasReached false when count increases without crossing milestone', () => {
    expect(checkMilestone(10, 11)).toEqual({ hasReached: false });
    expect(checkMilestone(48, 49)).toEqual({ hasReached: false });
    expect(checkMilestone(50, 51)).toEqual({ hasReached: false });
    expect(checkMilestone(600, 601)).toEqual({ hasReached: false });
  });

  it('detects 50 milestone boundary (Phonetic Familiarity)', () => {
    const result = checkMilestone(49, 50);
    expect(result.hasReached).toBe(true);
    expect(result.milestone).toBe(50);
    expect(result.title).toBe('Phoneme Familiarity');
    expect(result.description).toBe('Overcome unfamiliar phonemes and terms');
  });

  it('detects 150 milestone boundary (Rhythmic Flow)', () => {
    const result = checkMilestone(149, 150);
    expect(result.hasReached).toBe(true);
    expect(result.milestone).toBe(150);
    expect(result.title).toBe('Sense Group Cohesion');
    expect(result.description).toBe('Master natural linking and sentence intonation');
  });

  it('detects 300 milestone boundary (Muscle Memory Locked)', () => {
    const result = checkMilestone(299, 300);
    expect(result.hasReached).toBe(true);
    expect(result.milestone).toBe(300);
    expect(result.title).toBe('Muscle Stabilization');
    expect(result.description).toBe('Physical articulation memory locked in');
  });

  it('detects 500 milestone boundary (Automaticity Mastered)', () => {
    const result = checkMilestone(499, 500);
    expect(result.hasReached).toBe(true);
    expect(result.milestone).toBe(500);
    expect(result.title).toBe('Instinctive Mastery');
    expect(result.description).toBe('Subconscious automatic speech reflex achieved');
  });

  it('handles jump over milestone during manual override', () => {
    const result = checkMilestone(45, 52);
    expect(result.hasReached).toBe(true);
    expect(result.milestone).toBe(50);
    expect(result.title).toBe('Phoneme Familiarity');
  });
});
