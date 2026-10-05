import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WordLookupPopover,
  calculatePopoverPosition,
} from '../../../src/components/WordLookupPopover';
import type { WordLookupResult } from '../../../src/types/models';

describe('WordLookupPopover (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculatePopoverPosition', () => {
    it('clamps left coordinate within viewport bounds', () => {
      // Left edge boundary clamping
      const leftClamped = calculatePopoverPosition(5, 100, 320, 180, 1000, 800);
      expect(leftClamped.left).toBe(12);

      // Right edge boundary clamping (viewport 1000, width 320, max left = 1000 - 320 - 12 = 668)
      const rightClamped = calculatePopoverPosition(950, 100, 320, 180, 1000, 800);
      expect(rightClamped.left).toBe(668);

      // In-between coordinate
      const normal = calculatePopoverPosition(300, 100, 320, 180, 1000, 800);
      expect(normal.left).toBe(300);
    });

    it('positions below selection when space is available', () => {
      const pos = calculatePopoverPosition(200, 100, 320, 150, 1000, 800);
      expect(pos.top).toBe(108); // y + 8
    });

    it('positions above selection when close to bottom of viewport', () => {
      // viewport 800, y = 720, height = 150 -> 720 + 150 + 12 = 882 > 800 -> flip above: 720 - 150 - 8 = 562
      const pos = calculatePopoverPosition(200, 720, 320, 150, 1000, 800);
      expect(pos.top).toBe(562);
    });
  });

  describe('rendering states', () => {
    it('renders loading state when loading is true', () => {
      render(
        <WordLookupPopover
          word="perdone"
          lang="es-ES"
          x={100}
          y={150}
          loading={true}
          result={null}
          error={null}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Looking up definition...')).toBeDefined();
    });

    it('renders error state when error is provided', () => {
      render(
        <WordLookupPopover
          word="perdone"
          lang="es-ES"
          x={100}
          y={150}
          loading={false}
          result={null}
          error="Failed to connect to dictionary"
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Failed to connect to dictionary')).toBeDefined();
    });

    it('renders word, IPA, part of speech, and definition when result is provided', () => {
      const mockResult: WordLookupResult = {
        text: 'perdone',
        lang: 'es-ES',
        ipa: '/peɾˈdone/',
        partOfSpeech: 'verb / interjection',
        translation: 'excuse me, pardon',
        contextNote: 'Polite formal command of perdonar',
        source: 'api',
      };

      render(
        <WordLookupPopover
          word="perdone"
          lang="es-ES"
          x={100}
          y={150}
          loading={false}
          result={mockResult}
          error={null}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('perdone')).toBeDefined();
      expect(screen.getByText('/peɾˈdone/')).toBeDefined();
      expect(screen.getByText('verb / interjection')).toBeDefined();
      expect(screen.getByText('excuse me, pardon')).toBeDefined();
      expect(screen.getByText('Polite formal command of perdonar')).toBeDefined();
      expect(screen.getByText('AI')).toBeDefined();
    });

    it('displays Cached badge when source is cache', () => {
      const mockResult: WordLookupResult = {
        text: 'gracias',
        lang: 'es-ES',
        translation: 'thank you',
        source: 'cache',
      };

      render(
        <WordLookupPopover
          word="gracias"
          lang="es-ES"
          x={100}
          y={150}
          loading={false}
          result={mockResult}
          error={null}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Cached')).toBeDefined();
    });
  });

  describe('interactions', () => {
    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <WordLookupPopover
          word="hola"
          lang="es-ES"
          x={100}
          y={150}
          loading={false}
          result={null}
          error={null}
          onClose={handleClose}
        />
      );

      const closeBtn = screen.getByLabelText('Close lookup');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onSpeak when audio speaker button is clicked', () => {
      const handleSpeak = vi.fn();
      const mockResult: WordLookupResult = {
        text: 'hola',
        lang: 'es-ES',
        translation: 'hello',
        source: 'cache',
      };

      render(
        <WordLookupPopover
          word="hola"
          lang="es-ES"
          x={100}
          y={150}
          loading={false}
          result={mockResult}
          error={null}
          onClose={vi.fn()}
          onSpeak={handleSpeak}
        />
      );

      const speakBtn = screen.getByLabelText('Listen to pronunciation');
      fireEvent.click(speakBtn);
      expect(handleSpeak).toHaveBeenCalledWith('hola', 'es-ES');
    });

    it('calls onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <WordLookupPopover
          word="hola"
          lang="es-ES"
          x={100}
          y={150}
          loading={false}
          result={null}
          error={null}
          onClose={handleClose}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
