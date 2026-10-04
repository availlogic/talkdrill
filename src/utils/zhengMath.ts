import { type ZhengStrokeState, type MilestoneResult, type DrillMilestone } from '../types/models';

export function calculateZhengStrokes(count: number): ZhengStrokeState {
  const safeCount = Math.max(0, Math.floor(count));
  return {
    fullZhengCount: Math.floor(safeCount / 5),
    partialStrokes: safeCount % 5,
    totalCount: safeCount,
  };
}

const MILESTONES: Array<{ milestone: DrillMilestone; title: string; description: string }> = [
  { milestone: 50, title: 'Phoneme Familiarity', description: 'Overcome unfamiliar phonemes and terms' },
  { milestone: 150, title: 'Sense Group Cohesion', description: 'Master natural linking and sentence intonation' },
  { milestone: 300, title: 'Muscle Stabilization', description: 'Physical articulation memory locked in' },
  { milestone: 500, title: 'Instinctive Mastery', description: 'Subconscious automatic speech reflex achieved' },
];

export function checkMilestone(prevCount: number, currCount: number): MilestoneResult {
  for (const item of MILESTONES) {
    if (prevCount < item.milestone && currCount >= item.milestone) {
      return {
        hasReached: true,
        milestone: item.milestone,
        title: item.title,
        description: item.description,
      };
    }
  }

  return { hasReached: false };
}
