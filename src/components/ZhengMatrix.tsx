import React from 'react';

export interface ZhengMatrixProps {
  count: number;
  targetCount?: number | undefined;
  onBoxClick?: ((index: number) => void) | undefined;
}

interface ZhengBoxProps {
  index: number;
  strokes: number;
  onClick?: ((index: number) => void) | undefined;
}

const STROKE_PATHS = [
  'M 20 25 L 80 25',
  'M 50 25 L 50 80',
  'M 50 52 L 80 52',
  'M 20 52 L 20 80',
  'M 15 80 L 85 80',
];

function getBoxStrokes(boxIndex: number, currentCount: number): number {
  const boxStart = boxIndex * 5;
  if (currentCount <= boxStart) return 0;
  if (currentCount >= boxStart + 5) return 5;
  return currentCount - boxStart;
}

export const ZhengBox: React.FC<ZhengBoxProps> = ({ index, strokes, onClick }) => {
  const renderedPaths = STROKE_PATHS.slice(0, strokes);
  const handleClick = () => {
    if (onClick) onClick(index);
  };

  return (
    <button
      type="button"
      data-testid="zheng-box"
      data-strokes={strokes}
      onClick={handleClick}
      aria-label={`Box ${index + 1}: ${strokes} strokes`}
      className="w-8 h-8 sm:w-10 sm:h-10 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 flex items-center justify-center p-0.5 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full text-slate-800 dark:text-slate-100 fill-none stroke-current"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {renderedPaths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    </button>
  );
};

export const ZhengMatrix: React.FC<ZhengMatrixProps> = ({
  count,
  targetCount = 500,
  onBoxClick,
}) => {
  const totalBoxes = Math.max(1, Math.ceil(targetCount / 5));
  const fullCount = Math.floor(count / 5);
  const remainder = count % 5;
  const ariaLabel = `Tally counter: ${count} reps in total (${fullCount} complete Zheng characters, ${remainder} strokes)`;
  const boxIndices = Array.from({ length: totalBoxes }, (_, i) => i);

  return (
    <section role="region" aria-label={ariaLabel} className="w-full select-none">
      <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-20 gap-1 sm:gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[380px]">
        {boxIndices.map((i) => (
          <ZhengBox
            key={i}
            index={i}
            strokes={getBoxStrokes(i, count)}
            onClick={onBoxClick}
          />
        ))}
      </div>
    </section>
  );
};
