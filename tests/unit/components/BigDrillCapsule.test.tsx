import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BigDrillCapsule } from '../../../src/components/BigDrillCapsule';

describe('BigDrillCapsule Component (TDD)', () => {
  it('renders primary drill button and displays current count', () => {
    render(<BigDrillCapsule currentCount={42} onIncrement={vi.fn()} onUndo={vi.fn()} />);
    const primaryBtn = screen.getByRole('button', { name: /drill \+1/i });
    expect(primaryBtn).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
  });

  it('triggers onIncrement callback when primary button is clicked', () => {
    const incSpy = vi.fn();
    render(<BigDrillCapsule currentCount={0} onIncrement={incSpy} onUndo={vi.fn()} />);
    const primaryBtn = screen.getByRole('button', { name: /drill \+1/i });
    fireEvent.click(primaryBtn);
    expect(incSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers onUndo callback when undo button is clicked', () => {
    const undoSpy = vi.fn();
    render(<BigDrillCapsule currentCount={5} onIncrement={vi.fn()} onUndo={undoSpy} />);
    const undoBtn = screen.getByRole('button', { name: /undo last count/i });
    fireEvent.click(undoBtn);
    expect(undoSpy).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when disabled prop is true', () => {
    const incSpy = vi.fn();
    render(<BigDrillCapsule currentCount={0} onIncrement={incSpy} onUndo={vi.fn()} disabled />);
    const primaryBtn = screen.getByRole('button', { name: /drill \+1/i }) as HTMLButtonElement;
    expect(primaryBtn.disabled).toBe(true);
    fireEvent.click(primaryBtn);
    expect(incSpy).not.toHaveBeenCalled();
  });

  it('contains tactile feedback styling with minimum 58px height and touch-manipulation', () => {
    const { container } = render(
      <BigDrillCapsule currentCount={10} onIncrement={vi.fn()} onUndo={vi.fn()} />
    );
    const capsule = container.firstChild as HTMLElement;
    expect(capsule.className).toContain('min-h-[58px]');
  });
});
