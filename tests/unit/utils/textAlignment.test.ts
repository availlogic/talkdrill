import { describe, it, expect } from 'vitest';
import {
  alignBilingualParagraphs,
  splitTextSegments,
  extractSegments,
} from '../../../src/utils/textAlignment';

describe('textAlignment - extractSegments', () => {
  it('returns empty lists for empty or whitespace-only strings', () => {
    expect(extractSegments('')).toEqual({ paragraphs: [], lines: [] });
    expect(extractSegments('   \n  \t  ')).toEqual({ paragraphs: [], lines: [] });
  });

  it('normalizes carriage returns and trims segments and filters empty entries', () => {
    const text = '\r\n\r\n  Line A  \r\n\r\n   \r\n\r\n  Line B  \r\n\r\n';
    const result = extractSegments(text);
    expect(result.paragraphs).toEqual(['Line A', 'Line B']);
    expect(result.lines).toEqual(['Line A', 'Line B']);
    expect(result.paragraphs).not.toContain('');
    expect(result.lines).not.toContain('');
  });

  it('handles multiline single paragraph text', () => {
    const text = 'Line 1\nLine 2';
    expect(extractSegments(text)).toEqual({
      paragraphs: ['Line 1\nLine 2'],
      lines: ['Line 1', 'Line 2'],
    });
  });
});

describe('textAlignment - splitTextSegments', () => {
  it('returns paragraphs when paragraphs.length > 1', () => {
    const text = 'Paragraph 1.\n\nParagraph 2.';
    expect(splitTextSegments(text)).toEqual(['Paragraph 1.', 'Paragraph 2.']);
  });

  it('returns lines when paragraphs.length is 1 or less', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    expect(splitTextSegments(text)).toEqual(['Line 1', 'Line 2', 'Line 3']);
  });

  it('returns empty array when text is empty', () => {
    expect(splitTextSegments('')).toEqual([]);
  });
});

describe('textAlignment - alignBilingualParagraphs', () => {
  it('returns empty array when targetText and sourceText are both empty', () => {
    expect(alignBilingualParagraphs('', '')).toEqual([]);
    expect(alignBilingualParagraphs('   ', '   ')).toEqual([]);
    expect(alignBilingualParagraphs('')).toEqual([]);
  });

  it('returns target segments with empty source when sourceText is omitted or empty', () => {
    const result = alignBilingualParagraphs('Hola mundo\n¿Cómo estás?');
    expect(result).toEqual([
      { target: 'Hola mundo\n¿Cómo estás?', source: '' },
    ]);
  });

  it('aligns line-by-line dialogue when both have matching line counts and not both have multiple paragraphs', () => {
    const target = '¡Perdone, oiga!\n¿Sí?\n¿Es suyo este bolso?';
    const source = 'Excuse me!\nYes?\nIs this your handbag?';

    const result = alignBilingualParagraphs(target, source);
    expect(result).toEqual([
      { target: '¡Perdone, oiga!', source: 'Excuse me!' },
      { target: '¿Sí?', source: 'Yes?' },
      { target: '¿Es suyo este bolso?', source: 'Is this your handbag?' },
    ]);
  });

  it('aligns paragraph-by-paragraph when both have multiple paragraphs', () => {
    const target = 'Primer párrafo.\nDetalle uno.\n\nSegundo párrafo.\nDetalle dos.';
    const source = 'First paragraph.\nDetail one.\n\nSecond paragraph.\nDetail two.';

    const result = alignBilingualParagraphs(target, source);
    expect(result).toEqual([
      { target: 'Primer párrafo.\nDetalle uno.', source: 'First paragraph.\nDetail one.' },
      { target: 'Segundo párrafo.\nDetalle dos.', source: 'Second paragraph.\nDetail two.' },
    ]);
  });

  it('aligns lines when target has 1 paragraph of 2 lines and source has 2 paragraphs of 1 line each', () => {
    const target = 'Line 1\nLine 2';
    const source = 'Line 1\n\nLine 2';

    const result = alignBilingualParagraphs(target, source);
    expect(result).toEqual([
      { target: 'Line 1', source: 'Line 1' },
      { target: 'Line 2', source: 'Line 2' },
    ]);
  });

  it('aligns lines when source has 1 paragraph of 2 lines and target has 2 paragraphs of 1 line each', () => {
    const target = 'Line 1\n\nLine 2';
    const source = 'Line 1\nLine 2';

    const result = alignBilingualParagraphs(target, source);
    expect(result).toEqual([
      { target: 'Line 1', source: 'Line 1' },
      { target: 'Line 2', source: 'Line 2' },
    ]);
  });

  it('does not switch to line alignment when line counts differ and no double breaks', () => {
    const target = 'Line 1\nLine 2\nLine 3';
    const source = 'Line A\nLine B';

    const result = alignBilingualParagraphs(target, source);
    expect(result).toEqual([
      { target: 'Line 1\nLine 2\nLine 3', source: 'Line A\nLine B' },
    ]);
  });

  it('handles single line text in both target and source', () => {
    const target = 'Single target line';
    const source = 'Single source line';

    const result = alignBilingualParagraphs(target, source);
    expect(result).toEqual([
      { target: 'Single target line', source: 'Single source line' },
    ]);
  });

  it('handles target having more paragraphs than source without losing content', () => {
    const target = 'Part 1\n\nPart 2\n\nPart 3';
    const source = 'Part 1\n\nPart 2';

    const result = alignBilingualParagraphs(target, source);
    expect(result).toEqual([
      { target: 'Part 1', source: 'Part 1' },
      { target: 'Part 2', source: 'Part 2' },
      { target: 'Part 3', source: '' },
    ]);
  });

  it('handles source having more paragraphs than target without losing content', () => {
    const target = 'Part 1';
    const source = 'Part 1\n\nPart 2';

    const result = alignBilingualParagraphs(target, source);
    expect(result).toEqual([
      { target: 'Part 1', source: 'Part 1' },
      { target: '', source: 'Part 2' },
    ]);
  });
});
