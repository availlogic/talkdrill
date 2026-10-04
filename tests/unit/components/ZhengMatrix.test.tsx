import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZhengMatrix } from '../../../src/components/ZhengMatrix';

describe('ZhengMatrix Component (TDD)', () => {
  it('renders default 100 boxes for targetCount 500', () => {
    render(<ZhengMatrix count={0} targetCount={500} />);
    const boxes = screen.getAllByTestId('zheng-box');
    expect(boxes.length).toBe(100);
  });

  it('renders 60 boxes when targetCount is 300', () => {
    render(<ZhengMatrix count={0} targetCount={300} />);
    const boxes = screen.getAllByTestId('zheng-box');
    expect(boxes.length).toBe(60);
  });

  it('renders full Zheng character (5 strokes) for completed boxes', () => {
    render(<ZhengMatrix count={12} targetCount={500} />);
    // Count 12 means:
    // Box 0: full (5)
    // Box 1: full (5)
    // Box 2: partial (2 strokes)
    // Remaining boxes: empty (0 strokes)
    const boxes = screen.getAllByTestId('zheng-box');
    expect(boxes[0]?.getAttribute('data-strokes')).toBe('5');
    expect(boxes[1]?.getAttribute('data-strokes')).toBe('5');
    expect(boxes[2]?.getAttribute('data-strokes')).toBe('2');
    expect(boxes[3]?.getAttribute('data-strokes')).toBe('0');
  });

  it('renders individual stroke paths correctly for partial character', () => {
    render(<ZhengMatrix count={3} targetCount={500} />);
    const boxes = screen.getAllByTestId('zheng-box');
    expect(boxes[0]?.getAttribute('data-strokes')).toBe('3');

    // Box 0 should render strokes 1, 2, and 3
    const paths = boxes[0]?.querySelectorAll('path');
    expect(paths?.length).toBe(3);
  });

  it('calls onBoxClick callback when a box is clicked', () => {
    const clickSpy = vi.fn();
    render(<ZhengMatrix count={10} targetCount={500} onBoxClick={clickSpy} />);
    const boxes = screen.getAllByTestId('zheng-box');
    
    if (boxes[2]) {
      fireEvent.click(boxes[2]);
      expect(clickSpy).toHaveBeenCalledWith(2);
    }
  });

  it('has accessible aria-label with summary metrics', () => {
    render(<ZhengMatrix count={47} targetCount={500} />);
    const matrix = screen.getByRole('region', { name: /tally counter/i });
    expect(matrix).toBeDefined();
    expect(matrix.getAttribute('aria-label')).toContain('47');
    expect(matrix.getAttribute('aria-label')).toContain('9 complete Zheng characters');
    expect(matrix.getAttribute('aria-label')).toContain('2 strokes');
  });
});
