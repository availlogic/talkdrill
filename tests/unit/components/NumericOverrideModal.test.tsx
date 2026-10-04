import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumericOverrideModal } from '../../../src/components/NumericOverrideModal';

describe('NumericOverrideModal Component (TDD)', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <NumericOverrideModal isOpen={false} initialValue={50} onConfirm={vi.fn()} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with initial value when isOpen is true', () => {
    render(
      <NumericOverrideModal isOpen={true} initialValue={123} onConfirm={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByRole('dialog')).toBeDefined();
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('123');
  });

  it('applies quick delta presets (+10, +50, +100, Reset to 0)', () => {
    render(
      <NumericOverrideModal isOpen={true} initialValue={20} onConfirm={vi.fn()} onClose={vi.fn()} />
    );
    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: '+10' }));
    expect(input.value).toBe('30');

    fireEvent.click(screen.getByRole('button', { name: '+50' }));
    expect(input.value).toBe('80');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(input.value).toBe('0');
  });

  it('calls onConfirm with valid number when submitted', () => {
    const confirmSpy = vi.fn();
    render(
      <NumericOverrideModal isOpen={true} initialValue={10} onConfirm={confirmSpy} onClose={vi.fn()} />
    );
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '250' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(confirmSpy).toHaveBeenCalledWith(250);
  });

  it('shows error validation message when input is invalid or negative', () => {
    const confirmSpy = vi.fn();
    render(
      <NumericOverrideModal isOpen={true} initialValue={10} onConfirm={confirmSpy} onClose={vi.fn()} />
    );
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '-5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Please enter a valid integer between 0 and 99999/i)).toBeDefined();
  });

  it('calls onClose when cancel button is clicked', () => {
    const closeSpy = vi.fn();
    render(
      <NumericOverrideModal isOpen={true} initialValue={10} onConfirm={vi.fn()} onClose={closeSpy} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
