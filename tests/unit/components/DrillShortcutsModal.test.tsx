import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DrillShortcutsModal } from '../../../src/components/DrillShortcutsModal';

describe('DrillShortcutsModal Component (TDD)', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <DrillShortcutsModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with all shortcut categories when isOpen is true', () => {
    render(<DrillShortcutsModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Keyboard Shortcuts')).toBeDefined();

    // Drilling group
    expect(screen.getByText('Space')).toBeDefined();
    expect(screen.getByText('Drill +1 rep')).toBeDefined();
    expect(screen.getByText('Z')).toBeDefined();
    expect(screen.getByText('Undo last rep')).toBeDefined();
    expect(screen.getByText('F')).toBeDefined();
    expect(screen.getByText('Toggle Focus mode')).toBeDefined();

    // Audio group
    expect(screen.getByText('P')).toBeDefined();
    expect(screen.getByText('Play / Resume audio')).toBeDefined();
    expect(screen.getByText('S')).toBeDefined();
    expect(screen.getByText('Pause audio (when playing)')).toBeDefined();

    // Dictionary group
    expect(screen.getByText('Look up selected word')).toBeDefined();

    // Navigation group
    expect(screen.getByText('?')).toBeDefined();
    expect(screen.getByText('Open shortcuts cheatsheet')).toBeDefined();
    expect(screen.getAllByText('Esc').length).toBeGreaterThan(0);
  });

  it('displays custom dictionary hotkey label when provided', () => {
    render(
      <DrillShortcutsModal
        isOpen={true}
        onClose={vi.fn()}
        dictHotkeyLabel="Command ⌘"
      />
    );
    expect(screen.getByText(/Command ⌘/)).toBeDefined();
  });

  it('calls onClose when clicking close button', () => {
    const closeSpy = vi.fn();
    render(<DrillShortcutsModal isOpen={true} onClose={closeSpy} />);

    const closeBtn = screen.getByRole('button', { name: /close shortcuts/i });
    fireEvent.click(closeBtn);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking backdrop overlay', () => {
    const closeSpy = vi.fn();
    render(<DrillShortcutsModal isOpen={true} onClose={closeSpy} />);

    const backdrop = screen.getByTestId('shortcuts-modal-backdrop');
    fireEvent.click(backdrop);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when pressing Escape key', () => {
    const closeSpy = vi.fn();
    render(<DrillShortcutsModal isOpen={true} onClose={closeSpy} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
