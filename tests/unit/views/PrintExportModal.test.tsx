import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrintExportModal } from '../../../src/views/PrintExportModal';
import { type Article } from '../../../src/types/models';

describe('PrintExportModal View (TDD)', () => {
  const mockArticle: Article = {
    id: 'art-print-1',
    title: 'Café en Barcelona',
    sourceText: 'Un café con leche, por favor.',
    targetText: 'Un café con leche, por favor.',
    sourceLang: 'es-ES',
    targetLang: 'es-ES',
    mode: 'direct_foreign',
    targetCount: 500,
    currentCount: 42,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    isArchived: false,
  };

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    window.print = vi.fn();
  });

  it('renders article title and text preview', () => {
    render(<PrintExportModal article={mockArticle} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Café en Barcelona')).toBeDefined();
    expect(screen.getByText('Un café con leche, por favor.')).toBeDefined();
  });

  it('switches between 60-box and 100-box tally sheets', () => {
    render(<PrintExportModal article={mockArticle} isOpen={true} onClose={vi.fn()} />);

    const btn60 = screen.getByRole('button', { name: '60 Boxes (300 reps)' });
    const btn100 = screen.getByRole('button', { name: '100 Boxes (500 reps)' });

    fireEvent.click(btn60);
    expect(btn60.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(btn100);
    expect(btn100.getAttribute('aria-pressed')).toBe('true');
  });

  it('calls window.print when print button is clicked', () => {
    render(<PrintExportModal article={mockArticle} isOpen={true} onClose={vi.fn()} />);

    const printBtn = screen.getByRole('button', { name: 'Print Worksheet' });
    fireEvent.click(printBtn);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('copies Markdown with tally grid to clipboard', async () => {
    render(<PrintExportModal article={mockArticle} isOpen={true} onClose={vi.fn()} />);

    const copyBtn = screen.getByRole('button', { name: 'Copy Markdown' });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      const text = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(text).toContain('# Café en Barcelona');
      expect(text).toContain('Un café con leche, por favor.');
    });
  });
});
