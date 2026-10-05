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

  it('preserves multiline whitespace in printable sheet with whitespace-pre-wrap', () => {
    const multilineArt: Article = {
      ...mockArticle,
      targetText: '¡Perdona!\n\n¿Sí?\n\n¿Es tu bolso este?',
    };
    render(<PrintExportModal article={multilineArt} isOpen={true} onClose={vi.fn()} />);

    const textEl = screen.getByText(/¡Perdona!/);
    expect(textEl.className).toContain('whitespace-pre-wrap');
    expect(textEl.className).toContain('break-words');
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

  it('renders centered title without target reps subtitle for clean print layout', () => {
    render(<PrintExportModal article={mockArticle} isOpen={true} onClose={vi.fn()} />);

    const titleEl = screen.getByRole('heading', { level: 4, name: 'Café en Barcelona' });
    expect(titleEl).toBeDefined();
    expect(titleEl.className).toContain('print-drill-title');
    expect(screen.queryByText(/Target:.*reps/i)).toBeNull();
  });

  it('hides modal header and interactive controls toolbar from print using no-print', () => {
    render(<PrintExportModal article={mockArticle} isOpen={true} onClose={vi.fn()} />);

    const modalTitle = screen.getByText('Print Worksheet & Tally Sheet Export');
    const headerContainer = modalTitle.closest('div');
    expect(headerContainer?.className).toContain('no-print');
    expect(headerContainer?.className).toContain('print:hidden');

    const tallyLabel = screen.getByText('Tally Boxes:');
    const toolbarContainer = tallyLabel.closest('.flex.items-center.justify-between');
    expect(toolbarContainer?.className).toContain('no-print');
    expect(toolbarContainer?.className).toContain('print:hidden');
  });

  it('ensures printable sheet expands without max-height or overflow constraints in print', () => {
    const { container } = render(<PrintExportModal article={mockArticle} isOpen={true} onClose={vi.fn()} />);

    const sheetEl = container.querySelector('.printable-sheet');
    expect(sheetEl?.className).toContain('print:max-h-none');
    expect(sheetEl?.className).toContain('print:overflow-visible');
    expect(sheetEl?.className).toContain('print:border-none');
  });

  it('renders dashed-border tally boxes for both 60 and 100 boxes', () => {
    const { container } = render(<PrintExportModal article={mockArticle} isOpen={true} onClose={vi.fn()} />);

    const boxes100 = container.querySelectorAll('.print-tally-box');
    expect(boxes100.length).toBe(100);
    expect(boxes100[0]?.className).toContain('border-dashed');

    const btn60 = screen.getByRole('button', { name: '60 Boxes (300 reps)' });
    fireEvent.click(btn60);

    const boxes60 = container.querySelectorAll('.print-tally-box');
    expect(boxes60.length).toBe(60);
  });
});

