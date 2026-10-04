import { describe, it, expect, vi } from 'vitest';
import { printExportService } from '../../../src/services/printExportService';
import { type Article } from '../../../src/types/models';

describe('PrintExportService (TDD)', () => {
  const sampleArticle: Article = {
    id: 'art-print-1',
    title: 'Restaurante en Madrid',
    sourceText: 'Could we have the bill, please?',
    targetText: '¿Nos cobras, por favor?',
    sourceLang: 'en',
    targetLang: 'es-ES',
    mode: 'translate_needed',
    targetCount: 500,
    currentCount: 120,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    isArchived: false,
  };

  it('generates standard Markdown document with 100-box tally table', () => {
    const md = printExportService.generateMarkdown(sampleArticle, { tallyBoxes: 100 });
    expect(md).toContain('# Restaurante en Madrid');
    expect(md).toContain('¿Nos cobras, por favor?');
    expect(md).toContain('120 / 500');
    expect(md).toContain('100 Boxes');
    expect(md).toContain('| [ ] | [ ] |');
  });

  it('generates standard Markdown document with 60-box tally table', () => {
    const md = printExportService.generateMarkdown(sampleArticle, { tallyBoxes: 60 });
    expect(md).toContain('60 Boxes');
  });

  it('triggers window.print', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    printExportService.triggerPrint(sampleArticle, { tallyBoxes: 100 });
    expect(printSpy).toHaveBeenCalled();
  });

  it('copies generated text to clipboard when available', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const success = await printExportService.copyRichTextToClipboard(sampleArticle, { tallyBoxes: 100 });
    expect(success).toBe(true);
    expect(writeTextMock).toHaveBeenCalled();
  });

  it('returns false when clipboard write fails or clipboard is missing', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
      configurable: true,
      writable: true,
    });

    const fail1 = await printExportService.copyRichTextToClipboard(sampleArticle, { tallyBoxes: 100 });
    expect(fail1).toBe(false);

    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const fail2 = await printExportService.copyRichTextToClipboard(sampleArticle, { tallyBoxes: 100 });
    expect(fail2).toBe(false);
  });
});
